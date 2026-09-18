import Parser from "rss-parser";

// Run this route on every request that reaches the server, and let Vercel's CDN
// hold a short-lived copy instead. (It used to be "force-static" + revalidate,
// which served weeks-old articles to the first visitor after a quiet stretch.)
export const dynamic = "force-dynamic";

// How long Vercel's CDN may reuse a copy of the feed:
//   - fresh for 10 minutes
//   - then up to 20 more minutes it may serve the old copy while it fetches a new one
// After 30 minutes with no visitors, the next visitor waits a few seconds for fresh articles.
const CDN_CACHE = "public, s-maxage=600, stale-while-revalidate=1200";

// How many articles any one source may contribute. Busy newsrooms like CBC
// used to fill the page on their own; this keeps the mix readable.
const PER_SOURCE_LIMIT = 8;

const SOURCES = [
  // --- Newmarket / York ---
  { name: "Newmarket Today", urls: ["https://www.newmarkettoday.ca/local/feed", "https://www.newmarkettoday.ca/feed/local-news.xml", "https://www.newmarkettoday.ca/rss"], color: "#1A73E8", tag: "Newmarket" },
  // --- Toronto ---
  { name: "CBC Toronto",     urls: ["https://www.cbc.ca/cmlink/rss-canada-toronto", "https://www.cbc.ca/webfeed/rss/rss-canada-toronto"], color: "#E03C31", tag: "Toronto" },
  { name: "TorontoToday",    urls: ["https://www.torontotoday.ca/local/feed", "https://www.torontotoday.ca/feed", "https://www.torontotoday.ca/rss"], color: "#0F7B6C", tag: "Toronto" },
  { name: "The Green Line",  urls: ["https://thegreenline.to/feed/", "https://thegreenline.to/rss"], color: "#4C8C2B", tag: "Community" },
  { name: "thelocal.to",     urls: ["https://thelocal.to/feed/"], color: "#3A9B7A", tag: "City Life" },
  { name: "Spacing Toronto", urls: ["https://spacing.ca/toronto/feed/"], color: "#0F2E4A", tag: "Urbanism" },
  { name: "Toronto Star",    urls: ["https://www.thestar.com/search/?f=rss&t=article&c=news%2Fgta*&l=20&s=start_time&sd=desc", "https://www.thestar.com/feeds.articles.gta.rss"], color: "#003DA5", tag: "Toronto" },
  // --- Ontario ---
  { name: "The Trillium",    urls: ["https://www.thetrillium.ca/local/feed", "https://www.thetrillium.ca/feed", "https://www.thetrillium.ca/rss"], color: "#7B2D8E", tag: "Ontario Politics" },
  { name: "The Narwhal",     urls: ["https://thenarwhal.ca/feed/"], color: "#2D6A4F", tag: "Environment" },
  // --- National reporting ---
  { name: "National Observer", urls: ["https://www.nationalobserver.com/front/rss", "https://www.nationalobserver.com/rss.xml"], color: "#0B7285", tag: "Climate & Politics" },
  { name: "The Breach",      urls: ["https://breachmedia.ca/feed/"], color: "#1565C0", tag: "Investigative" },
  { name: "IJF",             urls: ["https://theijf.org/rss.xml", "https://theijf.org/feed", "https://theijf.org/rss"], color: "#8B5E00", tag: "Investigative" },
  { name: "Ricochet",        urls: ["https://ricochet.media/feed/", "https://ricochet.media/en/feed"], color: "#B3261E", tag: "Public Interest" },
  { name: "The Maple",       urls: ["https://www.readthemaple.com/rss/", "https://readthemaple.com/rss/"], color: "#A8324A", tag: "Labour & Politics" },
  { name: "Canadaland",      urls: ["https://www.canadaland.com/feed/"], color: "#C62828", tag: "Media Watch" },
  { name: "The Walrus",      urls: ["https://thewalrus.ca/feed/", "https://thewalrus.ca/feed/?type=rss2", "https://thewalrus.ca/rss"], color: "#D4872C", tag: "Current Affairs" },
];

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
  },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail"],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

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
    .replace(/\s+/g, " ")
    .trim();
}

