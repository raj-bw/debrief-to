import PLACES from "./ontario-places.json";

/* ---- Where the reader lives ----
   Two separate things, deliberately kept apart:

   1. WHICH PLACES EXIST. Every municipality in Ontario — 413 of them — with
      the census division it belongs to. This is public record, it barely
      changes, and it ships as a file (app/lib/ontario-places.json, 8 KB).
      No API, no key, no per-keystroke billing, and nothing about the reader
      is sent anywhere to look their town up. That last point matters: the
      About page promises their town never leaves their browser, and a
      third-party autocomplete would quietly break that promise.

   2. WHO COVERS THEM. Which newsroom actually reports on a place. Nobody
      publishes this — it is editorial work, and it is the part that is
      genuinely ours. It lives below, and it grows as we add outlets.

   A reader's local news is resolved in three steps, most specific first:
     their town's own paper  →  their region's paper  →  nothing local.

   The third case is real and we say so rather than showing an empty tab.
   It also tells us where to add a publisher next. ---- */

// Village Media runs local news sites across Ontario on the same software,
// so their feeds follow one URL pattern. The extra URLs are fallbacks.
function villageMedia(name, host, color) {
  return {
    name,
    urls: [`https://www.${host}/local/feed`, `https://www.${host}/feed`, `https://www.${host}/rss`],
    color,
    kind: "village", // these carry syndicated wire copy that gets filtered out
  };
}

function feed(name, urls, color) {
  return { name, urls, color };
}

/* Towns with a newsroom of their own, keyed by the municipality's exact name
   as it appears in ontario-places.json. */
const TOWN_FEEDS = {
  "Newmarket": [villageMedia("Newmarket Today", "newmarkettoday.ca", "#1A73E8")],
  "Toronto": [villageMedia("TorontoToday", "torontotoday.ca", "#0F7B6C")],
  "Barrie": [villageMedia("Barrie Today", "barrietoday.com", "#B5651D")],
  "Bradford West Gwillimbury": [villageMedia("Bradford Today", "bradfordtoday.ca", "#C46A3A")],
  "Innisfil": [villageMedia("Innisfil Today", "innisfiltoday.ca", "#A85A2B")],
  "Orillia": [villageMedia("Orillia Matters", "orilliamatters.com", "#96551F")],
  "Collingwood": [villageMedia("Collingwood Today", "collingwoodtoday.ca", "#8A5E3C")],
  "Midland": [villageMedia("Midland Today", "midlandtoday.ca", "#7D5A41")],
  "Cambridge": [villageMedia("Cambridge Today", "cambridgetoday.ca", "#6B4AA8")],
  // Kitchener Today serves malformed XML at source. It stays as their first
  // choice in case they fix it; if it fails the region picks Kitchener up.
  "Kitchener": [villageMedia("Kitchener Today", "kitchenertoday.com", "#5B3E96")],
  "Guelph": [villageMedia("Guelph Today", "guelphtoday.com", "#8C2F39")],
  "Thorold": [villageMedia("Thorold News", "thoroldnews.com", "#1F7A8C")],
  "Greater Sudbury": [villageMedia("Sudbury.com", "sudbury.com", "#2E5E4E")],
  "Sault Ste. Marie": [villageMedia("SooToday", "sootoday.com", "#3D5A80")],
  "North Bay": [villageMedia("BayToday", "baytoday.ca", "#1D6A96")],
  "Timmins": [villageMedia("TimminsToday", "timminstoday.com", "#7A4E2D")],
  "Elliot Lake": [villageMedia("Elliot Lake Today", "elliotlaketoday.com", "#4A6D8C")],
  // ottawamatters.com is a Rogers site, not a Village Media one, and has no
  // /local/feed. CBC Ottawa is the free, credible equivalent.
  "Ottawa": [feed("CBC Ottawa", ["https://www.cbc.ca/cmlink/rss-canada-ottawa", "https://www.cbc.ca/webfeed/rss/rss-canada-ottawa"], "#A63D40")],
};

/* Regions with a newsroom that covers the whole area. Keyed by census
   division, so every municipality in that division inherits it. `label` is
   what the tab is called, because "York" on its own means little. */
