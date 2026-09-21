/* ---- The town registry ----
   Debrief.TO defaults to Newmarket, the town it was built for. A reader can
   pick their own town instead; that choice lives in their browser and never
   reaches us.

   Every town points at a region. If a town has no publisher of its own, its
   news comes from the region's publisher and the tab is named after the
   region — "York Region" rather than "Aurora". That is deliberate: it is
   honest about where the reporting is actually coming from.

   Adding a town is editing this file. Nothing else needs to change. ---- */

// Village Media runs local news sites across Ontario on the same software, so
// their feeds follow one URL pattern. The extra URLs are fallbacks: the feed
// route tries each in turn and gives up quietly if none answer.
function villageMedia(name, host, color) {
  return {
    name,
    urls: [`https://www.${host}/local/feed`, `https://www.${host}/feed`, `https://www.${host}/rss`],
    color,
    kind: "village", // these carry syndicated wire copy that gets filtered out
  };
}

// Not every town is a Village Media town. This is for everyone else.
function feed(name, urls, color) {
  return { name, urls, color };
}

/* ---- Regions ----
   A region's feeds are the fallback for every town inside it that has no
   publisher of its own. ---- */
export const REGIONS = {
  "york-region": {
    name: "York Region",
    feeds: [villageMedia("Newmarket Today", "newmarkettoday.ca", "#1A73E8")],
  },
  toronto: {
    name: "Toronto",
    feeds: [villageMedia("TorontoToday", "torontotoday.ca", "#0F7B6C")],
  },
  "simcoe-county": {
    name: "Simcoe County",
    feeds: [villageMedia("Barrie Today", "barrietoday.com", "#B5651D")],
  },
  "waterloo-region": {
    name: "Waterloo Region",
    // Kitchener Today's feed is serving malformed XML (an attribute with no
    // value, which stops any strict parser dead). That's theirs to fix, so the
    // region leans on Cambridge Today, which answers fine.
    feeds: [villageMedia("Cambridge Today", "cambridgetoday.ca", "#6B4AA8")],
  },
  "niagara-region": {
    name: "Niagara Region",
    feeds: [villageMedia("Thorold News", "thoroldnews.com", "#1F7A8C")],
  },
  "wellington-county": {
    name: "Wellington County",
    feeds: [villageMedia("Guelph Today", "guelphtoday.com", "#8C2F39")],
  },
  "greater-sudbury": {
    name: "Greater Sudbury",
    feeds: [villageMedia("Sudbury.com", "sudbury.com", "#2E5E4E")],
  },
  "algoma-district": {
    name: "Algoma District",
    feeds: [villageMedia("SooToday", "sootoday.com", "#3D5A80")],
  },
  "nipissing-district": {
    name: "Nipissing District",
    feeds: [villageMedia("BayToday", "baytoday.ca", "#1D6A96")],
  },
  "cochrane-district": {
    name: "Cochrane District",
    feeds: [villageMedia("TimminsToday", "timminstoday.com", "#7A4E2D")],
  },
  ottawa: {
    name: "Ottawa",
    // ottawamatters.com is a Rogers site, not a Village Media one, so it has no
    // /local/feed — it answered with something that wasn't RSS at all. CBC
    // Ottawa is the free, credible equivalent, and the same shape of feed we
    // already use for Toronto.
    feeds: [feed("CBC Ottawa", ["https://www.cbc.ca/cmlink/rss-canada-ottawa", "https://www.cbc.ca/webfeed/rss/rss-canada-ottawa"], "#A63D40")],
  },
};

/* ---- Towns ----
   `feeds: null` means no publisher of its own — the region carries it.
   Towns listed without a publisher still appear in the picker, greyed out,
   so a reader can see their town is known about and what they'll get. ---- */
