/* ---- Turning a publisher's items into stories ----
   One function, used by the live feed and by the background collector, so a
   story is judged the same way whether a reader asked for it this second or
   the collector picked it up at 4am: the same filters, the same labels, the
   same topics. Places are not decided here — they depend on which town the
   reader has chosen, so they are worked out when the feed is assembled. */

import { isPaywalled, shouldSkip, isOpinion } from "./filters";
import { topicsFor } from "./topics";

export function stripHtml(html) {
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

export function extractImage(item) {
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

/* `limit` caps how many stories one source contributes before any date
   window is applied — see PER_SOURCE_LIMIT in the feed route. A story with
   no date at all gets `undatedAs` (the time we first saw it), never "now":
   stamping it "now" on every load kept undated stories permanently at the
   top of Today. */
export function buildArticles(src, items, { limit = 40, undatedAs } = {}) {
  const articles = [];
  for (const item of (items || []).slice(0, Math.max(limit, 40))) {
    const raw = item.contentSnippet || item.content || item.description || "";
    const base = {
      title: stripHtml(item.title || ""),
      link: item.link || "",
      description: stripHtml(raw).slice(0, 320),
      pubDate: item.isoDate || item.pubDate || undatedAs || new Date().toISOString(),
      undated: !(item.isoDate || item.pubDate),
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
      // What the story is about — worked out per article, so one newsroom's
      // output can land in several topic tabs.
      topics: topicsFor(base, item),
    });
    if (articles.length >= limit) break;
  }
  return articles;
}
