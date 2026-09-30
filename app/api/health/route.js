import { SOURCES } from "../../lib/sources";
import { publisherFeeds } from "../../lib/towns";
// The same door the live feed uses, so a green light here means readers get it.
import { fetchItems, lineOf } from "../../lib/fetch-feed";
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
export const maxDuration = 300;

/* Checking fairly. A health check that asks every publisher in the same
   instant gets refused by the ones that rate-limit, and then reports them as
   broken. So it checks a few at a time, puts Metroland and Torstar's papers
   and the papers read through a WordPress API (Postmedia's) in lanes of
   their own where fetch-feed spaces them out, and waits out a 429 before
   judging. If the time runs out, anything not reached is listed as not
   checked rather than failing. */
const CONCURRENCY = 6;
const BUDGET_MS = 240 * 1000;

async function check(feed) {
  try {
    const { items, url, via, filteredFrom, categoriesSeen } = await fetchItems(feed, { fresh: true, patient: true });
    const door = feed.fallback && url && !(feed.urls || []).includes(url) ? "api" : "rss";
    const newest = items[0]?.isoDate || items[0]?.pubDate || null;
    return {
      name: feed.name, ok: true, url, items: items.length, newest, door,
      // "honest" means the first attempt was refused and the plain-named
      // retry got through: the Cloudflare question, answered per feed.
      via,
      // Answered, but the category filter kept nothing: what it did carry.
      ...(filteredFrom ? { filteredFrom, categoriesSeen } : {}),
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
  // ?scope=standing checks the Toronto, Ontario and Canada newsrooms every
  // reader gets (and reports whether a publisher answered by RSS or by its
  // WordPress API — see The Walrus).
  const all = searchParams.get("scope") === "standing"
    ? SOURCES
    : publisherFeeds(wantTowns ? "town" : "region");
  const offset = Number(searchParams.get("offset") || 0);
  const limit = Number(searchParams.get("limit") || all.length);
  const targets = all.slice(offset, offset + limit);

  const started = Date.now();
  const results = new Array(targets.length);
  const lane = (indexes) => async () => {
    while (indexes.length) {
      const i = indexes.shift();
      results[i] = Date.now() - started > BUDGET_MS
        ? { name: targets[i].name, notChecked: true }
        : await check(targets[i]);
    }
  };
  const blox = [], wordpress = [], rest = [];
  targets.forEach((t, i) => ({ blox, wordpress }[lineOf(t)] || rest).push(i));
  await Promise.all([lane(blox)(), lane(wordpress)(), ...Array.from({ length: CONCURRENCY }, lane(rest))]);

  const notChecked = results.filter((r) => r.notChecked);
  const checked = results.filter((r) => !r.notChecked);
  const ok = checked.filter((r) => r.ok);
  const failed = checked.filter((r) => !r.ok);
  const stale = ok.filter((r) => r.daysSinceNewest !== null && r.daysSinceNewest > 30);
  // Answering with nothing to show is its own kind of broken.
  const empty = ok.filter((r) => r.items === 0);

  /* The archive's own report: how many towns are active, how many
     publications and stories are stored, the oldest story (which should
     settle at about 33 days), and what the collector did last time it ran.
     If lastCollectorRun is more than a day old, the schedules have stopped. */
  const archive = await archiveStats();

  return Response.json({
    checked: searchParams.get("scope") === "standing" ? "standing sources" : wantTowns ? "town feeds" : "region feeds",
    summary: `${ok.length} of ${checked.length} answering${failed.length ? `, ${failed.length} failing` : ""}${empty.length ? `, ${empty.length} empty` : ""}${stale.length ? `, ${stale.length} stale` : ""}${notChecked.length ? `, ${notChecked.length} not checked (out of time)` : ""}`,
    page: { offset, limit: targets.length, of: all.length, next: offset + targets.length < all.length ? offset + targets.length : null },
    neededHonestName: ok.filter((r) => r.via === "honest").map((r) => r.name),
    failing: failed,
    notChecked: notChecked.map((r) => r.name),
    empty: empty.map((r) => ({ name: r.name, url: r.url, filteredFrom: r.filteredFrom, categoriesSeen: r.categoriesSeen })),
    stale: stale.map((r) => ({ name: r.name, daysSinceNewest: r.daysSinceNewest })),
    answering: ok.map((r) => ({ name: r.name, items: r.items, daysSinceNewest: r.daysSinceNewest, via: r.via, ...(r.door === "api" ? { door: "api" } : {}) })),
    archive,
  }, { headers: { "Cache-Control": "no-store" } });
}