export const TOWNS = [
  // --- York Region ---
  { slug: "newmarket", name: "Newmarket", region: "york-region", feeds: [villageMedia("Newmarket Today", "newmarkettoday.ca", "#1A73E8")] },
  { slug: "aurora", name: "Aurora", region: "york-region", feeds: null },
  { slug: "richmond-hill", name: "Richmond Hill", region: "york-region", feeds: null },
  { slug: "markham", name: "Markham", region: "york-region", feeds: null },
  { slug: "vaughan", name: "Vaughan", region: "york-region", feeds: null },
  { slug: "king", name: "King City", region: "york-region", feeds: null },
  { slug: "east-gwillimbury", name: "East Gwillimbury", region: "york-region", feeds: null },
  { slug: "georgina", name: "Georgina", region: "york-region", feeds: null },
  { slug: "whitchurch-stouffville", name: "Whitchurch-Stouffville", region: "york-region", feeds: null },

  // --- Toronto ---
  { slug: "toronto", name: "Toronto", region: "toronto", feeds: [villageMedia("TorontoToday", "torontotoday.ca", "#0F7B6C")] },
  { slug: "scarborough", name: "Scarborough", region: "toronto", feeds: null },
  { slug: "etobicoke", name: "Etobicoke", region: "toronto", feeds: null },
  { slug: "north-york", name: "North York", region: "toronto", feeds: null },

  // --- Simcoe County ---
  { slug: "barrie", name: "Barrie", region: "simcoe-county", feeds: [villageMedia("Barrie Today", "barrietoday.com", "#B5651D")] },
  { slug: "bradford", name: "Bradford West Gwillimbury", region: "simcoe-county", feeds: [villageMedia("Bradford Today", "bradfordtoday.ca", "#C46A3A")] },
  { slug: "innisfil", name: "Innisfil", region: "simcoe-county", feeds: [villageMedia("Innisfil Today", "innisfiltoday.ca", "#A85A2B")] },
  { slug: "orillia", name: "Orillia", region: "simcoe-county", feeds: [villageMedia("Orillia Matters", "orilliamatters.com", "#96551F")] },
  { slug: "collingwood", name: "Collingwood", region: "simcoe-county", feeds: [villageMedia("Collingwood Today", "collingwoodtoday.ca", "#8A5E3C")] },
  { slug: "midland", name: "Midland", region: "simcoe-county", feeds: [villageMedia("Midland Today", "midlandtoday.ca", "#7D5A41")] },

  // --- Waterloo Region & Wellington ---
  { slug: "kitchener", name: "Kitchener", region: "waterloo-region", feeds: [villageMedia("Kitchener Today", "kitchenertoday.com", "#5B3E96")] },
  { slug: "cambridge", name: "Cambridge", region: "waterloo-region", feeds: [villageMedia("Cambridge Today", "cambridgetoday.ca", "#6B4AA8")] },
  { slug: "waterloo", name: "Waterloo", region: "waterloo-region", feeds: null },
  { slug: "guelph", name: "Guelph", region: "wellington-county", feeds: [villageMedia("Guelph Today", "guelphtoday.com", "#8C2F39")] },

  // --- Niagara ---
  { slug: "thorold", name: "Thorold", region: "niagara-region", feeds: [villageMedia("Thorold News", "thoroldnews.com", "#1F7A8C")] },
  { slug: "st-catharines", name: "St. Catharines", region: "niagara-region", feeds: null },
  { slug: "niagara-falls", name: "Niagara Falls", region: "niagara-region", feeds: null },
  { slug: "welland", name: "Welland", region: "niagara-region", feeds: null },

  // --- Northern Ontario ---
  { slug: "sudbury", name: "Greater Sudbury", region: "greater-sudbury", feeds: [villageMedia("Sudbury.com", "sudbury.com", "#2E5E4E")] },
  { slug: "sault-ste-marie", name: "Sault Ste. Marie", region: "algoma-district", feeds: [villageMedia("SooToday", "sootoday.com", "#3D5A80")] },
  { slug: "north-bay", name: "North Bay", region: "nipissing-district", feeds: [villageMedia("BayToday", "baytoday.ca", "#1D6A96")] },
  { slug: "timmins", name: "Timmins", region: "cochrane-district", feeds: [villageMedia("TimminsToday", "timminstoday.com", "#7A4E2D")] },
  { slug: "elliot-lake", name: "Elliot Lake", region: "algoma-district", feeds: [villageMedia("Elliot Lake Today", "elliotlaketoday.com", "#4A6D8C")] },

  // --- Ottawa ---
  { slug: "ottawa", name: "Ottawa", region: "ottawa", feeds: [feed("CBC Ottawa", ["https://www.cbc.ca/cmlink/rss-canada-ottawa", "https://www.cbc.ca/webfeed/rss/rss-canada-ottawa"], "#A63D40")] },
];

export const DEFAULT_TOWN = "newmarket";

export function getTown(slug) {
  return TOWNS.find((t) => t.slug === slug) || TOWNS.find((t) => t.slug === DEFAULT_TOWN);
}

/* What the local tab is actually called, and where its stories come from.
   A town with its own publisher is named after the town. A town without one
   falls back to its region, and is named after the region, because that is
   what the reader is really getting. */
export function resolveTown(slug) {
  const town = getTown(slug);
  const region = REGIONS[town.region];
  const hasOwn = Array.isArray(town.feeds) && town.feeds.length > 0;
  return {
    slug: town.slug,
    townName: town.name,
    regionName: region?.name || "Ontario",
    // The name shown on the tab
    label: hasOwn ? town.name : (region?.name || "Ontario"),
    usingRegion: !hasOwn,
    feeds: hasOwn ? town.feeds : (region?.feeds || []),
    // Kept separately so the feed route can fall back to the region if a
    // town's own publisher stops answering — a feed that breaks shouldn't
    // leave a reader staring at an empty local tab.
    regionFeeds: region?.feeds || [],
  };
}

// The list the first-visit picker searches. Towns without a publisher say so.
export function townOptions() {
  return TOWNS.map((t) => {
    const region = REGIONS[t.region];
    const hasOwn = Array.isArray(t.feeds) && t.feeds.length > 0;
    return {
      slug: t.slug,
      name: t.name,
      hasOwn,
      regionName: region?.name || "Ontario",
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
