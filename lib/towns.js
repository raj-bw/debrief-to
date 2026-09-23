import PLACES from "./ontario-places.json";
import { PUBLISHERS } from "./publishers";

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
    /* The main /rss is 20 items, and on a typical morning 17 of them are
       Canadian Press wire copy that the filters rightly drop — so it reaches
       back five hours and leaves two or three local stories. Newmarket's tab
       was showing three stories in every range for exactly this reason.
       /rss/local-news is the same 20 items drawn only from local sections,
       reaching back a day and a half. TorontoToday calls its section
       "local". /rss stays last as the fallback. */
    urls: [`https://www.${host}/rss/local-news`, `https://www.${host}/rss/local`, `https://www.${host}/rss`],
    color,
    kind: "village", // these carry syndicated wire copy that gets filtered out
    owner: "Village Media",
  };
}

/* Metroland's portals — DurhamRegion, YorkRegion, Simcoe.com and the rest —
   publish no /feed or /rss at all, which is why an earlier sweep wrote the
   whole chain off. They run on BLOX, whose search endpoint will return its
   results as RSS, and that is a real feed: fresh, complete, and sectionable.

   `c=` scopes it to a section. Every portal files its towns under
   /ontario-communities/<town>, so a town section is a genuine town-level
   feed rather than a region-wide one — which is what makes Ajax or Georgina
   a tier-1 town rather than a reader inheriting the whole region.

   One trap worth recording: each portal advertises an RSS link in its own
   <head>, and on DurhamRegion that advertised feed last published in 2021.
   The advertised feed is not the working feed. These URLs are the ones that
   answered with today's date. */
function metroland(name, host, color, section, owner = "Metroland Media (Torstar)", paywall = false) {
  const q = "f=rss&t=article&l=30&s=start_time&sd=desc";
  const scoped = section ? `${host}/search/?${q}&c=${encodeURIComponent(section)}*` : null;
  return {
    name,
    /* Always scoped to a section, never the bare search. The unscoped feed
       on DurhamRegion came back 24 volunteer listings and 19 GlobeNewswire
       press releases to 7 news stories — 86% of it not reporting at all.
       `c=` is a filter the publisher applies before sending, which beats any
       rule we could write afterwards, so it is the only form we ask for. */
    urls: [
      scoped ? `https://www.${scoped}` : `https://www.${host}/search/?${q}&c=news*`,
      `https://www.${host}/search/?${q}&c=news*`,
    ].filter((u, i, a) => a.indexOf(u) === i),
    color,
    kind: "metroland",
    owner,
    ...(paywall ? { paywall: true } : {}),
  };
}

