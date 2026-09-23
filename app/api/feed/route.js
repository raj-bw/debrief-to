import { resolveTown, DEFAULT_TOWN } from "../../lib/towns";
import { topicsFor, placesFor } from "../../lib/topics";
import { clusterStories } from "../../lib/cluster";
import { appendToday, readBack, trim, archiveEnabled } from "../../lib/archive";
// How a story is judged — what gets left out and what only gets labelled —
// lives in its own file, because those rules are published on the About page
// and deserve to be readable and testable on their own.
import { isPaywalled, shouldSkip, isOpinion, isBlotter } from "../../lib/filters";
// RSS, WordPress API and the rest all come in through one door, shared with
// /api/health so that page tests exactly what readers depend on.
import { fetchItems } from "../../lib/fetch-feed";

// Run this route on every request that reaches the server, and let Vercel's CDN
// hold a short-lived copy instead. (It used to be "force-static" + revalidate,
// which served weeks-old articles to the first visitor after a quiet stretch.)
export const dynamic = "force-dynamic";

// How long Vercel's CDN may reuse a copy of the feed:
//   - fresh for 10 minutes
//   - then up to 20 more minutes it may serve the old copy while it fetches a new one
// Each town and time range is a separate address, so each gets its own copy.
const CDN_CACHE = "public, s-maxage=600, stale-while-revalidate=1200";

// How many articles any one source may contribute to a single fetch.
/* How many stories any one source may contribute before the date window is
   applied. This used to be 8, which for a daily paper is about half a day —
   so This Week and This Month quietly showed the same few hours as Today.
   Balance between newsrooms is kept later, by the per-day cap and fairShare,
   which see the dates; this cut can't. */
const PER_SOURCE_LIMIT = 40;

/* The standing source list: everything that isn't tied to the reader's own
   town. The town's own publisher is added on top of this, and comes from the
   registry in app/lib/towns.js.

   `place` is where a newsroom's patch is. It decides which place tab a story
   lands in by default, and which newsroom wins when several cover the same
   story — the most local one was there. */
const SOURCES = [
  // --- Toronto ---
  { name: "CBC Toronto",     urls: ["https://www.cbc.ca/cmlink/rss-canada-toronto", "https://www.cbc.ca/webfeed/rss/rss-canada-toronto"], color: "#E03C31", place: "Toronto" },
  { name: "TorontoToday",    urls: ["https://www.torontotoday.ca/rss/local", "https://www.torontotoday.ca/rss/local-news", "https://www.torontotoday.ca/rss"], color: "#0F7B6C", place: "Toronto", kind: "village" },
  { name: "The Green Line",  urls: ["https://thegreenline.to/feed/", "https://thegreenline.to/rss"], color: "#4C8C2B", place: "Toronto" },
  { name: "thelocal.to",     urls: ["https://thelocal.to/feed/"], color: "#3A9B7A", place: "Toronto" },
  { name: "Spacing Toronto", urls: ["https://spacing.ca/toronto/feed/"], color: "#0F2E4A", place: "Toronto" },
  { name: "Toronto Star",    urls: ["https://www.thestar.com/search/?f=rss&t=article&c=news%2Fgta*&l=20&s=start_time&sd=desc", "https://www.thestar.com/feeds.articles.gta.rss"], color: "#003DA5", place: "Toronto" },
  // --- Ontario ---
  { name: "The Trillium",    urls: ["https://www.thetrillium.ca/rss/news", "https://www.thetrillium.ca/rss"], color: "#7B2D8E", place: "Ontario" },
  { name: "The Narwhal",     urls: ["https://thenarwhal.ca/feed/"], color: "#2D6A4F", place: "Ontario" },
  // --- Canada-wide reporting (the "Canada" place chip) ---
  { name: "National Observer", urls: ["https://www.nationalobserver.com/front/rss", "https://www.nationalobserver.com/rss.xml"], color: "#0B7285", place: "Canada" },
  { name: "The Breach",      urls: ["https://breachmedia.ca/feed/"], color: "#1565C0", place: "Canada" },
  { name: "IJF",             urls: ["https://theijf.org/rss.xml", "https://theijf.org/feed", "https://theijf.org/rss"], color: "#8B5E00", place: "Canada" },
  { name: "Ricochet",        urls: ["https://ricochet.media/feed/", "https://ricochet.media/en/feed"], color: "#B3261E", place: "Canada" },
  { name: "The Maple",       urls: ["https://www.readthemaple.com/rss/", "https://readthemaple.com/rss/"], color: "#A8324A", place: "Canada" },
  { name: "Canadaland",      urls: ["https://www.canadaland.com/feed/"], color: "#C62828", place: "Canada" },
  { name: "The Walrus",      urls: ["https://thewalrus.ca/feed/", "https://thewalrus.ca/feed/?type=rss2", "https://thewalrus.ca/rss"], color: "#D4872C", place: "Canada" },
];

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

