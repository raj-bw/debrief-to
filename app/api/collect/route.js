import { SOURCES } from "../../lib/sources";
import { resolveTown, DEFAULT_TOWN } from "../../lib/towns";
import { fetchItems } from "../../lib/fetch-feed";
import { buildArticles } from "../../lib/articles";
import {
  archiveEnabled, archiveBackend, bucketFor, storeArticles, activeTowns,
  trimAll, makeRoom, getState, setState, torontoDay, RETENTION_DAYS,
} from "../../lib/archive";

/* ---- The collector ----
   Visits every publication the site depends on and stores what's new, so
   the archive keeps filling whether or not anyone is reading. This is what
   makes the site self-sufficient: readers only ever read.

   Who calls it:
     - Vercel Cron, once a day (the most the free plan allows). The floor:
       it runs as long as the project exists.
     - A GitHub Action, every hour. Readers read only from the archive, so
       this is how fresh the site is: a story appears within the hour.
   Either alone keeps the archive whole; together they cover for each other.

   What it collects: the standing sources, plus every publication — own and
   regional — of every town anyone has ever picked. Newmarket always.

   Once a Toronto day it also applies the 33-day rule to every shelf.

   Protection: if CRON_SECRET is set in Vercel, callers must send it (Vercel
   Cron does so automatically; the GitHub Action reads it from a repository
   secret). If it isn't set, the route still works but will only run once
   every twenty minutes, so it can't be used to hammer publishers. ---- */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BUDGET_MS = 240 * 1000;         // stop starting new work after four minutes
const CONCURRENCY = 6;
const BLOX_GAP_MS = 1500;             // Metroland/Torstar rate-limit; ask them one at a time
const MIN_GAP_WITHOUT_SECRET_MS = 20 * 60 * 1000;

const isBlox = (src) => (src.urls || []).some((u) => u.includes("/search/?f=rss"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function buildJobs() {
  const jobs = new Map();   // bucket -> job, so a publication shared by many towns is fetched once
  const towns = new Set([DEFAULT_TOWN, ...(await activeTowns())]);
  for (const slug of towns) {
    const t = resolveTown(slug);
    for (const f of [...(t.feeds || []), ...(t.regionFeeds || [])]) {
      const b = bucketFor(f);
      if (!jobs.has(b)) jobs.set(b, { src: { ...f, place: "home" }, bucket: b });
    }
  }
  // Standing sources all share one shelf, but each is its own fetch.
  const standing = SOURCES.map((s) => ({ src: s, bucket: "shared" }));
  // Start somewhere different each run, so if a run ever hits its time
  // budget it isn't always the same publications left out.
  const local = [...jobs.values()];
  const start = Math.floor(Math.random() * Math.max(local.length, 1));
  return { jobs: [...standing, ...local.slice(start), ...local.slice(0, start)], towns: towns.size };
}

async function collectOne(job) {
  try {
    const got = await fetchItems(job.src, { fresh: true });
    const articles = buildArticles(job.src, got.items, { limit: 60 });
    const { added } = await storeArticles(job.bucket, job.src.name, articles);
    return { name: job.src.name, ok: true, items: articles.length, added, via: got.via };
  } catch (err) {
    return { name: job.src.name, ok: false, error: String(err?.message || err).slice(0, 120) };
  }
}

export async function GET(request) {
  const started = Date.now();
  if (!archiveEnabled()) {
    return Response.json({ ok: false, error: "No archive configured.", backend: archiveBackend() }, { status: 503 });
  }

  const secret = process.env.CRON_SECRET;
  const state = await getState();
  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  } else {
    let last = 0;
    try { last = Date.parse(JSON.parse(state.lastRun || "{}").finishedAt || 0) || 0; } catch { last = 0; }
    if (Date.now() - last < MIN_GAP_WITHOUT_SECRET_MS) {
      return Response.json({ ok: true, skipped: "ran less than 20 minutes ago (set CRON_SECRET to lift this)" });
    }
  }

  // Room first, so a full database never makes the run's writes fail.
  const room = await makeRoom().catch(() => null);

  const { jobs, towns } = await buildJobs();
  const blox = jobs.filter((j) => isBlox(j.src));
  const rest = jobs.filter((j) => !isBlox(j.src));
  const results = [];
  let skipped = 0;

  // Most publishers: a few at a time.
  const queue = [...rest];
  const worker = async () => {
    while (queue.length) {
      if (Date.now() - started > BUDGET_MS) { skipped += queue.length; queue.length = 0; return; }
      results.push(await collectOne(queue.shift()));
    }
  };
  // Metroland and Torstar share one platform that rate-limits: one at a time,
  // with a pause, in parallel with everything else.
  const bloxRun = (async () => {
    for (const j of blox) {
      if (Date.now() - started > BUDGET_MS) { skipped++; continue; }
      results.push(await collectOne(j));
      await sleep(BLOX_GAP_MS);
    }
  })();
  await Promise.all([...Array.from({ length: CONCURRENCY }, worker), bloxRun]);

  // The 33-day rule, once a day.
  let trimmed = null;
  const today = torontoDay();
  if (state.lastTrimDay !== today) {
    try {
      trimmed = await trimAll();
      await setState({ lastTrimDay: today, retentionInForce: String(room?.retentionDays ?? RETENTION_DAYS) });
    }
    catch (err) { trimmed = { error: err?.message }; }
  }

  const failed = results.filter((r) => !r.ok);
  const summary = {
    finishedAt: new Date().toISOString(),
    seconds: Math.round((Date.now() - started) / 1000),
    towns,
    publications: jobs.length,
    answered: results.length - failed.length,
    failed: failed.length,
    storiesAdded: results.reduce((n, r) => n + (r.added || 0), 0),
    notReached: skipped,
    memory: room?.memory || null,
    retentionDays: room?.retentionDays ?? null,
  };
  await setState({ lastRun: summary }).catch(() => {});

  return Response.json({
    ok: true,
    ...summary,
    trimmed,
    failures: failed.map((r) => `${r.name}: ${r.error}`),
    neededHonestName: results.filter((r) => r.via === "honest").map((r) => r.name),
  }, { headers: { "Cache-Control": "no-store" } });
}
