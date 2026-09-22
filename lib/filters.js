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
  "/obituaries/", "/obituary/", "/deaths/",
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
  "/globenewswire/", "/newswire/", "/cision/", "/press-release/",
  "/volunteer-opportunities/", "/shopping-and-services/", "/special-features/",
  "/fun-and-games/", "/things-to-do/", "/events/", "/contests/",
  "/business/real-estate/", "/news/topics/",
  "/obituaries/", "/obituary/", "/deaths/", "/sponsored/", "/classifieds/",
];

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

