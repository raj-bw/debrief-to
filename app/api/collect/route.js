import { fetcherForRun, lineOf, isBloxUrl } from "../../lib/fetch-feed";
import { buildArticles } from "../../lib/articles";
import { buildJobs } from "../../lib/collect-jobs";
import {
  archiveEnabled, archiveBackend, storeArticles,
  trimAll, makeRoom, getState, setState, torontoDay, RETENTION_DAYS,
  newestDate, recordFeedAnswers,
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
const MIN_GAP_WITHOUT_SECRET_MS = 20 * 60 * 1000;


async function collectOne(job, fetchOnce) {
  try {
    const got = await fetchOnce(job.src);
    const articles = buildArticles(job.src, got.items, { limit: 60 });
    const { added } = await storeArticles(job.bucket, job.src.name, articles);
    return { name: job.src.name, ok: true, items: articles.length, added, via: got.via, newest: newestDate(got.items) };
  } catch (err) {
    return { name: job.src.name, ok: false, error: String(err?.message || err).slice(0, 120), job };
  }
}

/* ---- The second network ----
   Metroland and Torstar's platform turns requests away with a 429 when the
   address they come from has used up its allowance, and Vercel's addresses
   are shared with thousands of other sites. From GitHub's network, a
   different crowd, some of those papers answer (YorkRegion.com did, though
   Vercel never got it). So the GitHub Action that calls this collector is
   handed the feeds that were turned away as "too many requests", or that
   the run ran out of time for, asks each of them once more from there, and
   files what it gets through /api/deliver.

   Only 429s. A 403 is a publisher refusing servers, and asking from another
   network would be working around their decision rather than their load. */
function forTheSecondNetwork(jobs) {
  const urls = new Set();
  for (const job of jobs) {
    const url = (job.src.urls || []).find(isBloxUrl);
    if (url) urls.add(url);
  }
  return [...urls];
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
  const results = [];
  const notReached = [];
  const fetchOnce = fetcherForRun();

  // Most publishers: a few at a time.
  const queue = jobs.filter((j) => !lineOf(j.src));
  const worker = async () => {
    while (queue.length) {
      if (Date.now() - started > BUDGET_MS) { notReached.push(...queue.splice(0)); return; }
      results.push(await collectOne(queue.shift(), fetchOnce));
    }
  };
  // Metroland/Torstar's papers, and the papers read through a WordPress API
  // (Postmedia's), each run in a lane of their own, in parallel with
  // everything else: fetch-feed spaces their requests out and waits out any
  // 429, and they never hold up publishers that don't need to wait.
  const lane = (name) => (async () => {
    for (const j of jobs.filter((x) => lineOf(x.src) === name)) {
      if (Date.now() - started > BUDGET_MS) { notReached.push(j); continue; }
      results.push(await collectOne(j, fetchOnce));
    }
  })();
  await Promise.all([...Array.from({ length: CONCURRENCY }, worker), lane("blox"), lane("wordpress")]);

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
    notReached: notReached.length,
    memory: room?.memory || null,
    retentionDays: room?.retentionDays ?? null,
  };
  await setState({ lastRun: summary }).catch(() => {});

  // Each newsroom's answer, for the nightly report (see feedWatch). A paper
  // filed on several shelves counts as answering if any of them got through.
  const answers = new Map();
  for (const r of results) {
    if (!answers.has(r.name) || (r.ok && !answers.get(r.name).ok)) {
      answers.set(r.name, r.ok
        ? { name: r.name, ok: true, newest: r.newest, items: r.items }
        : { name: r.name, ok: false, error: r.error });
    }
  }
  await recordFeedAnswers([...answers.values()]).catch(() => {});

  return Response.json({
    ok: true,
    ...summary,
    trimmed,
    failures: failed.map((r) => `${r.name}: ${r.error}`),
    neededHonestName: results.filter((r) => r.via === "honest").map((r) => r.name),
    // Read by the GitHub Action: feeds to ask again from its own network.
    retryElsewhere: forTheSecondNetwork([
      ...failed.filter((r) => /Status code 429/.test(r.error)).map((r) => r.job),
      ...notReached,
    ]),
  }, { headers: { "Cache-Control": "no-store" } });
}
