/* ---- The archive ----
   RSS feeds are a window, not a record: most publishers expose only their
   most recent twenty or so stories. That is why "This Week" and "This Month"
   used to show barely more than "Today" — there was nothing older to show.

   So we keep our own copy. One small JSON file per day, in Vercel Blob:

     archive/2026-09-21.json

   One file per day rather than one growing file, because then trimming old
   news is just deleting files, each write stays small, and two readers
   arriving at the same moment can't overwrite each other's work.

   Nothing is scheduled. The feed route already runs at most once every ten
   minutes behind the CDN cache; when it does, it drops anything new into
   today's file and moves on. (Vercel's free plan only allows a cron job once
   a day, which is not often enough, so this rides along with real traffic
   instead. A GitHub Action pings the site a couple of times a day so a quiet
   afternoon doesn't leave a hole.)

   Only headlines, links and summaries are stored — about 650 bytes an
   article, so roughly 100 KB a day and 4.5 MB for the full 45 days. Images
   stay on the publishers' servers where they belong.

   Every function here fails quietly. If the archive is unreachable, or was
   never set up, the site still shows the live feed — the archive makes the
   site better, it is never what makes it work. ---- */

import { put, list, del } from "@vercel/blob";

const PREFIX = "archive/";
export const RETENTION_DAYS = 45;

/* Is there a Blob store to write to?

   Vercel has two ways of proving who we are, and a store connected today uses
   the newer one:

     - OIDC: a short-lived VERCEL_OIDC_TOKEN that Vercel injects into the
       running function, plus BLOB_STORE_ID naming the store. Nothing
       long-lived is stored in the project, which is why it's the better
       scheme and now the default.
     - A long-lived BLOB_READ_WRITE_TOKEN. Older stores, and local development.

   The SDK handles either on its own — it only needs one of them to be present.
   This check exists so the rest of the site can degrade quietly when there is
   no store at all, so it has to recognise both. Looking only for the old token
   is exactly the bug that left a perfectly good store sitting unused. */
function enabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

// Which of the two is in play — reported by /api/health, so that "the archive
// isn't running" is always answerable without guesswork.
export function credentialMode() {
  if (process.env.BLOB_STORE_ID) return "oidc (BLOB_STORE_ID)";
  if (process.env.BLOB_READ_WRITE_TOKEN) return "read-write token";
  return "none";
}

// The date in Toronto, because "today" should mean what a reader in Newmarket
// means by it, not what a server in Virginia means by it.
export function torontoDay(d = new Date()) {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
}

function pathFor(day, town) {
  // Each town's local stories are archived separately; everything else is shared.
  return town && town !== "shared" ? `${PREFIX}${town}/${day}.json` : `${PREFIX}${day}.json`;
}

// Only the fields worth keeping. No images, no source colours — those are
// looked up fresh when the article is shown.
function slim(a) {
  return {
    title: a.title,
    link: a.link,
    description: a.description,
    pubDate: a.pubDate,
    source: a.source,
    sourcePlace: a.sourcePlace,
    topics: a.topics,
    paywall: a.paywall,
    opinion: a.opinion,
    firstSeen: a.firstSeen || new Date().toISOString(),
  };
}

async function readFile(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/* Add today's new articles to today's file. Anything already there (matched on
   its link) keeps the timestamp it was first seen with, so an article doesn't
   jump up the page because a publisher edited it. */
export async function appendToday(articles, town = "shared") {
  if (!enabled() || !Array.isArray(articles) || articles.length === 0) return { written: 0 };
  const day = torontoDay();
  const key = pathFor(day, town);
  try {
    const { blobs } = await list({ prefix: key, limit: 1 });
    const existing = blobs?.[0] ? await readFile(blobs[0].url) : [];
    const byLink = new Map(existing.map((a) => [a.link, a]));
    let added = 0;
    for (const a of articles) {
      if (!a?.link) continue;
      if (byLink.has(a.link)) continue;
      byLink.set(a.link, slim(a));
      added++;
    }
    if (added === 0) return { written: 0 };
    await put(key, JSON.stringify([...byLink.values()]), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
    });
    return { written: added };
  } catch (err) {
    console.warn("[debrief.to] archive write failed:", err?.message);
    return { written: 0, error: err?.message };
  }
}

/* Everything we have from the last `days` days. Today's file is skipped —
   the live feed is a fresher copy of the same thing. */
export async function readBack(days, town = "shared") {
  if (!enabled() || !days || days < 1) return { articles: [], days: 0 };
  const wanted = new Set();
  const today = torontoDay();
  for (let i = 1; i <= days; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const day = torontoDay(d);
    if (day !== today) wanted.add(day);
  }
  try {
    const prefix = town && town !== "shared" ? `${PREFIX}${town}/` : PREFIX;
    const { blobs } = await list({ prefix, limit: 400 });
    const files = (blobs || []).filter((b) => {
      const m = b.pathname.match(/(\d{4}-\d{2}-\d{2})\.json$/);
      // For the shared archive, ignore the per-town subfolders
      if (town === "shared" && b.pathname.slice(PREFIX.length).includes("/")) return false;
      return m && wanted.has(m[1]);
    });
    const lists = await Promise.all(files.map((b) => readFile(b.url)));
    return { articles: lists.flat(), days: files.length };
  } catch (err) {
    console.warn("[debrief.to] archive read failed:", err?.message);
    return { articles: [], days: 0, error: err?.message };
  }
}

/* Delete anything past the retention window. Runs on the same pass as a write,
   so it costs nothing extra and the archive can't grow without limit. */
export async function trim() {
  if (!enabled()) return { deleted: 0 };
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS);
  const cutoffDay = torontoDay(cutoff);
  try {
    const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
    const old = (blobs || []).filter((b) => {
      const m = b.pathname.match(/(\d{4}-\d{2}-\d{2})\.json$/);
      return m && m[1] < cutoffDay;
    });
    if (old.length === 0) return { deleted: 0 };
    await del(old.map((b) => b.url));
    return { deleted: old.length };
  } catch (err) {
    console.warn("[debrief.to] archive trim failed:", err?.message);
    return { deleted: 0, error: err?.message };
  }
}

export function archiveEnabled() {
  return enabled();
}
