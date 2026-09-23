/* ---- What gets left out, and what gets labelled ----
   Every rule in this file targets the *format* of a post, never its subject.
   Wire copy from somewhere else, sports and entertainment sections, video
   clips, the daily weather post, obituaries, paid placements, a newsroom's own
   fundraising notices: none of these are local reporting. Nothing is ever
   dropped for what it is about or what conclusion it reaches.

   These rules are published on the site's About page, in plain English. If you
   change what is in here, change that page too. ---- */

// Village Media pipes Canadian Press wire copy through every one of its local
// feeds, so this applies to all of them, in whatever town.
const WIRE_PATHS = [
  "/beyond-local/", "/national-news/", "/world-news/", "/canada-news/",
  "/ontario-news/", "/national/", "/world/", "/canada/", "/sports-news/",
  "/entertainment-news/", "/business-news/", "/auto-news/", "/lifestyle/",
  // Not wire copy, but not news either. Obituaries and death notices are the
  // biggest single category of non-news on these sites, and running a stranger's
  // funeral notice next to a council story serves nobody.
  "/obituaries/", "/obituary/", "/deaths/", "/in-memoriam/",
  // The "Good morning, Newmarket" roundup: weather and links to stories we
  // already carry, not a story of its own.
  "/good-morning/",
  "/local-entertainment/", "/local-sports/",
  // Paid placements dressed as articles
  "/spotlight/", "/local-sponsored/", "/sponsored/", "/classifieds/", "/deals/",
];

/* Metroland's portals are asked for their news section only (see
   metroland() in towns.js), which is where almost all of this is caught.
   These are the leaks that still get through a section-scoped request:
   syndicated press releases filed under news, real-estate listings, and the
   evergreen "topics" bucket that has not been updated since 2023. Kept
   separate from the Village Media list because the same path fragment means
   different things on different platforms — "/local/" is a wire bucket on
   one and the actual reporting on another. */
const METROLAND_SKIP_PATHS = [
  "/volunteer-opportunities/", "/shopping-and-services/", "/special-features/",
  "/fun-and-games/", "/things-to-do/", "/events/", "/contests/",
  "/business/real-estate/", "/news/topics/",
  "/obituaries/", "/obituary/", "/deaths/", "/sponsored/", "/classifieds/",
  // The Torstar dailies (Spectator, Record, Standard...) share this platform
  // and file Canadian Press copy under news/canada and news/world.
  "/news/canada/", "/news/world/", "/news/national/", "/news/canada-news/", "/news/world-news/",
];

/* Paid-for announcements arrive through every chain — Metroland files them
   under news, Postmedia under /press-releases/. These words mean the same
   thing on any platform, so this list applies to every source. */
const UNIVERSAL_SKIP_PATHS = [
  "/press-releases/", "/press-release/", "/globenewswire/", "/globe-newswire/",
  "/pr-newswire/", "/prnewswire/", "/business-wire/", "/newsfile/", "/cision/",
  "/newswire/", "/sponsored/", "/sponsored-content/",
];

/* Postmedia. Two things to keep out, both matching choices already made.

   Wire copy under /news/national/ and /news/world/, as with Village Media.

   And syndicated columnists. Postmedia runs the same national columnists
   across the chain — including the Toronto Sun's, which this site removed.
   A Sun column appearing under a local paper's name is still a Sun column,
   and dropping the source only to take its columns back through a sister
   paper would quietly undo that decision. Local editorials and letters are
   kept and labelled Opinion; it is the columnists section that goes.

   Sports, arts and lifestyle are left out for the same reason they are left
   out of Village Media: not what readers come here for. */
const POSTMEDIA_SKIP_PATHS = [
  "/news/national/", "/news/world/", "/news/canada/", "/news/ontario-news/",
  "/news/crime/national/", "/opinion/columnists/",
  "/sports/", "/arts-life/", "/entertainment/", "/life/", "/health/", "/travel/",
  "/remembering/", "/obituaries/", "/business/real-estate/",
];
// "WARMINGTON: ...", "LILLEY: ..." — the house style for a syndicated column.
const COLUMN_TITLE = /^[A-Z][A-Z'’.\-]{2,}(?:\s+[A-Z][A-Z'’.\-]{2,})?\s*:/;

