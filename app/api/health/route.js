import { SOURCES } from "../../lib/sources";
import { publisherFeeds } from "../../lib/towns";
// The same door the live feed uses, so a green light here means readers get it.
import { fetchItems, lineOf } from "../../lib/fetch-feed";
import { archiveStats, takeTurn } from "../../lib/archive";
import { republishedFrom } from "../../lib/republished";
import { buildArticles } from "../../lib/articles";

// "Kingston (Kingstonist)" is Kingstonist, as far as the filters are concerned
const asSource = (feed) => ({ ...feed, name: feed.name.replace(/^.*\((.*)\)$/, "$1") });

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
const HEALTH_GAP_MS = 120 * 1000;

async function check(feed) {
  try {
    const { items, url, via, filteredFrom, categoriesSeen } = await fetchItems(feed, { fresh: true, patient: true });
    const door = feed.fallback && url && !(feed.urls || []).includes(url) ? "api" : "rss";
    const newest = items[0]?.isoDate || items[0]?.pubDate || null;
    /* What a reader would actually get: the stories left after our own
       filters (wire copy, obituaries, sponsored posts...). A feed can answer
       with 30 items and still give readers nothing. */
    const kept = buildArticles(asSource(feed), items, { limit: 60 });
    const keptNewest = kept.map((a) => a.pubDate).sort().pop() || null;
    return {
      name: feed.name, ok: true, url, items: items.length, newest, door,
      kept: kept.length,
      keptDaysSinceNewest: keptNewest ? Math.floor((Date.now() - new Date(keptNewest)) / 86400000) : null,
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
  /* ?sample=Be Giant shows what one newsroom's feed actually carries for
     its first stories: byline, categories, any credit line, and the
     "Republished from" label we'd give each. Read-only, one feed. */
  const sample = (searchParams.get("sample") || "").trim().toLowerCase();
  if (sample) {
    const feed = [...SOURCES, ...publisherFeeds()].find((f) => f.name.toLowerCase().includes(sample));
    if (!feed) return Response.json({ ok: false, error: "No newsroom by that name." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    const secret = process.env.CRON_SECRET;
    const trusted = secret && request.headers.get("authorization") === `Bearer ${secret}`;
    if (!trusted && !(await takeTurn("health", HEALTH_GAP_MS))) {
      return Response.json({ ok: false, error: "A feed check ran in the last two minutes. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(HEALTH_GAP_MS / 1000), "Cache-Control": "no-store" } });
    }
    const plain = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    try {
      const { items, url } = await fetchItems(feed, { fresh: true, patient: true });
      const src = asSource(feed);
      return Response.json({
        name: feed.name, url, items: items.length,
        first: items.slice(0, Number(searchParams.get("n") || 6)).map((it) => {
          const text = plain(it.contentEncoded || it.content || it.description);
          return {
            title: it.title, link: it.link, date: it.isoDate || it.pubDate || null,
            creator: it.creator || null, author: it.author || null, categories: it.categories || [],
            republishedFrom: republishedFrom(src, it),
            credits: [...text.matchAll(/[^.]{0,80}\b(originally|republished|first (?:published|appeared)|courtesy of|be giant)\b[^.]{0,80}/gi)].map((m) => m[0].trim()).slice(0, 3),
            textEnd: text.slice(-200),
          };
        }),
      }, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return Response.json({ name: feed.name, ok: false, error: err?.message || "failed" }, { headers: { "Cache-Control": "no-store" } });
    }
  }

  const offset = Number(searchParams.get("offset") || 0);
  const limit = Number(searchParams.get("limit") || all.length);
  const targets = all.slice(offset, offset + limit);

  // Asking every publisher is heavy, so without the secret it's one full
  // check every two minutes (see takeTurn). ?limit=0, the archive figures
  // alone, asks no one and is always open.
  const secret = process.env.CRON_SECRET;
  const trusted = secret && request.headers.get("authorization") === `Bearer ${secret}`;
  if (targets.length && !trusted && !(await takeTurn("health", HEALTH_GAP_MS))) {
    return Response.json(
      { ok: false, error: "A feed check ran in the last two minutes. Try again shortly, or use ?limit=0 for the archive figures alone." },
      { status: 429, headers: { "Retry-After": String(HEALTH_GAP_MS / 1000), "Cache-Control": "no-store" } },
    );
  }

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
    answering: ok.map((r) => ({ name: r.name, items: r.items, kept: r.kept, daysSinceNewest: r.daysSinceNewest, keptDaysSinceNewest: r.keptDaysSinceNewest, via: r.via, ...(r.door === "api" ? { door: "api" } : {}) })),
    archive,
  }, { headers: { "Cache-Control": "no-store" } });
}