function extractImage(item) {
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

/* ---- What gets left out, and what gets labelled ----
   The goal is straight local reporting, so two kinds of item are dropped:
   opinion columns dressed as news (Postmedia writes them as "SURNAME: ...")
   and a newsroom's own housekeeping posts. Commentary from sources that are
   openly analytical is kept, but labelled "Opinion" so readers can tell. ---- */

// Sections we never want, by source
// Village Media pipes Canadian Press wire copy through its local feeds.
const WIRE_PATHS = ["/national-news/", "/world-news/", "/canada-news/", "/beyond-local/", "/national/", "/world/"];

const SKIP_PATHS = {
  // Toronto Sun was removed as a source in Sept 2026 — too much tabloid copy.
  // These rules stay as a pattern for any future tabloid-style source.
  "Canadaland": ["/live/"],
  // Wire copy, not Toronto reporting
  "TorontoToday": WIRE_PATHS,
  // Sports and the daily weather post aren't what people come here for
  "Toronto Star": ["/sports/", "/life/", "/entertainment/"],
  // Audio and video clips rather than articles
  "CBC Toronto": ["/player/"],
  // Council coverage for other Ontario towns (Barrie, Milton, Springwater...)
  "The Trillium": ["/municipalities-newsletter/"],
};

// Headlines we never want, by source
const SKIP_TITLES = {
  // Postmedia columns: "WARMINGTON: ...", "MANDEL: ..."
  "Toronto Sun": [/^[A-Z][A-Z'’.\-]{2,}(?:\s+[A-Z][A-Z'’.\-]{2,})?\s*:/],
  // The daily weather post
  "Toronto Star": [/forecast:/i, /^weather:/i],
  // Canadaland's own notices rather than reporting
  "Canadaland": [
    /^apply for/i, /fellowship/i, /live call-?in/i, /live event/i,
    /transparency report/i, /artificial intelligence policy/i,
    /corrections and clarifications/i, /^retraction and apology/i,
  ],
};

/* Which individual articles actually need a subscription.
   The Trillium publishes free stories under /news/ and subscriber stories
   under /insider-news/ and /trillium-insiders/, so we can tell them apart
   from the link alone. Toronto Star meters nearly everything, so there the
   label applies to the source as a whole. */
const PAYWALL_PATHS = {
  "The Trillium": ["/insider-news/", "/trillium-insiders/"],
};
const PAYWALL_EVERYTHING = ["Toronto Star"];

function isPaywalled(src, link) {
  if (PAYWALL_EVERYTHING.includes(src.name)) return true;
  const paths = PAYWALL_PATHS[src.name] || [];
  const path = link.replace(/^https?:\/\/[^/]+/, "").toLowerCase();
  return paths.some((p) => path.startsWith(p));
}

// Anything matching these is kept but labelled "Opinion"
const OPINION_PATHS = ["/opinion/", "/opinions/", "/commentary/", "/editorial/"];
const OPINION_TITLES = [/^op-?ed\b/i, /^opinion\b/i, /^editorial\b/i, /^analysis\b/i, /^column\b/i];

function pathOf(link) {
  return link.replace(/^https?:\/\/[^/]+/, "").toLowerCase();
}

function shouldSkip(src, article) {
  const path = pathOf(article.link);
  if ((SKIP_PATHS[src.name] || []).some((p) => path.includes(p))) return true;
  if ((SKIP_TITLES[src.name] || []).some((re) => re.test(article.title))) return true;
  return false;
}

function isOpinion(article) {
  const path = pathOf(article.link);
  return OPINION_PATHS.some((p) => path.includes(p)) || OPINION_TITLES.some((re) => re.test(article.title));
}

// Newmarket Today carries local reporting plus syndicated national/world wire copy.
// We drop the wire sections and keep everything else, so local stories aren't lost.
const NEWMARKET_WIRE_PATHS = [
  "/beyond-local/", "/ontario-news/", "/canada-news/", "/world-news/",
  "/national-", "/national/", "/world/", "/canada/", "/sports-news/",
  "/entertainment-news/", "/business-news/", "/auto-news/", "/lifestyle/",
];
function isLocalNewmarket(link) {
  const path = link.replace(/^https?:\/\/[^/]+/, "").toLowerCase();
  return !NEWMARKET_WIRE_PATHS.some((p) => path.startsWith(p));
}