/* Words that mean the same thing on any platform. A WordPress independent
   often files everything under a flat date path, so there is no section to
   read — the only signal left is how the newsroom labelled the piece. Kept
   short and unambiguous on purpose: a rule that fires on a real story is
   worse than one that misses a notice. */
const UNIVERSAL_SKIP_TITLES = [
  /^obituar(y|ies)\b/i, /^in memoriam\b/i, /^death notice/i,
  /^sponsored\b/i, /^advertorial\b/i, /^paid content\b/i,
];

const SKIP_PATHS = {
  // Toronto Sun was removed as a source in Sept 2026 — too much tabloid copy.
  // These rules stay as a pattern for any future tabloid-style source.
  "Canadaland": ["/live/"],
  // Sports, lifestyle and entertainment aren't what people come here for
  "Toronto Star": ["/sports/", "/life/", "/entertainment/"],
  // Audio and video clips rather than articles
  "CBC Toronto": ["/player/"],
  // Council coverage for other Ontario towns (Barrie, Milton, Springwater...)
  "The Trillium": ["/municipalities-newsletter/"],
};

const SKIP_TITLES = {
  // Postmedia-style columns: "WARMINGTON: ...", "MANDEL: ..."
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

export function pathOf(link) {
  return String(link || "").replace(/^https?:\/\/[^/]+/, "").toLowerCase();
}

export function isPaywalled(src, link) {
  if (PAYWALL_EVERYTHING.includes(src.name)) return true;
  // Metered dailies in the town registry carry the flag themselves, for the
  // same reason as the Star: a meter can't be read from a link.
  if (src.paywall === true) return true;
  const paths = PAYWALL_PATHS[src.name] || [];
  return paths.some((p) => pathOf(link).startsWith(p));
}

// Anything matching these is kept but labelled "Opinion"
const OPINION_PATHS = ["/opinion/", "/opinions/", "/commentary/", "/editorial/",
  // A reader's letter is commentary, so it gets the label rather than the axe.
  "/letters-to-the-editor/", "/letters/"];
const OPINION_TITLES = [/^op-?ed\b/i, /^opinion\b/i, /^editorial\b/i, /^analysis\b/i, /^column\b/i];

export function shouldSkip(src, article) {
  const path = pathOf(article.link);
  // Wire copy syndicated into a local site is not local news
  if (src.kind === "village" && WIRE_PATHS.some((p) => path.startsWith(p))) return true;
  if (src.kind === "metroland" && METROLAND_SKIP_PATHS.some((p) => path.includes(p))) return true;
  if (src.owner === "Postmedia" && POSTMEDIA_SKIP_PATHS.some((p) => path.includes(p))) return true;
  if (src.owner === "Postmedia" && COLUMN_TITLE.test(article.title || "")) return true;
  if (UNIVERSAL_SKIP_PATHS.some((p) => path.includes(p))) return true;
  if (UNIVERSAL_SKIP_TITLES.some((re) => re.test(article.title))) return true;
  if ((SKIP_PATHS[src.name] || []).some((p) => path.includes(p))) return true;
  if ((SKIP_TITLES[src.name] || []).some((re) => re.test(article.title))) return true;
  return false;
}

export function isOpinion(article) {
  const path = pathOf(article.link);
  return OPINION_PATHS.some((p) => path.includes(p)) || OPINION_TITLES.some((re) => re.test(article.title));
}


const BLOTTER_PATHS = ["/police-beat/", "/crime/", "/police/"];
const BLOTTER_TITLE = /\b(charged|police say|arrested|homicide|stabb\w+|fatally shot|dead after|body found)\b/i;
export function isBlotter(a) {
  return BLOTTER_PATHS.some((p) => pathOf(a.link).includes(p)) || BLOTTER_TITLE.test(a.title || "");
}

