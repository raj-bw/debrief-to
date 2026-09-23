import { resolveTown, DEFAULT_TOWN } from "../../lib/towns";
import { topicsFor, placesFor, TOPIC_RULES_VERSION } from "../../lib/topics";
import { clusterStories } from "../../lib/cluster";
import { archiveEnabled, readArticles, shelfSizes, bucketFor, activateTown, storeArticles } from "../../lib/archive";
import { SOURCES } from "../../lib/sources";
import { buildArticles } from "../../lib/articles";
// How a story is judged — what gets left out and what only gets labelled —
// lives in its own file, because those rules are published on the About page
// and deserve to be readable and testable on their own.
import { isBlotter } from "../../lib/filters";
// RSS, WordPress API and the rest all come in through one door, shared with
// /api/health so that page tests exactly what readers depend on.
import { fetchItems } from "../../lib/fetch-feed";

// Run this route on every request that reaches the server, and let Vercel's CDN
// hold a short-lived copy instead. (It used to be "force-static" + revalidate,
// which served weeks-old articles to the first visitor after a quiet stretch.)
export const dynamic = "force-dynamic";

// How long Vercel's CDN may reuse a copy of the feed. Each town and time
// range is a separate address, so each gets its own copy.
//   Today: fresh for 10 minutes, then up to 20 more while a new one is made.
//   This Week / This Month: 30 minutes, then up to an hour more — a week of
//   news barely changes in half an hour, and every copy reused is server
//   time saved.
const CDN_CACHE = {
  today: "public, s-maxage=600, stale-while-revalidate=1200",
  long: "public, s-maxage=1800, stale-while-revalidate=3600",
};

/* How many stories to take from each shelf. The standing sources share one
   shelf, so a month of them is a few thousand; the per-day caps below cut
   that to what's shown. */
const SHELF_LIMITS = { shared: 4000, default: 800 };

// How many articles any one source may contribute to a single fetch.
/* How many stories any one source may contribute before the date window is
   applied. This used to be 8, which for a daily paper is about half a day —
   so This Week and This Month quietly showed the same few hours as Today.
   Balance between newsrooms is kept later, by the per-day cap and fairShare,
   which see the dates; this cut can't. */
const PER_SOURCE_LIMIT = 40;

// The standing source list lives in app/lib/sources.js, shared with the collector.


async function fetchSource(src) {
  try {
    const got = await fetchItems(src);
    return buildArticles(src, got.items, { limit: PER_SOURCE_LIMIT });
  } catch (err) {
    console.warn(`[debrief.to] ${src.name} -> ${err?.message}`);
    return { __error: src.name, message: err?.message || "all candidate URLs failed" };
  }
}

/* ---- Keeping the feed digestible ----
   A newsroom posting every twenty minutes shouldn't drown out a weekly
   investigation. None of these rules judge an individual story: a daily limit
   per newsroom, a limit on crime-blotter items, and an order that gives every
   newsroom a turn before anyone gets a second slot. ---- */

const PER_SOURCE_PER_DAY = 5;
/* The reader's own newsroom gets more room: it's what they came for. At 5 a
   day, a busy local paper's morning stories dropped off the page as the
   afternoon's arrived — which read as stories disappearing. */
const HOME_PER_DAY = 15;
const BLOTTER_PER_DAY = 2;

// Day in Toronto time, so "today" means what a reader in Newmarket means by it.
// One formatter, made once: building a new one for every story was a large
// share of the work on a month-long page.
const TORONTO_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" });
function dayKey(iso) {
  const t = new Date(iso);
  return Number.isFinite(t.getTime()) ? TORONTO_DAY.format(t) : "unknown";
}

// Keep at most `max` items per day for each key (list must already be newest first)
function capPerDay(list, keyOf, max) {
  const seen = new Map();
  return list.filter((a) => {
    const key = keyOf(a) + "|" + dayKey(a.pubDate);
    const n = (seen.get(key) || 0) + 1;
    seen.set(key, n);
    return n <= max;
  });
}

