/* ---- The archive ----
   RSS feeds are a window, not a record: most publishers expose only their
   newest twenty or so stories, so without our own copy This Week and This
   Month can only show what happens to still be in the window.

   How it works now (September 2026 rewrite):

   - A background collector (/api/collect) visits every publication for every
     active town on a schedule, whether or not anyone is reading, and stores
     what it finds. Readers never write — they only read.

   - A town becomes active the first time anyone picks it, and stays active.
     From then on its publications are collected every run, every day.

   - Each publication has its own shelf. Anything older than 33 days is
     removed from that publication's shelf once a day, so storage stays
     bounded however long the site runs.

   Why Redis and not Vercel Blob: the free Blob plan allows 2,000 writes a
   month and switches Blob off for 30 days if that's exceeded. The previous
   design wrote on reader visits — four to six writes and listings each —
   and would have hit that within days of real traffic. Redis has no such
   per-write limit, and a sorted list per publication is exactly the shape
   this data has.

   The limit that matters is size: the free Redis plan is 30 MB. A story
   takes about 850 bytes stored (measured), so that's roughly 30,000
   stories — the standing sources plus roughly 20 busy towns at the 33
   days kept (just over the Month tab's 31-day window). If it ever fills past 85%, the collector trims the oldest days early (never
   below three weeks) rather than let writes fail; /api/health shows how
   full it is and what retention is actually in force.

   Layout, per publication ("bucket"):
     z:<bucket>   sorted set — each story's link, scored by publish time
     h:<bucket>   hash — link → the story, as JSON
   and for the site as a whole:
     archive:active   sorted set — town slugs, scored by when first chosen
     archive:buckets  hash — bucket → which publication it is
     archive:state    hash — when the collector last ran, and what it did

   Every function fails quietly. If the archive is unreachable, or was never
   set up, the site still shows the live feed. ---- */

export const RETENTION_DAYS = 33;
const DAY = 86400000;

/* ---- Where the database is ----
   Two kinds of Redis can be connected through the Vercel Marketplace, and
   they hand over different settings:

   - Redis Cloud (the "Redis" integration) gives one setting, REDIS_URL — a
     direct connection. This is what debrief.to uses: the free plan, 30 MB.
   - Upstash gives KV_REST_API_URL and KV_REST_API_TOKEN (or, from its own
     dashboard, UPSTASH_REDIS_REST_URL / _TOKEN) — a web address instead.

   Either works; a custom prefix chosen when connecting (STORAGE_REDIS_URL,
   say) is found too. If both are present, the direct connection wins. */