const DIVISION_FEEDS = {
  "York": { label: "York Region", feeds: [villageMedia("Newmarket Today", "newmarkettoday.ca", "#1A73E8")] },
  "Toronto": { label: "Toronto", feeds: [villageMedia("TorontoToday", "torontotoday.ca", "#0F7B6C")] },
  "Simcoe": { label: "Simcoe County", feeds: [villageMedia("Barrie Today", "barrietoday.com", "#B5651D")] },
  "Waterloo": { label: "Waterloo Region", feeds: [villageMedia("Cambridge Today", "cambridgetoday.ca", "#6B4AA8")] },
  "Wellington": { label: "Wellington County", feeds: [villageMedia("Guelph Today", "guelphtoday.com", "#8C2F39")] },
  "Niagara": { label: "Niagara Region", feeds: [villageMedia("Thorold News", "thoroldnews.com", "#1F7A8C")] },
  "Greater Sudbury": { label: "Greater Sudbury", feeds: [villageMedia("Sudbury.com", "sudbury.com", "#2E5E4E")] },
  "Algoma": { label: "Algoma District", feeds: [villageMedia("SooToday", "sootoday.com", "#3D5A80")] },
  "Nipissing": { label: "Nipissing District", feeds: [villageMedia("BayToday", "baytoday.ca", "#1D6A96")] },
  "Cochrane": { label: "Cochrane District", feeds: [villageMedia("TimminsToday", "timminstoday.com", "#7A4E2D")] },
  "Ottawa": { label: "Ottawa", feeds: [feed("CBC Ottawa", ["https://www.cbc.ca/cmlink/rss-canada-ottawa", "https://www.cbc.ca/webfeed/rss/rss-canada-ottawa"], "#A63D40")] },
};

export const DEFAULT_TOWN = "newmarket";

export function slugify(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* Readers who chose a town under the old hand-written registry keep their
   choice: these are the few slugs whose spelling changed, plus Toronto's
   former boroughs, which are not municipalities of their own. */
const ALIASES = {
  "sudbury": "greater-sudbury",
  "bradford": "bradford-west-gwillimbury",
  "scarborough": "toronto",
  "etobicoke": "toronto",
  "north-york": "toronto",
  "east-york": "toronto",
};

// name -> division, built once
const BY_SLUG = new Map();
for (const [name, divisionIndex] of PLACES.places) {
  BY_SLUG.set(slugify(name), { name, division: PLACES.divisions[divisionIndex] });
}

export function getPlace(slug) {
  const key = ALIASES[slug] || slug;
  return BY_SLUG.get(key) || BY_SLUG.get(DEFAULT_TOWN) || null;
}

/* What the reader's local tab is called and where its stories come from.

   tier:
     "town"     their own municipality has a newsroom
     "region"   the region's newsroom covers them, and the tab says so
     "province" no local newsroom yet — there is no local tab at all, which is
                honest, rather than a tab that is always empty */
export function resolveTown(slug) {
  const place = getPlace(slug);
  if (!place) {
    return { slug: DEFAULT_TOWN, townName: "Newmarket", label: "Newmarket", tier: "town", hasLocal: true, usingRegion: false, regionName: "York Region", feeds: TOWN_FEEDS["Newmarket"], regionFeeds: DIVISION_FEEDS["York"].feeds };
  }
  const division = DIVISION_FEEDS[place.division];
  const regionName = division?.label || place.division;
  const own = TOWN_FEEDS[place.name];

  if (own) {
    return {
      slug: slugify(place.name), townName: place.name, label: place.name,
      tier: "town", hasLocal: true, usingRegion: false,
      regionName, feeds: own, regionFeeds: division?.feeds || [],
    };
  }
  if (division) {
    return {
      slug: slugify(place.name), townName: place.name, label: division.label,
      tier: "region", hasLocal: true, usingRegion: true,
      regionName, feeds: division.feeds, regionFeeds: division.feeds,
    };
  }
  return {
    slug: slugify(place.name), townName: place.name, label: null,
    tier: "province", hasLocal: false, usingRegion: false,
    regionName, feeds: [], regionFeeds: [],
  };
}

/* The list the picker searches: every municipality in Ontario, each saying
   plainly what it will actually give you. */
export function townOptions() {
  const out = [];
  for (const [name, divisionIndex] of PLACES.places) {
    const divisionName = PLACES.divisions[divisionIndex];
    const division = DIVISION_FEEDS[divisionName];
    const own = TOWN_FEEDS[name];
    out.push({
      slug: slugify(name),
      name,
      divisionName,
      tier: own ? "town" : division ? "region" : "province",
      hasOwn: Boolean(own),
      // what the reader will actually read
      sourceName: own ? own[0].name : division ? division.feeds[0].name : null,
      regionName: division?.label || divisionName,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export const PLACE_COUNT = PLACES.places.length;

/* Exposed so /api/health can check every feed we actually rely on, without
   having to know how towns resolve to publishers. */
export function publisherFeeds(scope) {
  const seen = new Map();
  const add = (label, f) => { if (!seen.has(f.name)) seen.set(f.name, { name: `${label} (${f.name})`, urls: f.urls }); };
  if (scope !== "region") {
    for (const [town, feeds] of Object.entries(TOWN_FEEDS)) for (const f of feeds) add(town, f);
  }
  if (scope !== "town") {
    for (const d of Object.values(DIVISION_FEEDS)) for (const f of d.feeds) add(d.label, f);
  }
  return [...seen.values()];
}
