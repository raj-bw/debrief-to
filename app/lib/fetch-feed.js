import Parser from "rss-parser";

/* ---- Getting a publisher's stories, however they publish them ----
   One module, used by the live feed and by /api/health alike, so the health
   page tests exactly the path readers depend on rather than a lookalike.

   Three ways in, because Ontario's newsrooms run on three kinds of software:

     RSS      most of them — Village Media, WordPress independents, some
              Postmedia titles, and Metroland/Torstar through BLOX search.
     wpjson   Postmedia papers that have switched RSS off but still serve the
              WordPress REST API: the Whig-Standard, the London Free Press,
              the Pembroke Observer and others. Same stories, JSON not XML.

   Whatever comes back is shaped like an rss-parser item, so everything
   downstream (filters, topics, places) treats every publisher the same. */

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/* An honest name, tried when a site refuses the first attempt.

   Several publishers answer a browser and refuse Vercel, and three of the
   four we checked sit behind Cloudflare. A likely reason: we have been
   introducing ourselves as Chrome while connecting like a Node server, and
   bot screening is built to catch exactly that mismatch. A feed reader that
   says what it is and links to who runs it is the thing RSS was made for,
   and publishers that screen bots often let one through.

   It is a second attempt rather than the first so nothing that works today
   changes. /api/health reports which of the two each feed needed. */
const HONEST_UA = "DebriefTO/1.0 (+https://debrief.to; free local news reader)";

const ACCEPT_XML = "application/rss+xml, application/atom+xml, application/xml, text/xml, */*";

const itemFields = {
  item: [
    ["media:content", "mediaContent", { keepArray: true }],
    ["media:thumbnail", "mediaThumbnail"],
    ["content:encoded", "contentEncoded"],
  ],
};

const parsers = {
  chrome: new Parser({ timeout: 8000, headers: { "User-Agent": CHROME_UA, Accept: ACCEPT_XML }, customFields: itemFields }),
  honest: new Parser({ timeout: 8000, headers: { "User-Agent": HONEST_UA, Accept: ACCEPT_XML }, customFields: itemFields }),
};

// Refusals worth a second try under the other name. A 404 or a parse error
// means the feed isn't there, and asking again politely won't change that.
function isRefusal(message = "") {
  return /Status code (401|403|406|429|503)/.test(message);
}

async function parseWithRetry(url) {
  try {
    const feed = await parsers.chrome.parseURL(url);
    return { feed, via: "chrome" };
  } catch (err) {
    if (!isRefusal(err?.message)) throw err;
    const feed = await parsers.honest.parseURL(url);
    return { feed, via: "honest" };
  }
}

/* ---- WordPress REST API ----
   Two traps, both found in live data rather than reasoned about:

   1. A paper's newest "posts" can be entirely press releases. The Pembroke
      Observer's latest fifty were all PR Newswire and GlobeNewswire, so we
      never ask for everything — only the paper's news category, or a town
      category where the paper files its towns separately.

   2. On Postmedia's smaller titles the database is shared across the chain.
      The Simcoe Reformer's "news" category returned stories from Timmins,
      Sarnia, the Soo and Sherwood Park, Alberta. So every story must be on
      the paper's own domain, or it is dropped. */

const categoryCache = new Map();   // "api|slug" -> id, lives as long as the instance

