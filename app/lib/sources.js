/* The standing source list: everything that isn't tied to the reader's own
   town. The town's own publisher is added on top of this, and comes from the
   registry in app/lib/towns.js. Shared by the live feed and the background
   collector, so both carry exactly the same list.

   `place` is where a newsroom's patch is. It decides which place tab a story
   lands in by default, and which newsroom wins when several cover the same
   story — the most local one was there. */
const STANDING = [
  // --- Toronto ---
  { name: "CBC Toronto",     urls: ["https://www.cbc.ca/cmlink/rss-canada-toronto", "https://www.cbc.ca/webfeed/rss/rss-canada-toronto"], color: "#E03C31", place: "Toronto" },
  { name: "TorontoToday",    urls: ["https://www.torontotoday.ca/rss/local", "https://www.torontotoday.ca/rss/local-news", "https://www.torontotoday.ca/rss"], color: "#0F7B6C", place: "Toronto", kind: "village" },
  { name: "The Green Line",  urls: ["https://thegreenline.to/feed/", "https://thegreenline.to/rss"], color: "#4C8C2B", place: "Toronto" },
  { name: "thelocal.to",     urls: ["https://thelocal.to/feed/"], color: "#3A9B7A", place: "Toronto" },
  { name: "Spacing Toronto", urls: ["https://spacing.ca/toronto/feed/"], color: "#0F2E4A", place: "Toronto" },
  { name: "Toronto Star",    urls: ["https://www.thestar.com/search/?f=rss&t=article&c=news%2Fgta*&l=20&s=start_time&sd=desc"], color: "#003DA5", place: "Toronto" },
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

// `shared` puts every standing source on one archive shelf: every reader's
// feed includes all of them, so one read serves them all.
export const SOURCES = STANDING.map((s) => ({ ...s, shared: true }));