function findRest() {
  const keys = Object.keys(process.env);
  const urlKey = keys.find((k) => /(^|_)KV_REST_API_URL$/.test(k))
    || keys.find((k) => /(^|_)UPSTASH_REDIS_REST_URL$/.test(k));
  if (!urlKey) return { url: "", token: "", urlKey: null };
  const tokenKey = urlKey.replace(/URL$/, "TOKEN");
  return { url: process.env[urlKey] || "", token: process.env[tokenKey] || "", urlKey, tokenKey };
}
function findTcp() {
  const urlKey = Object.keys(process.env).find((k) => /(^|_)REDIS_URL$/.test(k) && /^rediss?:\/\//.test(process.env[k] || ""));
  return urlKey ? { url: process.env[urlKey], urlKey } : { url: "", urlKey: null };
}
const TCP = findTcp();
const REST = findRest();
const REST_URL = REST.url;
const REST_TOKEN = REST.token;
const MODE = TCP.url ? "tcp" : (REST_URL && REST_TOKEN ? "rest" : null);

export function archiveEnabled() {
  return MODE !== null;
}

export function archiveBackend() {
  if (MODE === "tcp") return `redis (${TCP.urlKey})`;
  if (MODE === "rest") return `upstash redis (${REST.urlKey})`;
  // Names only, never values: enough to see what's missing or misnamed.
  const seen = Object.keys(process.env).filter((k) => /KV|REDIS|UPSTASH/i.test(k)).sort();
  if (REST.urlKey && !REST_TOKEN) return `found ${REST.urlKey} but no ${REST.tokenKey} — check the token setting`;
  return seen.length
    ? `not connected — saw these settings, none usable: ${seen.join(", ")}`
    : "not connected — no Redis settings in this deployment. Add Redis in the Vercel Marketplace, connect it to this project for Production, then redeploy.";
}

// The date in Toronto, because "today" should mean what a reader in Newmarket
// means by it, not what a server in Virginia means by it.
export function torontoDay(d = new Date()) {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
}

/* ---- The direct connection ----
   One connection per server instance, opened on first use and reused. A
   serverless instance can be frozen between requests and wake with a dead
   socket, so every batch has a time limit, and a batch that runs out drops
   the connection so the next one starts clean. */
let clientPromise = null;
async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { createClient } = await import("redis");
      const c = createClient({
        url: TCP.url,
        socket: { connectTimeout: 5000, keepAlive: true, reconnectStrategy: (n) => (n > 3 ? false : 200 * n) },
      });
      c.on("error", (err) => console.warn("[debrief.to] redis:", err?.message));
      await c.connect();
      return c;
    })().catch((err) => { clientPromise = null; throw err; });
  }
  return clientPromise;
}
function dropClient() {
  const p = clientPromise;
  clientPromise = null;
  p?.then((c) => c.destroy?.()).catch(() => {});
}
async function tcpPipeline(commands) {
  const run = (async () => {
    const c = await getClient();
    return Promise.all(commands.map((cmd) => c.sendCommand(cmd.map(String))));
  })();
  let timer;
  const limit = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("archive timed out")), 10000); });
  try {
    return await Promise.race([run, limit]);
  } catch (err) {
    dropClient();
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/* One round trip, many commands, whichever kind of Redis this is. */
async function pipeline(commands) {
  if (!commands.length) return [];
  if (MODE === "tcp") return tcpPipeline(commands);
  const res = await fetch(`${REST_URL.replace(/\/+$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`archive responded ${res.status}`);
  const out = await res.json();
  return out.map((r) => {
    if (r && r.error) throw new Error(r.error);
    return r ? r.result : null;
  });
}

/* ---- Which shelf a publication's stories go on ----
   The standing sources (CBC Toronto, The Narwhal, The Maple...) share one
   shelf, because every reader's feed includes all of them and one read is
   cheaper than sixteen. Every local publication gets its own. */
function hash(str, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(36);
}

export function bucketFor(src) {
  if (src.shared) return "shared";
  const where = src.kind === "wpjson" ? `${src.api}#${src.categoryId}` : (src.urls || [])[0] || src.name;
  const key = `${where}|${(src.onlyCategories || []).join(",")}`;
  return `f${hash(key, 2166136261)}${hash(key, 374761393)}`;
}

/* What's worth keeping — and no more, because the free database is 30 MB.
   The link is already the key the story is filed under, so it isn't stored
   twice; the summary is cut to about two lines (cards show little more);
   images are only a URL on the publisher's server. */
const DESC_MAX = 200;
function shortDesc(d = "") {
  if (d.length <= DESC_MAX) return d || undefined;
  return d.slice(0, DESC_MAX).replace(/\s+\S*$/, "") + "…";
}
function slim(a) {
  return JSON.stringify({
    title: a.title,
    description: shortDesc(a.description),
    pubDate: a.pubDate,
    undated: a.undated || undefined,
    source: a.source,
    sourcePlace: a.sourcePlace,
    topics: a.topics?.length ? a.topics : undefined,
    paywall: a.paywall || undefined,
    opinion: a.opinion || undefined,
    image: a.image || undefined,
  });
}

/* ---- Writing (collector only) ----
   Adds any story not already on the shelf. A story already there keeps its
   original copy, so an edited headline doesn't shuffle it around. */
export async function storeArticles(bucket, label, articles) {
  if (!archiveEnabled() || !articles?.length) return { added: 0 };
  const now = Date.now();
  const cutoff = now - RETENTION_DAYS * DAY;
  const fresh = [];
  const seen = new Set();
  for (const a of articles) {
    if (!a?.link || seen.has(a.link)) continue;
    seen.add(a.link);
    let t = new Date(a.pubDate).getTime();
    if (!Number.isFinite(t)) t = now;
    if (t < cutoff) continue;
    fresh.push({ a, t });
  }
  if (!fresh.length) return { added: 0 };

  const z = `z:${bucket}`, h = `h:${bucket}`;
  const [scores] = await pipeline([["ZMSCORE", z, ...fresh.map((f) => f.a.link)]]);
  const toAdd = fresh.filter((_, i) => scores?.[i] === null || scores?.[i] === undefined);
  if (!toAdd.length) return { added: 0 };

  const iso = new Date(now).toISOString();
  const zadd = ["ZADD", z];
  const hset = ["HSET", h];
  for (const { a, t } of toAdd) {
    // An undated story is dated by when we first saw it, once, and keeps it.
    const stored = a.undated ? { ...a, pubDate: iso } : a;
    zadd.push(a.undated ? now : t, a.link);
    hset.push(a.link, slim(stored));
  }
  await pipeline([zadd, hset, ["HSET", "archive:buckets", bucket, JSON.stringify({ name: label, lastAdded: iso })]]);
  return { added: toAdd.length };
}

/* ---- Reading (every feed request) ----
   Everything on these shelves published since `sinceMs`. Two round trips:
   which links are in the window, then the stories themselves. Kept in
   memory for a few minutes, since the CDN may ask for the same town several
   times in a row for its three tabs. */
const readMemo = new Map();
const READ_MEMO_MS = 4 * 60 * 1000;

export async function readArticles(buckets, sinceMs, perBucket = 400) {
  if (!archiveEnabled() || !buckets.length) return { articles: [], buckets: 0 };
  const since = Math.floor(sinceMs / 600000) * 600000;       // round to 10 min so the memo hits
  const key = `${buckets.slice().sort().join(",")}|${since}`;
  const hit = readMemo.get(key);
  if (hit && Date.now() - hit.at < READ_MEMO_MS) return hit.value;

  try {
    const ranges = await pipeline(buckets.map((b) => ["ZREVRANGEBYSCORE", `z:${b}`, "+inf", since, "LIMIT", 0, perBucket]));
    const wanted = buckets.map((b, i) => ({ b, links: ranges[i] || [] })).filter((x) => x.links.length);
    const bodies = wanted.length ? await pipeline(wanted.map((x) => ["HMGET", `h:${x.b}`, ...x.links])) : [];
    const articles = [];
    wanted.forEach((x, i) => {
      (bodies[i] || []).forEach((raw, j) => {
        if (!raw) return;
        try {
          const a = JSON.parse(raw);
          articles.push({ ...a, link: a.link || x.links[j], topics: a.topics || [], bucket: x.b });
        } catch { /* skip a damaged entry */ }
      });
    });
    const value = { articles, buckets: wanted.length };
    readMemo.set(key, { at: Date.now(), value });
    return value;
  } catch (err) {
    console.warn("[debrief.to] archive read failed:", err?.message);
    return { articles: [], buckets: 0, error: err?.message };
  }
}

/* ---- Active towns ----
   A town is added the first time anyone picks it, and stays. Returns true
   when this call is what added it, so the feed route can seed its shelf
   straight away instead of waiting for the next collector run. */
const knownActive = new Set();
export async function activateTown(slug) {
  if (!archiveEnabled() || !slug || knownActive.has(slug)) return false;
  try {
    const [added] = await pipeline([["ZADD", "archive:active", "NX", Date.now(), slug]]);
    knownActive.add(slug);
    return added === 1;
  } catch {
    return false;
  }
}

export async function activeTowns() {
  if (!archiveEnabled()) return [];
  try {
    const [slugs] = await pipeline([["ZRANGE", "archive:active", 0, -1]]);
    return slugs || [];
  } catch {
    return [];
  }
}

/* ---- The 33-day rule ----
   Once a day, every publication's shelf loses anything published more than
   33 days ago (a little over the Month tab), and a shelf left empty is forgotten entirely. */
export async function trimAll(days = RETENTION_DAYS) {
  if (!archiveEnabled()) return { removed: 0 };
  const cutoff = Date.now() - days * DAY;
  const [buckets] = await pipeline([["HKEYS", "archive:buckets"]]);
  let removed = 0;
  for (let i = 0; i < (buckets || []).length; i += 25) {
    const slice = buckets.slice(i, i + 25);
    const old = await pipeline(slice.map((b) => ["ZRANGEBYSCORE", `z:${b}`, "-inf", `(${cutoff}`, "LIMIT", 0, 2000]));
    const cmds = [];
    slice.forEach((b, j) => {
      const links = old[j] || [];
      if (links.length) {
        cmds.push(["HDEL", `h:${b}`, ...links]);
        cmds.push(["ZREMRANGEBYSCORE", `z:${b}`, "-inf", `(${cutoff}`]);
        removed += links.length;
      }
    });
    if (cmds.length) await pipeline(cmds);
    const sizes = await pipeline(slice.map((b) => ["ZCARD", `z:${b}`]));
    const empty = slice.filter((_, j) => !sizes[j]);
    if (empty.length) await pipeline([["HDEL", "archive:buckets", ...empty], ...empty.map((b) => ["DEL", `h:${b}`])]);
  }
  return { removed };
}

/* ---- How full is it ----
   Redis reports its own memory use. The plan's size comes from the
   database when it says (maxmemory), otherwise ARCHIVE_CAPACITY_MB, otherwise
   the free plan's 30 MB. */
export async function memoryUsage() {
  if (!archiveEnabled()) return null;
  try {
    const [info] = await pipeline([["INFO", "memory"]]);
    const field = (name) => {
      const m = String(info || "").match(new RegExp(`^${name}:(\\d+)`, "m"));
      return m ? Number(m[1]) : 0;
    };
    const used = field("used_memory");
    const cap = field("maxmemory") || Number(process.env.ARCHIVE_CAPACITY_MB || 30) * 1048576;
    if (!used) return null;
    return { usedMB: +(used / 1048576).toFixed(2), capacityMB: +(cap / 1048576).toFixed(1), percent: Math.round((used / cap) * 100) };
  } catch {
    return null;
  }
}

/* If the database is past 85% full, drop the oldest days three at a time
   until it is under 75%, stopping at three weeks. Stories from the last
   21 days are never touched, whatever happens. */
const FULL = 85, ROOMY = 75, FLOOR_DAYS = 21;
export async function makeRoom() {
  let mem = await memoryUsage();
  if (!mem || mem.percent < FULL) return { retentionDays: RETENTION_DAYS, memory: mem };
  let days = RETENTION_DAYS;
  let removed = 0;
  while (days > FLOOR_DAYS && mem && mem.percent >= ROOMY) {
    days = Math.max(FLOOR_DAYS, days - 3);
    removed += (await trimAll(days)).removed;
    mem = await memoryUsage();
  }
  await setState({ retentionInForce: String(days) }).catch(() => {});
  return { retentionDays: days, removed, memory: mem };
}

/* ---- The collector's notebook ---- */
export async function getState() {
  if (!archiveEnabled()) return {};
  try {
    const [flat] = await pipeline([["HGETALL", "archive:state"]]);
    const out = {};
    for (let i = 0; i < (flat || []).length; i += 2) out[flat[i]] = flat[i + 1];
    return out;
  } catch {
    return {};
  }
}

export async function setState(fields) {
  if (!archiveEnabled()) return;
  const cmd = ["HSET", "archive:state"];
  for (const [k, v] of Object.entries(fields)) cmd.push(k, typeof v === "string" ? v : JSON.stringify(v));
  await pipeline([cmd]);
}

/* ---- For /api/health ---- */
export async function archiveStats() {
  if (!archiveEnabled()) return { enabled: false, backend: archiveBackend() };
  try {
    const memory = await memoryUsage();
    const [bucketMap, active, state] = await pipeline([
      ["HGETALL", "archive:buckets"],
      ["ZCARD", "archive:active"],
      ["HGETALL", "archive:state"],
    ]);
    const buckets = [];
    for (let i = 0; i < (bucketMap || []).length; i += 2) buckets.push(bucketMap[i]);
    const sizes = buckets.length ? await pipeline(buckets.map((b) => ["ZCARD", `z:${b}`])) : [];
    const oldest = buckets.length ? await pipeline(buckets.map((b) => ["ZRANGE", `z:${b}`, 0, 0, "WITHSCORES"])) : [];
    const oldestMs = Math.min(...oldest.map((o) => Number(o?.[1])).filter(Number.isFinite));
    const st = {};
    for (let i = 0; i < (state || []).length; i += 2) st[state[i]] = state[i + 1];
    let lastRun = null;
    try { lastRun = st.lastRun ? JSON.parse(st.lastRun) : null; } catch { lastRun = st.lastRun; }
    return {
      enabled: true,
      backend: archiveBackend(),
      retentionDays: RETENTION_DAYS,
      activeTowns: active || 0,
      publications: buckets.length,
      storiesStored: sizes.reduce((n, x) => n + (Number(x) || 0), 0),
      oldestStoryDaysAgo: Number.isFinite(oldestMs) ? Math.floor((Date.now() - oldestMs) / DAY) : null,
      memory: memory ? { ...memory, warning: memory.percent >= FULL ? "nearly full — oldest days are being trimmed early" : undefined } : null,
      retentionInForce: Number(st.retentionInForce) || RETENTION_DAYS,
      lastCollectorRun: lastRun,
      lastTrimDay: st.lastTrimDay || null,
    };
  } catch (err) {
    return { enabled: true, backend: archiveBackend(), error: err?.message };
  }
}
