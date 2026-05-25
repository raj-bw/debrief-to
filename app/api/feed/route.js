import Parser from "rss-parser";

export const dynamic = "force-static";
export const revalidate = 1800;

const SOURCES = [
  { name: "The Narwhal",     urls: ["https://thenarwhal.ca/feed/"],                                                                                                       color: "#2D6A4F", tag: "Environment & Policy", category: "Environment" },
  { name: "The Trillium",    urls: ["https://www.thetrillium.ca/local/feed", "https://www.thetrillium.ca/feed", "https://www.thetrillium.ca/rss"],                          color: "#7B2D8E", tag: "Ontario Politics",     category: "Politics" },
  { name: "Spacing Toronto", urls: ["https://spacing.ca/toronto/feed/"],                                                                                                    color: "#0F2E4A", tag: "Urban Issues",         category: "Toronto" },
  { name: "The Walrus",      urls: ["https://thewalrus.ca/feed/"],                                                                                                          color: "#D4872C", tag: "Current Affairs",      category: "Current Affairs" },
  { name: "Newmarket Today", urls: ["https://www.newmarkettoday.ca/local/feed", "https://www.newmarkettoday.ca/feed/local-news.xml", "https://www.newmarkettoday.ca/rss"],  color: "#1A73E8", tag: "Local News",           category: "Local" },
  { name: "thelocal.to",     urls: ["https://thelocal.to/feed/"],                                                                                                           color: "#3A9B7A", tag: "Local News",           category: "Local" },
  { name: "CBC Toronto",     urls: ["https://www.cbc.ca/cmlink/rss-canada-toronto", "https://www.cbc.ca/webfeed/rss/rss-canada-toronto"],                                   color: "#E03C31", tag: "Major Outlet",         category: "Major Outlets" },
  { name: "Toronto Star",    urls: ["https://www.thestar.com/search/?f=rss&t=article&c=news%2Fgta*&l=20&s=start_time&sd=desc", "https://www.thestar.com/feeds.articles.gta.rss"], color: "#003DA5", tag: "Major Outlet",     category: "Major Outlets" },
  { name: "Globe & Mail",    urls: ["https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/canada/"],                                                              color: "#1C1C1C", tag: "Major Outlet",         category: "Major Outlets" },
  { name: "Toronto Sun",     urls: ["https://torontosun.com/category/news/local-news/feed/", "https://torontosun.com/feed/"],                                               color: "#DA1A32", tag: "Major Outlet",         category: "Major Outlets" },
];

const parser = new Parser({
  timeout: 12000,
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

// Newmarket Today syndicates national/world wire stories — only keep local content
const NEWMARKET_LOCAL_PATHS = ["/local-news/", "/columns/", "/adopt-me/", "/local-sports/", "/local-entertainment/"];
function isLocalNewmarket(link) {
  return NEWMARKET_LOCAL_PATHS.some((p) => link.includes(p));
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
          image: extractImage(item),
        };
      });
      // Filter Newmarket Today to local-only articles
      if (src.name === "Newmarket Today") {
        articles = articles.filter((a) => isLocalNewmarket(a.link));
      }
      return articles.slice(0, 20);
    } catch (err) {
      lastErr = err;
      console.warn(`[debrief.to] ${src.name} ${url} -> ${err.message}`);
    }
  }
  return { __error: src.name, message: lastErr?.message || "all candidate URLs failed" };
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
  return Response.json(
    { articles, errors, fetchedAt: new Date().toISOString(), sourceCount: SOURCES.length },
    { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } }
  );
}