function extractImage(item) {
  if (item.image) return item.image;   // WordPress API items carry it directly
  if (item.enclosure?.url && /\.(jpg|jpeg|png|webp|gif)/i.test(item.enclosure.url)) {
    return item.enclosure.url;
  }
  const mc = item.mediaContent?.[0];
  if (mc?.$?.url) return mc.$.url;
  if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;
  const html = item.contentEncoded || item.content || item.description || "";
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) return match[1];
  return null;
}

async function fetchSource(src) {
  let got;
  try {
    got = await fetchItems(src);
  } catch (err) {
    console.warn(`[debrief.to] ${src.name} -> ${err?.message}`);
    return { __error: src.name, message: err?.message || "all candidate URLs failed" };
  }
  const articles = [];
  for (const item of (got.items || []).slice(0, 40)) {
    const raw = item.contentSnippet || item.content || item.description || "";
    const base = {
      title: stripHtml(item.title || ""),
      link: item.link || "",
      description: stripHtml(raw).slice(0, 320),
      pubDate: item.isoDate || item.pubDate || new Date().toISOString(),
      source: src.name,
      sourceColor: src.color,
      sourcePlace: src.place,
      paywall: isPaywalled(src, item.link || ""),
      image: extractImage(item),
    };
    if (!base.link || !base.title) continue;
    if (shouldSkip(src, base)) continue;
    articles.push({
      ...base,
      opinion: isOpinion(base),
      // What the story is about, and where it is about — worked out per
      // article, so one newsroom's output can land in several tabs.
      topics: topicsFor(base, item),
      // `places` is filled in after every feed is back, because the name of
      // the local tab isn't settled until we know whether the town's own
      // publisher answered.
    });
    if (articles.length >= PER_SOURCE_LIMIT) break;
  }
  return articles;
}

/* ---- Keeping the feed digestible ----
   A newsroom posting every twenty minutes shouldn't drown out a weekly
   investigation. None of these rules judge an individual story: a daily limit
   per newsroom, a limit on crime-blotter items, and an order that gives every
   newsroom a turn before anyone gets a second slot. ---- */

const PER_SOURCE_PER_DAY = 5;
const BLOTTER_PER_DAY = 2;

