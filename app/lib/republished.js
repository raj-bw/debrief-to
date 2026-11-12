/* ---- Stories one newsroom republishes from another ----
   Village Media's local sites carry Be Giant's features, and The Trillium's
   and TorontoToday's stories, under their own names; other newsrooms carry
   The Conversation or the IJF. A reader sees a local newsroom's name on a
   story it didn't write. When the story says where it came from, the card
   says so too: "Republished from Be Giant".

   Two places a feed says it:
     - the byline (RSS author or dc:creator): "Jane Doe, The Trillium"
     - a credit line in the text: "This story was originally published by
       Be Giant", "Republished with permission from The Conversation"
   Only publications on the list below are recognised, so a byline that
   happens to contain a word like "Today" or "Local" isn't mistaken for one.
   News agencies (The Canadian Press, Reuters) are left out on purpose: wire
   copy is a different thing, and the filters already handle it.

   The same story under the same headline from two newsrooms is also caught
   when both are in view, in clusterStories. ---- */

import { SOURCES } from "./sources";
import { PUBLISHERS } from "./publishers";

// Publications we don't carry but whose stories local newsrooms republish.
const ELSEWHERE = [
  "The Conversation", "The Tyee", "The Hill Times", "Policy Options", "Healthy Debate",
  "The Logic", "Toronto Life", "Maclean's", "APTN News", "The Globe and Mail",
  "Global News", "CTV News", "CityNews", "Canadaland", "Pivot", "The Local",
];

// Other names a publication goes by in bylines, mapped to the name we show.
const ALIASES = {
  "Investigative Journalism Foundation": "IJF",
  "Canada's National Observer": "National Observer",
  "CBC News": "CBC Toronto",
  "thelocal.to": "The Local",
};

// "The Trillium" -> "trillium"; "TorontoToday.ca" -> "torontotoday"
export function nameKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\.(ca|com|org|to|media|net)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^the /, "")
    .trim();
}

const SHOWN = new Map();   // key -> the name shown on the card
for (const n of [...SOURCES.map((s) => s.name), ...PUBLISHERS.map((p) => p.name), ...ELSEWHERE]) {
  // "Newmarket Today" is also written "NewmarketToday.ca"
  for (const k of new Set([nameKey(n), nameKey(n).replace(/ /g, "")])) {
    if (k.length >= 3 && !SHOWN.has(k)) SHOWN.set(k, n);
  }
}
for (const [alias, shown] of Object.entries(ALIASES)) SHOWN.set(nameKey(alias), shown);
// "Local" alone matches "Local Journalism Initiative" in Village Media bylines
SHOWN.delete("local");

// Longest names first, so "Hamilton Spectator" wins over a shorter name inside it.
const KEYS = [...SHOWN.keys()].sort((a, b) => b.length - a.length);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const KEY_RE = new RegExp(`(?:^| )(${KEYS.map(escape).join("|")})(?= |$)`);

function publicationIn(text) {
  const m = ` ${nameKey(text)} `.replace(/\s+/g, " ").match(KEY_RE);
  return m ? SHOWN.get(m[1]) : null;
}

// The newsroom itself, under another of its names: "CBC News" on CBC Toronto,
// "NewmarketToday.ca Staff" on Newmarket Today.
function isItself(src, shown) {
  const a = nameKey(src.name).replace(/ /g, "");
  const b = nameKey(shown).replace(/ /g, "");
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

const CREDIT_LINES = [
  /\b(?:originally|first)\s+(?:published|appeared|ran|posted)\s+(?:in|on|by|at|with)\s+([^.;:!?()\n]{2,80})/gi,
  /\brepublished\s+(?:here\s+)?(?:with\s+(?:the\s+)?permission\s+(?:of|from)\s+|from\s+|by\s+arrangement\s+with\s+)([^.;:!?()\n]{2,80})/gi,
];

function strip(html) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#8217;|&rsquo;/g, "’");
}

/* The publication a feed item credits as the story's source, or null.
   `src` is the newsroom whose feed carried it. */
export function republishedFrom(src, item) {
  if (!item) return null;
  const byline = [item.creator, item.author, item["dc:creator"]]
    .flat().filter((x) => typeof x === "string").join(" ");
  if (byline) {
    const shown = publicationIn(byline);
    if (shown && !isItself(src, shown)) return shown;
  }
  const text = strip([item.contentEncoded, item.content, item.description, item.summary].filter(Boolean).join(" "));
  for (const re of CREDIT_LINES) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      // "Be Giant, a national non-profit newsroom" -> look at the first few words
      const credited = m[1].split(",")[0].split(/\s+/).slice(0, 6).join(" ");
      const shown = publicationIn(credited);
      if (shown && !isItself(src, shown)) return shown;
    }
  }
  return null;
}