// Give every newsroom a turn: the newest story from each, then second-newest
// from each, and so on. Within a round, newest first.
function fairShare(list) {
  const rank = new Map();
  const ranked = list.map((a) => {
    const n = (rank.get(a.source) || 0);
    rank.set(a.source, n + 1);
    return { a, round: n };
  });
  const ts = new Map(list.map((a) => [a, new Date(a.pubDate).getTime() || 0]));
  ranked.sort((x, y) => x.round - y.round || ts.get(y.a) - ts.get(x.a));
  return ranked.map((r) => r.a);
}

// Keep newest-first order, but never show more than two cards in a row from the
// same newsroom: if a third would follow, the next article from someone else is
// pulled up ahead of it.
function spreadOutSources(list, maxRun = 2) {
  for (let i = maxRun; i < list.length; i++) {
    const run = list.slice(i - maxRun, i);
    if (!run.every((a) => a.source === list[i].source)) continue;
    const swapWith = list.findIndex((a, j) => j > i && a.source !== list[i].source);
    if (swapWith === -1) break;
    const [moved] = list.splice(swapWith, 1);
    list.splice(i, 0, moved);
  }
  return list;
}

// How far back each view reaches. "This Month" is the last 31 days.
const RANGE_DAYS = { today: 1, week: 7, month: 31 };

// Colours and places for articles coming back out of the archive, which stores
// neither (they'd only go stale if a source ever changed colour).
function rehydrate(a, colorBySource) {
  return {
    ...a,
    sourceColor: colorBySource.get(a.source) || "#6B665F",
    topics: Array.isArray(a.topics) ? a.topics : [],
    image: a.image || null,
  };
}

/* The finished page, kept for a few minutes on this server. The CDN keeps
   copies too, but each of its regions keeps its own, so the same town and
   tab can be asked for several times in a few minutes; this answers the
   repeats without doing the work again. */
const PAGE_MEMO = new Map();
const PAGE_MEMO_MS = { today: 4 * 60 * 1000, long: 12 * 60 * 1000 };

