/* ---- Working out what an article is about ----
   Categories used to belong to publications: The Narwhal was "Environment",
   full stop. That was wrong. A newsroom like The Green Line covers housing,
   transit, environment and community all at once, and every one of those
   stories deserves to land in the right place.

   So the category belongs to the article, not the publication, and an article
   can carry more than one. A story about a highway's environmental assessment
   is genuinely Environment and Urbanism & Transit and Ontario, and it should
   appear under all three — but only once, because the feed is deduplicated by
   link before any of this runs.

   Three ways of working it out, in descending order of how much they can be
   trusted:

     1. The section of the site the article lives in (from its URL). This is
        the publisher telling us directly, and it is nearly always right.
     2. The categories the publisher puts in their own RSS feed.
     3. Distinctive phrases in the headline. This one is a last resort and is
        kept deliberately narrow, because "green" matches the Green Party, the
        greenbelt and the Green Line equally well.

   An article nothing matches stays untagged and shows up in the place tabs
   only. A thin, accurate Environment tab is worth more than a fat, wrong one.
---- */

export const TOPICS = ["Environment", "Investigative", "National Politics", "Urbanism & Transit"];

/* 1. Section paths. Matched against the article's URL path. */
const TOPIC_PATHS = {
  "Environment": ["/environment/", "/climate/", "/energy/", "/conservation/", "/nature/", "/greenbelt/"],
  "Investigative": ["/investigation/", "/investigations/", "/investigative/", "/in-depth/", "/indepth/", "/longread/", "/long-read/"],
  "National Politics": ["/politics/", "/federal/", "/parliament/", "/ottawa-politics/", "/election/", "/elections/"],
  "Urbanism & Transit": ["/transit/", "/transportation/", "/urbanism/", "/housing/", "/development/", "/planning/", "/public-space/", "/infrastructure/"],
};

/* 2. Feed categories. Matched loosely against whatever the publisher wrote,
      lowercased. "Climate Change" contains "climate", so it matches. */
const TOPIC_FEED_CATEGORIES = {
  // "energy", "water" and "nature" were dropped: they appear as publisher
  // categories on plenty of stories that are not about the environment.
  "Environment": ["environment", "climate", "conservation", "wildlife", "pollution", "greenbelt"],
  "Investigative": ["investigation", "investigative", "in depth", "in-depth", "long read", "accountability"],
  /* "politics", "government", "election" and "policy" are all used by
     publishers for city-hall stories. They say what a piece is about but
     nothing about its scale, and scale is what this tab claims. A Toronto
     mayoral debate was being filed under National Politics because of them.
     Only unambiguously federal categories remain; everything else has to earn
     the tag through a headline that names the level of government. */
  "National Politics": ["federal politics", "parliament", "house of commons"],
  "Urbanism & Transit": ["transit", "transportation", "urbanism", "housing", "development", "planning", "public space", "infrastructure", "city building", "architecture"],
};

/* 3. Headline phrases. Narrow on purpose: every entry here is either a phrase
      that has no common second meaning, or a word bounded so it cannot match
      something else. Anything ambiguous is left out rather than guessed. */
const TOPIC_TITLE_PATTERNS = {
  "Environment": [
    /\bclimate (?:change|crisis|policy|target|plan)\b/i,
    /\bgreenhouse gas(?:es)?\b/i, /\bemissions\b/i, /\bgreenbelt\b/i,
    /\bconservation authority\b/i, /\bwetlands?\b/i, /\bendangered species\b/i,
    /\bair quality\b/i, /\bdrinking water\b/i, /\blandfill\b/i,
    /\bpipelines?\b/i, /\bcarbon (?:tax|price|pricing|emissions)\b/i,
  ],
  "Investigative": [
    /\binvestigation (?:finds|reveals|shows)\b/i, /\bdocuments (?:reveal|show|obtained)\b/i,
    /\bfreedom of information\b/i, /\brecords obtained\b/i,
    /\bauditor general\b/i, /\bwhistleblower\b/i, /\bconflict of interest\b/i,
  ],
  "National Politics": [
    /\bhouse of commons\b/i, /\bparliament\b/i, /\bfederal (?:government|budget|election|minister|cabinet)\b/i,
    /\bprime minister\b/i, /\bqueen'?s park\b/i, /\bprovincial (?:government|budget|election)\b/i,
    /\bmpps?\b/i, /\bmps?\b(?!\s*(?:h|g))/i, /\bby-?election\b/i, /\bcabinet minister\b/i,
  ],
  "Urbanism & Transit": [
    /\bpublic transit\b/i, /\bsubway\b/i, /\bstreetcars?\b/i, /\blrt\b/i, /\bgo train\b/i,
    /\bbike lanes?\b/i, /\bbus routes?\b/i, /\bttc\b/i, /\bmetrolinx\b/i, /\bgo transit\b/i,
    /\bzoning\b/i, /\baffordable housing\b/i, /\brent(?:al)? (?:control|prices|market)\b/i,
    /\bdensity\b/i, /\bhighway \d+\b/i, /\bcondo (?:development|tower)\b/i,
    /\bofficial plan\b/i, /\bbuilding permits?\b/i, /\bland use\b/i,
  ],
};

