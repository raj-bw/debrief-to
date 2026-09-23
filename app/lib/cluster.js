/* ---- Recognising when several newsrooms covered the same story ----
   When the Star, CBC and The Trillium all write up the same provincial
   announcement, three cards for one story is just noise. Worse, it hides the
   fact that three newsrooms thought it mattered — which is itself the most
   useful signal on the page.

   So matching stories are folded into one card, and the card says who else
   covered it.

   How the matching works: not by how many words two headlines share, which
   in testing matched "Toronto wants..." to "Toronto wants..." about entirely
   unrelated things. It works on shared *rare* proper nouns. "Chow",
   "Stronach", "Metrolinx" are signal. "Toronto", "Ontario", "York", "City"
   are noise and caused every false match we saw. Rarity is measured against
   the articles actually in front of us, so it adapts on its own: on a day
   when everything is about one name, that name stops counting as rare.

   Two headlines need to share at least two rare names, within 48 hours of
   each other, before they are called the same story. One shared name is not
   enough — two unrelated stories can both mention a premier. ---- */

// Words that look like proper nouns but tell us nothing about which story
// this is. Places we cover, and the furniture of headline writing.
const NOISE = new Set([
  "toronto", "ontario", "york", "canada", "canadian", "canadians", "gta",
  "newmarket", "aurora", "markham", "vaughan", "barrie", "ottawa", "hamilton",
  "city", "town", "region", "regional", "council", "province", "provincial",
  "federal", "national", "police", "court", "mayor", "premier", "minister",
  "the", "a", "an", "new", "news", "this", "that", "what", "why", "how",
  "here", "there", "after", "before", "first", "last", "next", "more", "most",
  "opinion", "analysis", "update", "report", "reports", "says", "said",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december",
  "street", "road", "avenue", "west", "east", "north", "south",
  "project", "plan", "program", "budget", "government", "people", "residents",
  // Ordinary words that only ever look like names because they start a headline
  "report", "study", "video", "photos", "watch", "breaking", "exclusive",
  "inside", "meet", "local", "man", "woman", "men", "women", "family",
  "families", "students", "school", "schools", "hospital", "fire", "crash",
  "driver", "home", "homes", "group", "board", "staff", "work", "world",
  "year", "years", "week", "weeks", "day", "days", "time", "times",
  "one", "two", "three", "four", "five", "six", "some", "many", "several",
  "both", "all", "not", "now", "then", "later", "again", "still", "just",
  "even", "also", "but", "and", "for", "with", "from", "into", "over",
  "under", "about", "across", "among", "between", "during", "without",
  "within", "around", "through", "when", "which", "who", "whose", "will",
  "can", "could", "should", "would", "may", "might", "must", "has", "have",
  "was", "were", "are", "its", "their", "your", "our", "his", "her",
]);

const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

/* The names in a headline, as whole entities rather than loose words.
   "Doug Ford" is one name, not two — counting it as two was enough on its own
   to fold together two unrelated stories that happened to mention the same
   premier.

   Consecutive capitalised words are joined into a single entity. A run longer
   than three words is not a name at all, it is a headline written in Title
   Case, so those are broken back up into individual words.

   The first word of a headline counts like any other: "Stronach verdict
   delivered..." carries its whole signal in the word that happens to start the
   sentence. The noise list, plus the rarity test, is what keeps ordinary
   sentence-starters ("Police", "Residents", "Report") out. */
