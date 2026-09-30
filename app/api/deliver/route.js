import { itemsFromXml, isBlox } from "../../lib/fetch-feed";
import { buildArticles } from "../../lib/articles";
import { buildJobs } from "../../lib/collect-jobs";
import { archiveEnabled, storeArticles, getState, setState } from "../../lib/archive";

/* ---- Stories fetched by the second network ----
   The collector hands the GitHub Action the Metroland/Torstar feeds that
   turned Vercel away with "too many requests" (see "The second network" in
   /api/collect). The Action asks each of them once more from GitHub's
   network and posts what it gets here, one feed at a time:

     POST /api/deliver   { "url": "<the feed's address>", "xml": "<the feed>" }
     Authorization: Bearer <CRON_SECRET>

   Because this writes to the archive, it is strict about what it accepts:
     - only with CRON_SECRET, and not at all if the secret isn't set;
     - only a Metroland/Torstar feed the collector itself would fetch, filed
       on the same shelf under the same name as if Vercel had fetched it;
     - only stories that link to that paper's own site.
   Everything else is refused. ---- */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BYTES = 3 * 1024 * 1024;

function hostOf(u) {
  try { return new URL(u).host.replace(/^www\./, ""); } catch { return ""; }
}

export async function POST(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ ok: false, error: "CRON_SECRET is not set, so deliveries are off" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!archiveEnabled()) return Response.json({ ok: false, error: "No archive configured." }, { status: 503 });

  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BYTES) return Response.json({ ok: false, error: "too large" }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return Response.json({ ok: false, error: "expected JSON: { url, xml }" }, { status: 400 });
  }
  const { url, xml } = body || {};
  if (typeof url !== "string" || typeof xml !== "string") {
    return Response.json({ ok: false, error: "expected JSON: { url, xml }" }, { status: 400 });
  }

  // Every shelf this feed belongs on, exactly as the collector would file it.
  const { jobs } = await buildJobs();
  const mine = jobs.filter((j) => isBlox(j.src) && (j.src.urls || []).includes(url));
  if (!mine.length) return Response.json({ ok: false, error: "not a feed the collector asks for" }, { status: 404 });

  const home = hostOf(url);
  const stored = [];
  for (const job of mine) {
    let items;
    try {
      items = (await itemsFromXml(job.src, xml)).filter((it) => hostOf(it.link) === home);
    } catch (err) {
      return Response.json({ ok: false, error: `could not read the feed: ${String(err?.message || err).slice(0, 120)}` }, { status: 422 });
    }
    const articles = buildArticles(job.src, items, { limit: 60 });
    const { added } = await storeArticles(job.bucket, job.src.name, articles);
    stored.push({ name: job.src.name, items: articles.length, added });
  }

  // A running record of what came this way, per paper, for /api/health.
  const at = new Date().toISOString();
  const state = await getState();
  let log = {};
  try { log = JSON.parse(state.secondNetwork || "{}"); } catch { log = {}; }
  for (const s of stored) log[s.name] = { at, stories: s.items, added: s.added };
  await setState({ secondNetwork: log }).catch(() => {});

  return Response.json({ ok: true, stored }, { headers: { "Cache-Control": "no-store" } });
}