/* ---- Place ----
   Place answers "where", topic answers "what". They are separate axes: an
   article is Toronto AND Environment, never one instead of the other.

   A story gets its source's own place for free. On top of that, a headline
   that names a place explicitly earns that place too — so a national outlet's
   investigation into Toronto housing shows up in the Toronto tab, where
   someone looking for it would actually look. Only headlines are checked,
   never article text, because body copy mentions places in passing far too
   often to be reliable. ---- */
const PLACE_TITLE_PATTERNS = {
  "Toronto": [/\btoronto\b/i, /\bthe gta\b/i, /\bscarborough\b/i, /\betobicoke\b/i, /\bnorth york\b/i, /\beast york\b/i],
  "Ontario": [/\bontario\b/i, /\bqueen'?s park\b/i, /\bdoug ford\b/i, /\bprovince of ontario\b/i],
};

/* Does this publisher category actually contain the term, as a word or
   phrase, rather than merely somewhere inside a longer word? */
function hasPhrase(category, term) {
  return new RegExp(`(^|[^a-z])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i").test(category);
}

function pathOf(link) {
  return String(link || "").replace(/^https?:\/\/[^/]+/, "").toLowerCase();
}

/* Everything a publisher listed as a category on this item, lowercased. */
function feedCategories(item) {
  const raw = item?.categories;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => (typeof c === "string" ? c : c?._ || c?.$?.term || ""))
    .filter(Boolean)
    .map((c) => c.toLowerCase().trim());
}

/* The topics an article belongs to. Usually none, sometimes one, occasionally
   several — all three methods contribute and the results are merged. */
export function topicsFor(article, item) {
  const path = pathOf(article.link);
  const title = article.title || "";
  const cats = feedCategories(item);
  const found = new Set();

  for (const topic of TOPICS) {
    // 1. the section of the site it lives in
    if ((TOPIC_PATHS[topic] || []).some((p) => path.includes(p))) { found.add(topic); continue; }
    // 2. the publisher's own categories, matched on whole words. Substring
    //    matching put a Doug Ford profile under Environment because some
    //    unrelated category happened to contain one of these words.
    if ((TOPIC_FEED_CATEGORIES[topic] || []).some((c) => cats.some((x) => hasPhrase(x, c)))) { found.add(topic); continue; }
    // 3. a distinctive phrase in the headline
    if ((TOPIC_TITLE_PATTERNS[topic] || []).some((re) => re.test(title))) { found.add(topic); }
  }
  return [...found];
}

/* The places an article belongs to. `homePlace` is whatever the reader's local
   tab is called, so a Newmarket reader's local stories are tagged "Newmarket"
   and an Aurora reader's are tagged "York Region". */
export function placesFor(article, sourcePlace, homePlace) {
  const title = article.title || "";
  const found = new Set();

  // The source's own patch, always.
  if (sourcePlace === "home" && homePlace) found.add(homePlace);
  else if (sourcePlace) found.add(sourcePlace);

  // A headline that names somewhere else earns that place too.
  for (const [place, patterns] of Object.entries(PLACE_TITLE_PATTERNS)) {
    if (patterns.some((re) => re.test(title))) found.add(place);
  }
  // The reader's own town, by name, wherever it was reported.
  if (homePlace && new RegExp(`\\b${homePlace.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(title)) {
    found.add(homePlace);
  }
  return [...found];
}