async function getJson(url) {
  let res = await fetch(url, { headers: { "User-Agent": CHROME_UA, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  let via = "chrome";
  if (!res.ok && [401, 403, 406, 429, 503].includes(res.status)) {
    res = await fetch(url, { headers: { "User-Agent": HONEST_UA, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    via = "honest";
  }
  if (!res.ok) throw new Error(`Status code ${res.status}`);
  const data = await res.json();
  return { data, via };
}

async function resolveCategory(api, slug) {
  const key = `${api}|${slug}`;
  if (categoryCache.has(key)) return categoryCache.get(key);
  const { data } = await getJson(`${api}/wp-json/wp/v2/categories?slug=${encodeURIComponent(slug)}&_fields=id`);
  const id = Array.isArray(data) && data[0]?.id ? data[0].id : null;
  if (id) categoryCache.set(key, id);
  return id;
}

function hostOf(u) {
  try { return new URL(u).host.replace(/^www\./, ""); } catch { return ""; }
}

async function fetchWpJson(src) {
  const api = src.api.replace(/\/+$/, "");
  const fields = "link,title,excerpt,date_gmt,jetpack_featured_media_url,featured_media_details";
  const postsFor = (id) => `${api}/wp-json/wp/v2/posts?per_page=20&categories=${id}&_fields=${fields}`;

  /* A magazine rather than a newspaper: everything it publishes, minus one
     category it names (The Walrus labels sponsored content "Paid Post"). */
  if (src.allPosts) {
    const skip = src.excludeCategory ? await resolveCategory(api, src.excludeCategory).catch(() => null) : null;
    const url = `${api}/wp-json/wp/v2/posts?per_page=20${skip ? `&categories_exclude=${skip}` : ""}&_fields=${fields}`;
    const result = await getJson(url);
    if (!Array.isArray(result.data)) throw new Error("WordPress API did not return a list");
    const home = hostOf(api);
    const items = result.data.filter((p) => hostOf(p.link) === home).map((p) => ({
      title: p.title?.rendered || "", link: p.link,
      isoDate: p.date_gmt ? `${p.date_gmt}Z` : undefined,
      contentSnippet: p.excerpt?.rendered || "", categories: [],
      image: p.jetpack_featured_media_url || p.featured_media_details?.url || null,
    }));
    return { items, url, via: result.via };
  }

  // The verified id first; if a site ever renumbers, fall back to the slug.
  let id = src.categoryId || null;
  let result = id ? await getJson(postsFor(id)).catch(() => null) : null;
  if (!result || !Array.isArray(result.data) || result.data.length === 0) {
    id = src.category ? await resolveCategory(api, src.category) : null;
    if (!id) throw new Error(`no "${src.category}" category at ${api}`);
    result = await getJson(postsFor(id));
  }
  if (!Array.isArray(result.data)) throw new Error("WordPress API did not return a list");

  const home = hostOf(api);
  const items = result.data
    .filter((p) => hostOf(p.link) === home)          // trap 2: the shared database
    .map((p) => ({
      title: p.title?.rendered || "",
      link: p.link,
      isoDate: p.date_gmt ? `${p.date_gmt}Z` : undefined,
      contentSnippet: p.excerpt?.rendered || "",
      categories: [],
      image: p.jetpack_featured_media_url || p.featured_media_details?.url || null,
    }));
  return { items, url: postsFor(id), via: result.via };
}

/* ---- Remembering what each source said ----
   Today, This Week and This Month are separate requests. Before this, each
   one asked every publisher afresh, so if a publisher refused one of them —
   Metroland and Torstar rate-limit with 429s — that tab lost the whole
   source while the others kept it, and Today could show more stories than
   This Week. Now each source's answer is kept for a few minutes and shared
   by every tab, and if a publisher refuses, the last good answer (up to six
   hours old) stands in rather than a hole.

   This lives in the server's memory, so it is per instance and disappears
   on a cold start — the CDN and the archive are the durable layers. It only
   has to smooth over the minutes between requests, and it does. */
const FRESH_MS = 9 * 60 * 1000;
const STALE_MS = 6 * 60 * 60 * 1000;
const memo = new Map();       // key -> { at, result }
const inflight = new Map();   // key -> Promise, so simultaneous tabs share one fetch

function keyOf(src) {
  const where = src.kind === "wpjson" ? `${src.api}#${src.categoryId}#${src.category}` : (src.urls || []).join("|");
  return `${where}|${(src.onlyCategories || []).join(",")}`;
}

/* ---- The one entry point ----
   Returns { items, url, via } from the first URL that answers with stories,
   or throws the last error. An answer with no stories counts as "try the
   next URL" — a section feed that exists but is empty would otherwise win
   and hide the one that works. `onlyCategories` keeps items the publisher
   tagged with one of those names — Grant Haven publishes three papers
   through one feed and labels each story with the paper it belongs to.

   { fresh: true } skips the memory, for /api/health, which must see what
   the publisher says right now. */
async function fetchFresh(src) {
  if (src.kind === "wpjson") return fetchWpJson(src);

  let lastErr = null;
  let empty = null;
  for (const url of src.urls || []) {
    try {
      const { feed, via } = await parseWithRetry(url);
      let items = feed.items || [];
      if (items.length === 0) { empty ||= { items, url, via }; continue; }
      if (src.onlyCategories?.length) {
        const want = src.onlyCategories.map((c) => c.toLowerCase());
        items = items.filter((it) => (it.categories || []).some((c) =>
          want.includes(String(typeof c === "string" ? c : c?._ || "").toLowerCase().trim())));
      }
      // And the reverse: drop anything the publisher files under a named
      // category, such as a magazine's sponsored "Paid Post".
      if (src.excludeCategories?.length) {
        const drop = src.excludeCategories.map((c) => c.toLowerCase());
        items = items.filter((it) => !(it.categories || []).some((c) =>
          drop.includes(String(typeof c === "string" ? c : c?._ || "").toLowerCase().trim())));
      }
      return { items, url, via };
    } catch (err) {
      lastErr = err;
    }
  }
  if (empty) return empty;
  /* A second way in, for publishers whose RSS refuses servers but whose
     WordPress API may not (see The Walrus in sources.js). */
  if (src.fallback) {
    try { return await fetchFresh({ ...src.fallback, name: src.name, onlyCategories: src.onlyCategories }); }
    catch (err) { lastErr = new Error(`${lastErr?.message || "RSS failed"}; API: ${err?.message}`); }
  }
  throw lastErr || new Error("all candidate URLs failed");
}

export async function fetchItems(src, { fresh = false } = {}) {
  if (fresh) return fetchFresh(src);
  const key = keyOf(src);
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.result;
  if (inflight.has(key)) return inflight.get(key);

  const p = (async () => {
    try {
      const result = await fetchFresh(src);
      if (result.items.length) memo.set(key, { at: Date.now(), result });
      return result;
    } catch (err) {
      if (hit && Date.now() - hit.at < STALE_MS) return { ...hit.result, via: "stale" };
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}