async function fetchSource(src) {
  let lastErr = null;
  for (const url of src.urls) {
    try {
      const feed = await parser.parseURL(url);
      let articles = (feed.items || []).slice(0, 40).map((item) => {
        const raw = item.contentSnippet || item.content || item.description || "";
        const description = stripHtml(raw).slice(0, 320);
        return {
          title: stripHtml(item.title || ""),
          link: item.link || "",
          description,
          pubDate: item.isoDate || item.pubDate || new Date().toISOString(),
          source: src.name,
          sourceColor: src.color,
          tag: src.tag,
          paywall: isPaywalled(src, item.link || ""), // this particular article needs a subscription
          image: extractImage(item),
        };
      });
      // Filter Newmarket Today to local-only articles
      if (src.name === "Newmarket Today") {
        articles = articles.filter((a) => isLocalNewmarket(a.link));
      }
      // Leave out columns and newsroom housekeeping, and label the commentary we keep
      articles = articles
        .filter((a) => !shouldSkip(src, a))
        .map((a) => ({ ...a, opinion: isOpinion(a) }));
      return articles.slice(0, PER_SOURCE_LIMIT);
    } catch (err) {
      lastErr = err;
      console.warn(`[debrief.to] ${src.name} ${url} -> ${err.message}`);
    }
  }
  return { __error: src.name, message: lastErr?.message || "all candidate URLs failed" };
}

/* ---- Keeping the feed digestible ----
   A newsroom posting every twenty minutes shouldn't drown out a weekly
   investigation. Three rules do the work, and none of them judge an
   individual story: a daily limit per newsroom, a limit on crime-blotter
   items, and an order that gives every newsroom a turn before anyone gets
   a second slot. ---- */

const PER_SOURCE_PER_DAY = 3;
const BLOTTER_PER_DAY = 2;

// Day in Toronto time, so "today" means what a reader in Newmarket means by it
function dayKey(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
  } catch {
    return "unknown";
  }
}

const BLOTTER_PATHS = ["/police-beat/", "/crime/", "/police/"];
const BLOTTER_TITLE = /\b(charged|police say|arrested|homicide|stabb\w+|fatally shot|dead after|body found)\b/i;
function isBlotter(a) {
  const path = (a.link || "").replace(/^https?:\/\/[^/]+/, "").toLowerCase();
  return BLOTTER_PATHS.some((p) => path.includes(p)) || BLOTTER_TITLE.test(a.title || "");
}

// Keep at most `max` items per day for each key (list must already be newest first)
function capPerDay(list, keyOf, max) {
  const seen = new Map();
  return list.filter((a) => {
    const key = keyOf(a) + "|" + dayKey(a.pubDate);
    if (key.startsWith("null|")) return true;
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
    if (swapWith === -1) break; // nothing left from another source
    const [moved] = list.splice(swapWith, 1);
    list.splice(i, 0, moved);
  }
  return list;
}

export async function GET() {
  const results = await Promise.all(SOURCES.map(fetchSource));
  const errors = [];
  const articles = [];
  for (const r of results) {
    if (Array.isArray(r)) articles.push(...r);
    else if (r?.__error) errors.push({ source: r.__error, message: r.message });
  }
  articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  // 1. no newsroom gets more than PER_SOURCE_PER_DAY stories on any given day
  let shortlist = capPerDay(articles, (a) => a.source, PER_SOURCE_PER_DAY);
  // 2. crime-blotter items are capped for the whole feed, not per source
  const blotterKept = capPerDay(shortlist.filter(isBlotter), () => "blotter", BLOTTER_PER_DAY);
  const blotterSet = new Set(blotterKept.map((a) => a.link));
  shortlist = shortlist.filter((a) => !isBlotter(a) || blotterSet.has(a.link));
  // 3. every newsroom gets a turn before anyone gets a second slot
  shortlist = fairShare(shortlist);
  spreadOutSources(shortlist);
  articles.length = 0;
  articles.push(...shortlist);
  const body = { articles, errors, fetchedAt: new Date().toISOString(), sourceCount: SOURCES.length };

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
