import Parser from "rss-parser";
import { TOWNS, REGIONS } from "../../lib/towns";
import { archiveEnabled, readBack, torontoDay, RETENTION_DAYS } from "../../lib/archive";

/* ---- Is everything still answering? ----
   Feeds break quietly. A newsroom redesigns its site, a feed URL moves, a
   publisher starts refusing robots, and the only symptom is a tab that slowly
   goes empty. This page says plainly which feeds answered and which didn't.

   Visit /api/health for the standing sources, or /api/health?towns=1 to check
   every town in the registry. A town whose feed fails is not broken from a
   reader's point of view — it just falls back to its region — but this is how
   you find out that it happened. ---- */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
  },
});

async function check(name, urls) {
  let lastErr = null;
  for (const url of urls) {
    try {
      const feed = await parser.parseURL(url);
      const items = feed.items || [];
      const newest = items[0]?.isoDate || items[0]?.pubDate || null;
      return {
        name, ok: true, url, items: items.length, newest,
        // A feed that still answers but stopped publishing months ago is its
        // own kind of broken, so say how stale it is.
        daysSinceNewest: newest ? Math.floor((Date.now() - new Date(newest)) / 86400000) : null,
      };
    } catch (err) {
      lastErr = err?.message;   // try the next candidate URL before giving up
    }
  }
  return { name, ok: false, url: urls[0], error: lastErr || "all candidate URLs failed" };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const wantTowns = searchParams.get("towns") === "1";

  const targets = wantTowns
    ? TOWNS.filter((t) => t.feeds?.length).map((t) => ({ name: `${t.name} (${t.feeds[0].name})`, urls: t.feeds[0].urls }))
    : [
        ...Object.entries(REGIONS).map(([slug, r]) => ({ name: `${r.name} (${r.feeds[0].name})`, urls: r.feeds[0].urls })),
      ];

  const results = await Promise.all(targets.map((t) => check(t.name, t.urls)));
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const stale = ok.filter((r) => r.daysSinceNewest !== null && r.daysSinceNewest > 14);

  let archive = { enabled: archiveEnabled(), retentionDays: RETENTION_DAYS, today: torontoDay() };
  if (archiveEnabled()) {
    const back = await readBack(RETENTION_DAYS, "shared");
    archive = { ...archive, daysStored: back.days, articlesStored: back.articles.length };
  }

  return Response.json({
    checked: wantTowns ? "town feeds" : "region feeds",
    summary: `${ok.length} of ${results.length} answering${failed.length ? `, ${failed.length} failing` : ""}${stale.length ? `, ${stale.length} stale` : ""}`,
    failing: failed,
    stale: stale.map((r) => ({ name: r.name, daysSinceNewest: r.daysSinceNewest })),
    answering: ok.map((r) => ({ name: r.name, items: r.items, daysSinceNewest: r.daysSinceNewest })),
    archive,
  }, { headers: { "Cache-Control": "no-store" } });
}