// Day in Toronto time, so "today" means what a reader in Newmarket means by it
function dayKey(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
  } catch {
    return "unknown";
  }
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
  ranked.sort((x, y) => x.round - y.round || new Date(y.a.pubDate) - new Date(x.a.pubDate));
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
    places: Array.isArray(a.places) ? a.places : (a.sourcePlace ? [a.sourcePlace] : []),
    image: null,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const townSlug = searchParams.get("town") || DEFAULT_TOWN;
  const rangeKey = (searchParams.get("range") || "today").toLowerCase();
  const days = RANGE_DAYS[rangeKey] || 1;

  // The reader's local tab: their town if it has a publisher, otherwise the
  // region that covers it.
  const town = resolveTown(townSlug);
  let homePlace = town.label;
  let usingRegion = town.usingRegion;

  // The town's own publisher sits alongside the standing list.
  const townSources = (town.feeds || []).map((f) => ({ ...f, place: "home" }));
  const allSources = [...townSources, ...SOURCES];

  const results = await Promise.all(allSources.map((s) => fetchSource(s)));
  const errors = [];
  const live = [];
  for (const r of results) {
    if (Array.isArray(r)) live.push(...r);
    else if (r?.__error) errors.push({ source: r.__error, message: r.message });
  }

  /* If the town's own publisher didn't answer, fall back to the region's — the
     same thing that happens for a town with no publisher at all, just decided
     at request time rather than in the registry. A feed can break for a
     morning; that shouldn't leave someone staring at an empty local tab.

     The tab takes the region's name when this happens, because that is what
     the reader is actually getting. */
  const regionFeeds = town.regionFeeds || [];
  const sameAsTown = (f) => townSources.some((t) => t.urls?.[0] === f.urls?.[0]);
  if (townSources.length && !usingRegion && !live.some((a) => a.sourcePlace === "home")) {
    const spares = regionFeeds.filter((f) => !sameAsTown(f)).map((f) => ({ ...f, place: "home" }));
    if (spares.length) {
      const rescued = await Promise.all(spares.map((s) => fetchSource(s)));
      for (const r of rescued) {
        if (Array.isArray(r)) live.push(...r);
        else if (r?.__error) errors.push({ source: r.__error, message: r.message });
      }
      if (live.some((a) => a.sourcePlace === "home")) {
        homePlace = town.regionName;
        usingRegion = true;
      }
    }
  }

  // Now that the local tab's name is settled, work out where each story belongs.
  for (const a of live) a.places = placesFor(a, a.sourcePlace, homePlace);

  // Put today's catch in the archive before anything is filtered away, so the
  // record is of what was published, not of what fitted on the page.
  let archived = { written: 0 };
  if (archiveEnabled()) {
    archived = await appendToday(live.filter((a) => a.sourcePlace !== "home"), "shared");
    if (townSources.length) {
      await appendToday(live.filter((a) => a.sourcePlace === "home"), town.slug);
    }
    // Clearing out old files costs nothing here and keeps the archive bounded.
    if (Math.random() < 0.1) await trim();
  }

  // For a week or month view, bring back what the publishers' feeds have
  // already forgotten.
  let older = [];
  let archiveDays = 0;
  if (days > 1 && archiveEnabled()) {
    const colorBySource = new Map(allSources.map((s) => [s.name, s.color]));
    const [shared, local] = await Promise.all([
      readBack(days, "shared"),
      townSources.length ? readBack(days, town.slug) : Promise.resolve({ articles: [], days: 0 }),
    ]);
    /* Archived stories are re-tagged with today's rules, not the ones in
       force when they were saved — otherwise a rule change (a new chip, a
       wider topic) would only ever reach new stories. Topics a story was
       saved with are kept, since the feed categories behind some of them
       aren't in the archive; places are worked out again from scratch.
       "National" was the old name for the Canada place. */
    older = [...shared.articles, ...local.articles].map((a) => {
      const r = rehydrate(a, colorBySource);
      const src = r.sourcePlace === "National" ? "Canada" : r.sourcePlace;
      r.places = placesFor(r, src, homePlace);
      r.topics = [...new Set([...(r.topics || []), ...topicsFor(r, null)])];
      return r;
    });
    archiveDays = Math.max(shared.days, local.days);
  }

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
  const windowStart = Date.now() - (days + 1) * 86400000;
  const inWindow = (a) => {
    const t = new Date(a.pubDate).getTime();
    return Number.isFinite(t) ? t >= windowStart : true;   // undated: keep
  };
  articles = articles.filter(inWindow);

  articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  // 1. fold stories several newsrooms covered into a single card
  articles = clusterStories(articles);
  // 2. no newsroom gets more than PER_SOURCE_PER_DAY stories on any given day
  articles = capPerDay(articles, (a) => a.source, PER_SOURCE_PER_DAY);
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
    archive: { enabled: archiveEnabled(), days: archiveDays, written: archived.written || 0 },
  };

  // If every source failed, say so and don't let the CDN keep this empty result.
  if (articles.length === 0) {
    return Response.json(body, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  return Response.json(body, {
    headers: {
      // Only Vercel's CDN reads this one.
      "Vercel-CDN-Cache-Control": CDN_CACHE,
      // Browsers: always check back with the server instead of reusing an old copy.
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