function properNouns(title) {
  const tokens = String(title || "").split(/[^A-Za-z0-9'\u2019-]+/).filter(Boolean);
  const out = new Set();
  let run = [];
  const flush = () => {
    if (run.length === 0) return;
    const kept = run.filter((w) => w.length >= 3 && !NOISE.has(w.toLowerCase()));
    if (kept.length === 0) { run = []; return; }
    if (run.length > 3) kept.forEach((w) => out.add(w.toLowerCase()));  // Title Case headline
    else out.add(kept.map((w) => w.toLowerCase()).join(" "));
    run = [];
  };
  for (const w of tokens) {
    if (/^[A-Z]/.test(w)) run.push(w);
    else flush();
  }
  flush();
  return out;
}

/* The ordinary words of a headline — no capitals required — that are long
   enough to carry meaning. These are the second signal. A shared name says
   two headlines are about the same *person*; a shared subject word is what
   says they are about the same *event*. "Doug Ford announces hospital
   funding" and "Doug Ford defends highway plan" share the politician and
   nothing else, and should not be folded together. */
const COMMON = new Set([
  "about", "after", "again", "against", "among", "another", "around", "because",
  "before", "being", "between", "could", "during", "every", "first", "found",
  "from", "further", "going", "great", "into", "issue", "issues", "large",
  "later", "local", "makes", "making", "might", "more", "most", "moves", "never",
  "other", "over", "people", "plans", "public", "really", "residents", "saying",
  "says", "should", "since", "small", "some", "still", "such", "take", "takes",
  "than", "that", "their", "them", "then", "there", "these", "they", "thing",
  "things", "think", "this", "those", "three", "through", "time", "under",
  "until", "using", "very", "want", "wants", "week", "were", "what", "when",
  "where", "which", "while", "will", "with", "without", "would", "year", "years",
  "could", "before", "already", "amid", "ahead", "across",
]);
function contentWords(title) {
  const words = String(title || "").split(/[^A-Za-z0-9'\u2019-]+/).filter(Boolean);
  const out = new Set();
  for (const w of words) {
    if (w.length < 5) continue;
    const lower = w.toLowerCase();
    if (COMMON.has(lower) || NOISE.has(lower)) continue;
    out.add(lower);
  }
  return out;
}

/* How local a story is, for deciding which version of it to show.
   The most local newsroom wins: they were there. */
const PLACE_RANK = { home: 0, Toronto: 1, Ontario: 2, Canada: 3, National: 3 };
function localness(article) {
  const p = article.sourcePlace;
  return PLACE_RANK[p] !== undefined ? PLACE_RANK[p] : 3;
}

/* Union-find, so a three-way match ends up as one cluster rather than
   two overlapping pairs. */
function makeFinder(n) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };
  return { find, union };
}

/* Takes the articles, returns the same list with matched stories folded into
   a single card carrying `alsoCoveredBy`. Order is otherwise preserved. */
export function clusterStories(articles) {
  if (!Array.isArray(articles) || articles.length < 2) return articles || [];

  const names = articles.map((a) => properNouns(a.title));
  const words = articles.map((a) => contentWords(a.title));
  const times = articles.map((a) => new Date(a.pubDate).getTime());

  // How many articles each token appears in. A token in lots of articles today
  // is today's wallpaper, not today's story.
  // Counted once per article, not once per list — a word that is both a name
  // and a content word would otherwise look twice as common as it is, and the
  // most important names in a story are exactly the ones that appear in both.
  const df = new Map();
  for (let i = 0; i < articles.length; i++) {
    for (const tok of new Set([...names[i], ...words[i]])) {
      df.set(tok, (df.get(tok) || 0) + 1);
    }
  }
  // A token is "rare" if few of today's articles mention it. The floor of 3
  // matters: a story three newsrooms covered puts its key names in three
  // articles, and a tighter ceiling would rule out the very thing we're
  // looking for.
  const rarityCeiling = Math.max(3, Math.ceil(articles.length * 0.06));
  const isRare = (n) => (df.get(n) || 0) <= rarityCeiling;
  const rareNames = names.map((set) => new Set([...set].filter(isRare)));
  const rareWords = words.map((set) => new Set([...set].filter(isRare)));

  const { find, union } = makeFinder(articles.length);
  for (let i = 0; i < articles.length; i++) {
    if (rareNames[i].size < 1) continue;                            // no name, no story
    for (let j = i + 1; j < articles.length; j++) {
      if (rareNames[j].size < 1) continue;
      if (articles[i].source === articles[j].source) continue;      // a newsroom doesn't corroborate itself
      if (Math.abs(times[i] - times[j]) > FORTY_EIGHT_HOURS) continue;

      // Two signals are needed, and at least one of them must be a name.
      // A shared name alone means only that two stories mention the same
      // person; a shared subject word alone is the word-overlap matching that
      // produced nothing but false positives when we tested it.
      let sharedNames = 0;
      for (const n of rareNames[i]) if (rareNames[j].has(n)) sharedNames++;
      if (sharedNames === 0) continue;
      let sharedWords = 0;
      for (const w of rareWords[i]) if (rareWords[j].has(w)) sharedWords++;
      if (sharedNames + sharedWords >= 2) union(i, j);
    }
  }

  // Gather the clusters
  const groups = new Map();
  for (let i = 0; i < articles.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  }

  // Pick the card to keep: most local wins, and among equals whoever
  // published first — they broke it.
  const winnerOf = new Map();
  for (const members of groups.values()) {
    if (members.length === 1) { winnerOf.set(members[0], members[0]); continue; }
    const best = members.slice().sort((x, y) =>
      localness(articles[x]) - localness(articles[y]) || times[x] - times[y]
    )[0];
    members.forEach((m) => winnerOf.set(m, best));
  }

  const out = [];
  const emitted = new Set();
  for (let i = 0; i < articles.length; i++) {
    const winner = winnerOf.get(i);
    if (winner !== i) continue;              // folded into someone else's card
    if (emitted.has(winner)) continue;
    emitted.add(winner);
    const members = groups.get(find(i)) || [i];
    const others = members
      .filter((m) => m !== winner)
      .map((m) => articles[m].source)
      .filter((s, idx, arr) => arr.indexOf(s) === idx);   // one mention per newsroom
    out.push(others.length ? { ...articles[winner], alsoCoveredBy: others } : articles[winner]);
  }
  return out;
}
