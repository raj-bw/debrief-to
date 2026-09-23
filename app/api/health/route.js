import { publisherFeeds } from "../../lib/towns";
// The same door the live feed uses, so a green light here means readers get it.
import { fetchItems } from "../../lib/fetch-feed";
import { archiveStats } from "../../lib/archive";

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

async function check(feed) {
  try {
    const { items, url, via } = await fetchItems(feed, { fresh: true });
    const newest = items[0]?.isoDate || items[0]?.pubDate || null;
    return {
      name: feed.name, ok: true, url, items: items.length, newest,
      // "honest" means the first attempt was refused and the plain-named
      // retry got through: the Cloudflare question, answered per feed.
      via,
      // A feed that still answers but stopped publishing months ago is its
      // own kind of broken, so say how stale it is.
      daysSinceNewest: newest ? Math.floor((Date.now() - new Date(newest)) / 86400000) : null,
    };
  } catch (err) {
    return { name: feed.name, ok: false, url: feed.api || (feed.urls || [])[0], error: err?.message || "failed" };
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const wantTowns = searchParams.get("towns") === "1";

  // Every distinct newsroom we depend on. ?towns=1 checks the ones tied to a
  // single municipality; the default checks the region-wide ones, which are
  // what most towns actually fall back to.
  // There are over a hundred and fifty feeds now, so they can be checked in
  // pages: ?towns=1&offset=40&limit=40. Without paging, everything at once.
  const all = publisherFeeds(wantTowns ? "town" : "region");
  const offset = Number(searchParams.get("offset") || 0);
  const limit = Number(searchParams.get("limit") || all.length);
  const targets = all.slice(offset, offset + limit);

  const results = await Promise.all(targets.map(check));
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const stale = ok.filter((r) => r.daysSinceNewest !== null && r.daysSinceNewest > 30);

  /* The archive's own report: how many towns are active, how many
     publications and stories are stored, the oldest story (which should
     settle at about 45 days), and what the collector did last time it ran.
     If lastCollectorRun is more than a day old, the schedules have stopped. */
  const archive = await archiveStats();

  return Response.json({
    checked: wantTowns ? "town feeds" : "region feeds",
    summary: `${ok.length} of ${results.length} answering${failed.length ? `, ${failed.length} failing` : ""}${stale.length ? `, ${stale.length} stale` : ""}`,
    page: { offset, limit: targets.length, of: all.length, next: offset + targets.length < all.length ? offset + targets.length : null },
    neededHonestName: ok.filter((r) => r.via === "honest").map((r) => r.name),
    failing: failed,
    stale: stale.map((r) => ({ name: r.name, daysSinceNewest: r.daysSinceNewest })),
    answering: ok.map((r) => ({ name: r.name, items: r.items, daysSinceNewest: r.daysSinceNewest, via: r.via })),
    archive,
  }, { headers: { "Cache-Control": "no-store" } });
}