function respond(body, rangeKey) {
  return Response.json(body, {
    headers: {
      // Only Vercel's CDN reads this one.
      "Vercel-CDN-Cache-Control": rangeKey === "today" ? CDN_CACHE.today : CDN_CACHE.long,
      // Browsers: always check back with the server instead of reusing an old copy.
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const townSlug = searchParams.get("town") || DEFAULT_TOWN;
  const rangeKey = (searchParams.get("range") || "today").toLowerCase();
  const days = RANGE_DAYS[rangeKey] || 1;

  const memoKey = `${townSlug.toLowerCase()}|${rangeKey}`;
  const memoHit = PAGE_MEMO.get(memoKey);
  if (memoHit && Date.now() - memoHit.at < PAGE_MEMO_MS[rangeKey === "today" ? "today" : "long"]) {
    return respond(memoHit.body, rangeKey);
  }

  // The reader's local tab: their town if it has a publisher, otherwise the
  // region that covers it.
  const town = resolveTown(townSlug);
  let homePlace = town.label;
  let usingRegion = town.usingRegion;

  // The town's own publisher sits alongside the standing list.
  const townSources = (town.feeds || []).map((f) => ({ ...f, place: "home" }));
  const allSources = [...townSources, ...SOURCES];
  const colorBySource = new Map(allSources.map((s) => [s.name, s.color]));
  const windowStart = Date.now() - (days + 1) * 86400000;
  const townBuckets = townSources.map(bucketFor);

  /* ---- Where the stories come from ----
     Readers read from the archive. The collector visits every publisher
     every hour and files what it finds, so a page view is a database lookup
     rather than thirty publishers asked and thirty feeds parsed — about
     twenty times less server work, which is what keeps the site inside the
     free plan as readers arrive.

     Publishers are only asked directly in three cases:
       - the archive is down or not set up (the site must still work);
       - a town is being picked for the very first time (its shelf is empty
         until the next collector run, so fetch it now and file it);
       - a town's shelves are empty altogether (never collected — a new
         feed, or one that failed on its first visit). */
  const regionSources = (town.regionFeeds || [])
    .filter((f) => !townBuckets.includes(bucketFor(f)))
    .map((f) => ({ ...f, place: "home" }));
  const regionBuckets = regionSources.map(bucketFor);
  regionSources.forEach((s) => colorBySource.set(s.name, s.color));

  let archiveOk = archiveEnabled();
  let stored = { articles: [] };
  if (archiveOk) {
    stored = await readArticles(["shared", ...townBuckets, ...regionBuckets], windowStart, SHELF_LIMITS);
    if (stored.error) archiveOk = false;
  }

  const errors = [];
  const live = [];
  const fetchLive = async (sources) => {
    const results = await Promise.all(sources.map((s) => fetchSource(s)));
    for (const r of results) {
      if (Array.isArray(r)) live.push(...r);
      else if (r?.__error) errors.push({ source: r.__error, message: r.message });
    }
  };

  let askedTownLive = false;     // publishers were asked directly for this town
  if (!archiveOk) {
    await fetchLive(allSources);
  } else {
    // A town becomes active the first time anyone picks it, and stays so.
    const isNew = town.label && townSources.length ? await activateTown(town.slug) : false;
    const storedHome = stored.articles.some((a) => townBuckets.includes(a.bucket));
    let neverCollected = false;
    if (!isNew && townSources.length && !storedHome) {
      const sizes = await shelfSizes(townBuckets);
      neverCollected = sizes.every((n) => n === 0);
    }
    const sharedEmpty = !stored.articles.some((a) => a.bucket === "shared");
    const toFetch = [
      ...(isNew || neverCollected ? townSources : []),
      ...(sharedEmpty ? SOURCES : []),      // only before the collector's first run
    ];
    if (toFetch.length) await fetchLive(toFetch);
    askedTownLive = isNew || neverCollected;
    // File what was just fetched for the town, so its shelf starts now.
    if (isNew || neverCollected) {
      await Promise.all(townSources.map((src, i) =>
        storeArticles(townBuckets[i], src.name, live.filter((a) => a.source === src.name)).catch(() => null)));
    }
  }

  /* Archived stories are re-tagged with today's rules, not the ones in force
     when they were saved — otherwise a rule change (a new chip, a wider
     topic) would only ever reach new stories. Stories from the town's own
     shelves are the town's local news. "National" was the old name for the
     Canada place. */
  const homeBuckets = new Set(townBuckets);
  const regionSet = new Set(regionBuckets);
  const retag = (a) => {
    const r = rehydrate(a, colorBySource);
    if (homeBuckets.has(a.bucket) || regionSet.has(a.bucket)) r.sourcePlace = "home";
    else if (r.sourcePlace === "National") r.sourcePlace = "Canada";
    // Re-tag only stories filed under older rules (see TOPIC_RULES_VERSION).
    if (a.tv !== TOPIC_RULES_VERSION) r.topics = [...new Set([...(r.topics || []), ...topicsFor(r, null)])];
    delete r.tv;
    return r;
  };
  let older = stored.articles.filter((a) => !regionSet.has(a.bucket)).map(retag);

  /* If the town's own publisher has nothing in this window, the region's
     publisher stands in, and the tab takes the region's name, because that
     is what the reader is actually getting. (A town with no publisher of its
     own is already set up this way by resolveTown.) */
  const inWindowAt = (a) => { const t = new Date(a.pubDate).getTime(); return !Number.isFinite(t) || t >= windowStart; };
  const hasHome = () => live.some((a) => a.sourcePlace === "home") || older.some((a) => a.sourcePlace === "home" && inWindowAt(a));
  if (townSources.length && !usingRegion && !hasHome() && regionSources.length) {
    const fromShelf = stored.articles.filter((a) => regionSet.has(a.bucket)).map(retag);
    if (fromShelf.length) older = older.concat(fromShelf);
    // Nothing on the region's shelf yet either: on a town's first visit (or
    // with the archive down) ask the region's publisher directly.
    else if (!archiveOk || askedTownLive) await fetchLive(regionSources);
    if (hasHome()) {
      homePlace = town.regionName;
      usingRegion = true;
    }
  }

  // Now that the local tab's name is settled, work out where each story belongs.
  for (const a of live) a.places = placesFor(a, a.sourcePlace, homePlace);
  for (const a of older) a.places = placesFor(a, a.sourcePlace, homePlace);

  // One article, one card: the live feed wins over the archived copy.
  const byLink = new Map();
  for (const a of older) if (a?.link) byLink.set(a.link, a);
  for (const a of live) if (a?.link) byLink.set(a.link, a);
  let articles = [...byLink.values()];

  /* ---- What "today" actually means ----
     Until now nothing was filtered by date: whatever a publisher's feed
     happened to be holding went into every view, so a weekly paper's
     three-week-old story sat in Today looking like news.

     Now the range means what it says. The window is the one the reader
     asked for, with a day's grace so a story filed late last night still
     counts as today's. A publisher that is quiet for a fortnight simply
     stops appearing in Today and shows up in This Week or This Month
     instead — which is the honest answer, and the reason it is worth
     carrying weeklies and small-town papers at all. ---- */
  const inWindow = (a) => {
    const t = new Date(a.pubDate).getTime();
    return Number.isFinite(t) ? t >= windowStart : true;   // undated: keep
  };
  articles = articles.filter(inWindow);

  {
    const ts = new Map(articles.map((a) => [a, new Date(a.pubDate).getTime()]));
    const at = (a) => (Number.isFinite(ts.get(a)) ? ts.get(a) : -Infinity);   // undated last
    articles.sort((a, b) => at(b) - at(a));
  }

  // 1. fold stories several newsrooms covered into a single card
  articles = clusterStories(articles);
  // 2. no newsroom gets more than PER_SOURCE_PER_DAY stories on any given day
  {
    const seen = new Map();
    articles = articles.filter((a) => {
      const key = a.source + "|" + dayKey(a.pubDate);
      const n = (seen.get(key) || 0) + 1;
      seen.set(key, n);
      return n <= (a.sourcePlace === "home" ? HOME_PER_DAY : PER_SOURCE_PER_DAY);
    });
  }
  // 3. crime-blotter items are capped for the whole feed, not per source
  const blotterKept = capPerDay(articles.filter(isBlotter), () => "blotter", BLOTTER_PER_DAY);
  const blotterSet = new Set(blotterKept.map((a) => a.link));
  articles = articles.filter((a) => !isBlotter(a) || blotterSet.has(a.link));
  // 4. every newsroom gets a turn before anyone gets a second slot
  articles = fairShare(articles);
  spreadOutSources(articles);

  const body = {
    articles,
    errors,
    fetchedAt: new Date().toISOString(),
    sourceCount: allSources.length,
    town: {
      slug: town.slug,
      label: homePlace,
      townName: town.townName,
      regionName: town.regionName,
      usingRegion,
      hasLocal: Boolean(homePlace),
      // true when the town has a publisher on paper but it didn't answer today
      fellBackBecauseFeedFailed: usingRegion && !town.usingRegion,
    },
    range: rangeKey,
    // So the page can be honest about why a month view looks thin
    archive: { enabled: archiveEnabled(), stored: older.length },
  };

  // If every source failed, say so and don't let the CDN keep this empty result.
  if (articles.length === 0) {
    return Response.json(body, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  // Keep it only if it came from the archive as usual — a page patched
  // together from live fetches during an outage shouldn't be repeated.
  if (archiveOk) {
    PAGE_MEMO.set(memoKey, { at: Date.now(), body });
    if (PAGE_MEMO.size > 300) PAGE_MEMO.delete(PAGE_MEMO.keys().next().value);
  }
  return respond(body, rangeKey);
}