// A town section on a Metroland portal, named for the town itself.
function metrolandTown(portalName, host, color, section) {
  return metroland(portalName, host, color, section);
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
  /* ---- Metroland town sections (verified 2026-09-22) ----
     Each of these is that town's own section feed on its regional portal,
     so the reader gets their municipality, not the whole region. ---- */
  "Ajax": [metrolandTown("DurhamRegion", "durhamregion.com", "#B03A5B", "ontario-communities/ajax")],
  "Whitby": [metrolandTown("DurhamRegion", "durhamregion.com", "#B03A5B", "ontario-communities/whitby")],
  "Oshawa": [metrolandTown("DurhamRegion", "durhamregion.com", "#B03A5B", "ontario-communities/oshawa")],
  "Pickering": [metrolandTown("DurhamRegion", "durhamregion.com", "#B03A5B", "ontario-communities/pickering")],
  "Clarington": [metrolandTown("DurhamRegion", "durhamregion.com", "#B03A5B", "ontario-communities/clarington")],
  "Uxbridge": [metrolandTown("DurhamRegion", "durhamregion.com", "#B03A5B", "ontario-communities/uxbridge")],
  "Brock": [metrolandTown("DurhamRegion", "durhamregion.com", "#B03A5B", "ontario-communities/brock")],
  "Scugog": [metrolandTown("DurhamRegion", "durhamregion.com", "#B03A5B", "ontario-communities/port-perry")],

  "Aurora": [metrolandTown("YorkRegion.com", "yorkregion.com", "#2B6CB0", "ontario-communities/aurora")],
  "East Gwillimbury": [metrolandTown("YorkRegion.com", "yorkregion.com", "#2B6CB0", "ontario-communities/east-gwillimbury")],
  "Georgina": [metrolandTown("YorkRegion.com", "yorkregion.com", "#2B6CB0", "ontario-communities/georgina")],
  "King": [metrolandTown("YorkRegion.com", "yorkregion.com", "#2B6CB0", "ontario-communities/king")],
  "Markham": [metrolandTown("YorkRegion.com", "yorkregion.com", "#2B6CB0", "ontario-communities/markham")],
  "Richmond Hill": [metrolandTown("YorkRegion.com", "yorkregion.com", "#2B6CB0", "ontario-communities/richmond-hill")],
  "Whitchurch-Stouffville": [metrolandTown("YorkRegion.com", "yorkregion.com", "#2B6CB0", "ontario-communities/stouffville")],
  "Vaughan": [metrolandTown("YorkRegion.com", "yorkregion.com", "#2B6CB0", "ontario-communities/vaughan")],

  "Clearview": [metrolandTown("Simcoe.com", "simcoe.com", "#B5651D", "ontario-communities/stayner")],
  "New Tecumseth": [metrolandTown("Simcoe.com", "simcoe.com", "#B5651D", "ontario-communities/alliston")],
  "Wasaga Beach": [metrolandTown("Simcoe.com", "simcoe.com", "#B5651D", "ontario-communities/wasaga")],

  "Burlington": [metrolandTown("InsideHalton", "insidehalton.com", "#2F7A5A", "ontario-communities/burlington")],
  "Milton": [metrolandTown("InsideHalton", "insidehalton.com", "#2F7A5A", "ontario-communities/milton")],
  "Oakville": [metrolandTown("InsideHalton", "insidehalton.com", "#2F7A5A", "ontario-communities/oakville")],

  "Bracebridge": [metrolandTown("MuskokaRegion", "muskokaregion.com", "#4F7942", "ontario-communities/bracebridge")],
  "Gravenhurst": [metrolandTown("MuskokaRegion", "muskokaregion.com", "#4F7942", "ontario-communities/gravenhurst")],
  "Huntsville": [metrolandTown("MuskokaRegion", "muskokaregion.com", "#4F7942", "ontario-communities/huntsville")],

  "Fort Erie": [metrolandTown("Niagara This Week", "niagarathisweek.com", "#1F7A8C", "ontario-communities/fort-erie")],
  "Grimsby": [metrolandTown("Niagara This Week", "niagarathisweek.com", "#1F7A8C", "ontario-communities/grimsby")],
  "Niagara Falls": [metrolandTown("Niagara This Week", "niagarathisweek.com", "#1F7A8C", "ontario-communities/niagara-falls")],
  "Niagara-on-the-Lake": [metrolandTown("Niagara This Week", "niagarathisweek.com", "#1F7A8C", "ontario-communities/niagara-on-the-lake")],
  "Port Colborne": [metrolandTown("Niagara This Week", "niagarathisweek.com", "#1F7A8C", "ontario-communities/port-colborne")],
  "St. Catharines": [metrolandTown("Niagara This Week", "niagarathisweek.com", "#1F7A8C", "ontario-communities/st-catharines")],
  "Welland": [metrolandTown("Niagara This Week", "niagarathisweek.com", "#1F7A8C", "ontario-communities/welland")],

  "Brighton": [metrolandTown("NorthumberlandNews", "northumberlandnews.com", "#7A4E2D", "ontario-communities/brighton")],
  "Orangeville": [metrolandTown("Orangeville.com", "orangeville.com", "#96551F", "ontario-communities/orangeville")],

  "Smiths Falls": [metrolandTown("InsideOttawaValley", "insideottawavalley.com", "#8A5E9C", "ontario-communities/smiths-falls")],
  "Carleton Place": [metrolandTown("InsideOttawaValley", "insideottawavalley.com", "#8A5E9C", "ontario-communities/carleton-place-almonte")],
  "Mississippi Mills": [metrolandTown("InsideOttawaValley", "insideottawavalley.com", "#8A5E9C", "ontario-communities/carleton-place-almonte")],
  "Renfrew": [metrolandTown("InsideOttawaValley", "insideottawavalley.com", "#8A5E9C", "ontario-communities/renfrew")],
  "Arnprior": [metrolandTown("InsideOttawaValley", "insideottawavalley.com", "#8A5E9C", "ontario-communities/arnprior")],
  "North Grenville": [metrolandTown("InsideOttawaValley", "insideottawavalley.com", "#8A5E9C", "ontario-communities/kemptville")],

  "Brampton": [metroland("Brampton Guardian", "bramptonguardian.com", "#A63D40")],
  "Caledon": [metroland("Caledon Enterprise", "caledonenterprise.com", "#A63D40")],
  "Mississauga": [metroland("Mississauga.com", "mississauga.com", "#A63D40")],
  "Hamilton": [metroland("The Hamilton Spectator", "thespec.com", "#8C2F39", null, "Torstar (NordStar Capital)", true)],
  "Parry Sound": [metroland("ParrySound.com", "parrysound.com", "#3D5A80")],
  "Waterloo": [metroland("Waterloo Chronicle", "waterloochronicle.ca", "#6B4AA8")],

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
  "Durham": { label: "Durham Region", feeds: [metroland("DurhamRegion", "durhamregion.com", "#B03A5B")] },
  "Halton": { label: "Halton Region", feeds: [metroland("InsideHalton", "insidehalton.com", "#2F7A5A")] },
  "Peel": { label: "Peel Region", feeds: [metroland("Mississauga.com", "mississauga.com", "#A63D40")] },
  "Hamilton": { label: "Hamilton", feeds: [metroland("The Hamilton Spectator", "thespec.com", "#8C2F39", null, "Torstar (NordStar Capital)", true)] },
  "Muskoka": { label: "Muskoka", feeds: [metroland("MuskokaRegion", "muskokaregion.com", "#4F7942")] },
  "Dufferin": { label: "Dufferin County", feeds: [metroland("Orangeville.com", "orangeville.com", "#96551F")] },
  "Northumberland": { label: "Northumberland County", feeds: [metroland("NorthumberlandNews", "northumberlandnews.com", "#7A4E2D")] },
  "Lanark": { label: "Lanark County", feeds: [metroland("InsideOttawaValley", "insideottawavalley.com", "#8A5E9C")] },
  "Renfrew": { label: "Renfrew County", feeds: [metroland("InsideOttawaValley", "insideottawavalley.com", "#8A5E9C")] },
  "Leeds and Grenville": { label: "Leeds and Grenville", feeds: [metroland("InsideOttawaValley", "insideottawavalley.com", "#8A5E9C")] },
  "Parry Sound": { label: "Parry Sound District", feeds: [metroland("ParrySound.com", "parrysound.com", "#3D5A80")] },
  "Timiskaming": { label: "Timiskaming District", feeds: [feed("The Temiskaming Speaker", ["https://northernontario.ca/feed", "https://northernontario.ca/rss"], "#5C7A29")] },
  "Frontenac": { label: "Frontenac County", feeds: [feed("Kingstonist", ["https://www.kingstonist.com/feed", "https://www.kingstonist.com/rss"], "#A85A2B")] },
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

/* Toronto is deliberately not a hometown option. Toronto coverage already has
   its own place tab, fed by the standing source list, so offering it here too
   would give a Toronto reader the same city in two chips side by side.
   Anyone who picked it before simply gets no local tab — which is correct,
   because the Toronto tab is their local tab. */
const NOT_A_HOMETOWN = new Set(["toronto", "scarborough", "etobicoke", "north-york", "east-york"]);

export function getPlace(slug) {
  const key = ALIASES[slug] || slug;
  return BY_SLUG.get(key) || BY_SLUG.get(DEFAULT_TOWN) || null;
}

/* ---- Folding in the publisher list ----
   publishers.js says which newsroom serves which towns. Here that becomes
   three lookups, from most local to least:

     TOWN_EXTRA   the town's own paper(s)
     AREA_FEEDS   a paper covering a wider area the town sits in
     DIVISION_FEEDS (above), extended below to every census division that
                  a verified newsroom covers ---- */

// Research names don't always match the official ones: en-dashes versus
// hyphens, "Prince Edward County" for Prince Edward, and so on.
const norm = (n) => String(n).toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
const OFFICIAL = new Map(PLACES.places.map(([name]) => [norm(name), name]));
// The research's names for places whose official name reads differently.
const NAME_FIXES = {
  "prince edward county": "Prince Edward", "norfolk county": "Norfolk",
  "haliburton": "Dysart et al", "lennox and addington": "Greater Napanee",
  "kemptville (north grenville)": "North Grenville", "dundas (part of hamilton)": "Hamilton",
  "flamborough (hamilton)": "Hamilton", "killaloe, hagarty, richards": "Killaloe, Hagarty and Richards",
  "leeds and thousand islands": "Leeds and the Thousand Islands",
  "northeastern manitoulin": "Northeastern Manitoulin and the Islands",
  "st. charles": "St.-Charles", "north shore": "The North Shore",
  "macdonald, meredith": "Macdonald, Meredith and Aberdeen Additional",
};
for (const [k, v] of Object.entries(NAME_FIXES)) OFFICIAL.set(k, v);
const DIVISION_OF = new Map(PLACES.places.map(([name, d]) => [name, PLACES.divisions[d]]));

export const UNMATCHED_SERVES = [];   // surfaced by the tests, never shown to readers

// A steady colour per newsroom, dark enough for text on the light theme.
function colorFor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = h % 360, sat = 0.5, light = 0.36;
  const k = (n) => (n + hue / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

function toFeed(p) {
  const base = {
    name: p.name,
    color: p.color || colorFor(p.name),
    owner: p.owner || null,
    reach: p.serves.length,
    ...(p.paywall ? { paywall: true } : {}),
    ...(p.onlyCategories ? { onlyCategories: p.onlyCategories } : {}),
  };
  if (p.village) return { ...villageMedia(p.name, p.village, base.color), ...base, kind: "village" };
  if (p.blox) return { ...metroland(p.name, p.blox, base.color, null, p.owner, p.paywall), ...base };
  if (p.wp) return { ...base, kind: "wpjson", api: p.wp.api, categoryId: p.wp.categoryId, category: p.wp.category };
  return { ...base, urls: p.urls };
}

// Two records are the same feed if they would fetch the same thing.
export function feedKey(f) {
  const where = f.kind === "wpjson" ? `${f.api}#${f.categoryId}` : (f.urls || [])[0];
  return `${where}|${(f.onlyCategories || []).join(",")}`;
}

const TOWN_EXTRA = {};
const AREA_FEEDS = {};   // town -> { label, feeds }

for (const p of PUBLISHERS) {
  const f = toFeed(p);
  const narrow = p.serves.length <= 3;
  for (const raw of p.serves) {
    const town = OFFICIAL.get(norm(raw));
    if (!town) { UNMATCHED_SERVES.push(`${p.name}: ${raw}`); continue; }
    if (narrow || town === p.home) {
      (TOWN_EXTRA[town] ||= []).push(f);
    } else {
      const label = p.area || DIVISION_FEEDS[DIVISION_OF.get(town)]?.label || DIVISION_OF.get(town);
      const slot = (AREA_FEEDS[town] ||= { label, feeds: [] });
      slot.feeds.push(f);
    }
  }
}

/* A census division with no regional newsroom yet takes the verified one
   that serves the most of its municipalities. */
const DIVISION_LABELS = {
  "Brant": "Brant County", "Bruce": "Bruce County", "Chatham-Kent": "Chatham-Kent",
  "Elgin": "Elgin County", "Essex": "Windsor-Essex", "Grey": "Grey County",
  "Haldimand-Norfolk": "Haldimand-Norfolk", "Haliburton": "Haliburton County",
  "Hastings": "Hastings County", "Huron": "Huron County", "Kawartha Lakes": "Kawartha Lakes",
  "Kenora": "Kenora District", "Lambton": "Lambton County", "Lennox and Addington": "Lennox and Addington",
  "Manitoulin": "Manitoulin Island", "Middlesex": "Middlesex County", "Oxford": "Oxford County",
  "Perth": "Perth County", "Peterborough": "Peterborough County", "Prince Edward": "Prince Edward County",
  "Rainy River": "Rainy River District", "Stormont, Dundas and Glengarry": "Stormont, Dundas and Glengarry",
  "Sudbury": "Sudbury District", "Thunder Bay": "Thunder Bay District",
};
{
  const tally = {};   // division -> Map(feedKey -> { feed, count })
  for (const p of PUBLISHERS) {
    const f = toFeed(p);
    for (const raw of p.serves) {
      const town = OFFICIAL.get(norm(raw));
      if (!town) continue;
      const d = DIVISION_OF.get(town);
      const m = (tally[d] ||= new Map());
      const k = feedKey(f);
      m.set(k, { feed: f, count: (m.get(k)?.count || 0) + 1 });
    }
  }
  for (const [d, m] of Object.entries(tally)) {
    if (DIVISION_FEEDS[d] || d === "Toronto") continue;
    const best = [...m.values()].sort((a, b) => b.count - a.count)[0];
    if (best) DIVISION_FEEDS[d] = { label: DIVISION_LABELS[d] || d, feeds: [best.feed] };
  }
}

// Most local first, no feed twice, and no more than a page's worth: each one
// is a request the reader waits on.
const MAX_TOWN_FEEDS = 4;
function mergeFeeds(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    const sorted = [...(list || [])].sort((a, b) => (a.reach || 0) - (b.reach || 0));
    for (const f of sorted) {
      const k = feedKey(f);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(f);
    }
  }
  return out.slice(0, MAX_TOWN_FEEDS);
}

function localFor(name) {
  const own = mergeFeeds(TOWN_FEEDS[name], TOWN_EXTRA[name]);
  const area = AREA_FEEDS[name] ? { label: AREA_FEEDS[name].label, feeds: mergeFeeds(AREA_FEEDS[name].feeds) } : null;
  const division = DIVISION_FEEDS[DIVISION_OF.get(name)] || null;
  return { own, area, division };
}

/* What the reader's local tab is called and where its stories come from.

   tier:
     "town"     their own municipality has a newsroom
     "region"   a newsroom covering their area or region, and the tab says so
     "province" no local newsroom yet — there is no local tab at all, which is
                honest, rather than a tab that is always empty */
export function resolveTown(slug) {
  if (NOT_A_HOMETOWN.has(ALIASES[slug] || slug)) {
    return {
      slug: "toronto", townName: "Toronto", label: null,
      tier: "province", hasLocal: false, usingRegion: false,
      regionName: "Toronto", feeds: [], regionFeeds: [],
    };
  }
  const place = getPlace(slug);
  if (!place) return resolveTown(DEFAULT_TOWN);

  const { own, area, division } = localFor(place.name);
  const wider = area || division;
  const regionName = wider?.label || place.division;
  const regionFeeds = wider?.feeds || [];

  if (own.length) {
    return {
      slug: slugify(place.name), townName: place.name, label: place.name,
      tier: "town", hasLocal: true, usingRegion: false,
      regionName, feeds: own, regionFeeds,
    };
  }
  if (wider) {
    return {
      slug: slugify(place.name), townName: place.name, label: wider.label,
      tier: "region", hasLocal: true, usingRegion: true,
      regionName, feeds: wider.feeds, regionFeeds: wider.feeds,
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
    if (NOT_A_HOMETOWN.has(slugify(name))) continue;   // Toronto has its own tab already
    const divisionName = PLACES.divisions[divisionIndex];
    const { own, area, division } = localFor(name);
    const wider = area || division;
    out.push({
      slug: slugify(name),
      name,
      divisionName,
      tier: own.length ? "town" : wider ? "region" : "province",
      hasOwn: own.length > 0,
      // what the reader will actually read
      sourceName: own.length ? own[0].name : wider ? wider.feeds[0].name : null,
      regionName: wider?.label || divisionName,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export const PLACE_COUNT = PLACES.places.length;

/* Who owns the local newsrooms, across the whole province — for the About
   page, so the answer to "who is behind all this" doesn't depend on which
   town the reader happens to have picked. */
export function localOwnership() {
  const byName = new Map();
  const collect = (f) => { if (!byName.has(f.name)) byName.set(f.name, f.owner || null); };
  for (const list of Object.values(TOWN_FEEDS)) list.forEach(collect);
  for (const list of Object.values(TOWN_EXTRA)) list.forEach(collect);
  for (const a of Object.values(AREA_FEEDS)) a.feeds.forEach(collect);
  for (const d of Object.values(DIVISION_FEEDS)) d.feeds.forEach(collect);
  const byOwner = {};
  let unconfirmed = 0;
  for (const owner of byName.values()) {
    if (owner) byOwner[owner] = (byOwner[owner] || 0) + 1;
    else unconfirmed++;
  }
  return { total: byName.size, byOwner, unconfirmed };
}

/* Exposed so /api/health can check every feed we actually rely on, without
   having to know how towns resolve to publishers. One entry per distinct
   request, so a Durham town section and the Durham regional feed are
   checked separately — they can fail separately. */
export function publisherFeeds(scope) {
  const seen = new Map();
  const add = (label, f) => {
    const k = feedKey(f);
    if (!seen.has(k)) seen.set(k, { ...f, name: `${label} (${f.name})` });
  };
  if (scope !== "region") {
    for (const [town, feeds] of Object.entries(TOWN_FEEDS)) for (const f of feeds) add(town, f);
    for (const [town, feeds] of Object.entries(TOWN_EXTRA)) for (const f of feeds) add(town, f);
  }
  if (scope !== "town") {
    for (const d of Object.values(DIVISION_FEEDS)) for (const f of d.feeds) add(d.label, f);
    for (const a of Object.values(AREA_FEEDS)) for (const f of a.feeds) add(a.label, f);
  }
  return [...seen.values()];
}
