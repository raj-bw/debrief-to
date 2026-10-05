// Site-wide feed health, 5 Oct 2026. Read-only.
//   A. The site's own /api/health, every feed, page by page, from Vercel.
//   B. How many hours of news each shared feed holds, against the real gaps
//      between collector runs.
//   C. /api/feed and /api/council for a spread of towns.
import { SOURCES } from "../app/lib/sources.js";
import { publisherFeeds, townOptions } from "../app/lib/towns.js";
import { fetchItems } from "../app/lib/fetch-feed.js";

const SITE = "https://debrief.to";
const auth = process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_GAP_H = Number(process.env.MAX_GAP_H || 9.4);

// ---------- A ----------
console.log(`===== A. /api/health from Vercel (${auth.Authorization ? "with" : "WITHOUT"} the secret) =====`);
const pages = [["national and standing", "scope=standing"]];
for (let o = 0; o < 56; o += 28) pages.push([`regional ${o}-${o + 27}`, `offset=${o}&limit=28`]);
for (let o = 0; o < 145; o += 30) pages.push([`town ${o}-${o + 29}`, `towns=1&offset=${o}&limit=30`]);
const all = { answering: [], failing: [], empty: [], stale: [], notChecked: [], neededHonestName: [] };
let archive = null;
for (const [label, q] of pages) {
  const t = Date.now();
  let r, j;
  try { r = await fetch(`${SITE}/api/health?${q}`, { headers: auth, signal: AbortSignal.timeout(320000) }); j = await r.json(); }
  catch (e) { console.log(`${label}: request failed (${e.message})`); continue; }
  console.log(`${label}: HTTP ${r.status} in ${Math.round((Date.now() - t) / 1000)}s — ${j.summary || j.error}`);
  for (const k of Object.keys(all)) all[k].push(...(j[k] || []));
  archive = j.archive || archive;
  await sleep(5000);
}
const n = all.answering.length + all.failing.length + all.notChecked.length;
console.log(`\nTOTAL: ${n} feeds — ${all.answering.length} answering, ${all.failing.length} failing, ${all.empty.length} empty, ${all.stale.length} stale (>30 days), ${all.notChecked.length} not checked`);
for (const f of all.failing) console.log(`FAILING  ${f.name}  ${f.url}  — ${String(f.error).replace(/\s+/g, " ").slice(0, 120)}`);
for (const f of all.empty) console.log(`EMPTY    ${f.name}  (filtered ${f.filteredFrom ?? "?"} stories; categories seen: ${(f.categoriesSeen || []).slice(0, 6).join(", ")})`);
for (const f of all.stale) console.log(`STALE    ${f.name}  newest ${f.daysSinceNewest} days ago`);
for (const f of all.notChecked) console.log(`NOT CHECKED ${f.name || JSON.stringify(f)}`);
const quiet = all.answering.filter((f) => f.daysSinceNewest !== null && f.daysSinceNewest > 7 && f.daysSinceNewest <= 30);
for (const f of quiet) console.log(`QUIET    ${f.name}  newest ${f.daysSinceNewest} days ago (${f.items} items)`);
console.log(`needed the honest name: ${all.neededHonestName.length} (${all.neededHonestName.slice(0, 12).join(", ")}${all.neededHonestName.length > 12 ? ", …" : ""})`);
const viaApi = all.answering.filter((f) => f.door === "api").map((f) => f.name);
if (viaApi.length) console.log(`answered through the WordPress API fallback: ${viaApi.join(", ")}`);
if (archive) {
  console.log("\n===== Archive =====");
  const { lastCollectorRun: l, secondNetwork: sn, memory, ...rest } = archive;
  console.log(JSON.stringify(rest));
  console.log("memory:", JSON.stringify(memory));
  console.log("last collector run:", JSON.stringify(l));
  console.log("second network:", Object.entries(sn || {}).map(([k, v]) => `${k} ${v.at.slice(0, 16)} +${v.added}`).join(" | "));
}

// ---------- B ----------
console.log(`\n===== B. Hours of news each shared feed holds (collector's longest recent gap: ${MAX_GAP_H} h) =====`);
const shared = [...SOURCES, ...publisherFeeds("region")];
const seen = new Set();
const windows = [];
for (const src of shared) {
  if (seen.has(src.name)) continue; seen.add(src.name);
  try {
    const { items } = await fetchItems(src, { fresh: true, patient: true });
    const ts = items.map((i) => Date.parse(i.isoDate || i.pubDate)).filter(Number.isFinite).sort((a, b) => b - a);
    if (ts.length < 2) { windows.push({ name: src.name, items: items.length, hours: null }); continue; }
    const hours = (ts[0] - ts[ts.length - 1]) / 3600000;
    // stories in the busiest stretch the length of the longest gap
    let busiest = 0;
    for (let i = 0; i < ts.length; i++) { let j = i; while (j < ts.length && ts[i] - ts[j] <= MAX_GAP_H * 3600000) j++; busiest = Math.max(busiest, j - i); }
    windows.push({ name: src.name, items: ts.length, hours, busiest });
  } catch (e) { windows.push({ name: src.name, error: String(e.message || e).slice(0, 60) }); }
}
windows.sort((a, b) => (a.hours ?? 1e9) - (b.hours ?? 1e9));
for (const w of windows) {
  if (w.error) { console.log(`  ${w.name.padEnd(34)} (not readable from GitHub: ${w.error})`); continue; }
  const flag = w.hours !== null && w.hours < MAX_GAP_H ? "AT RISK " : w.hours !== null && w.hours < 24 ? "tight   " : "ok      ";
  console.log(`${flag}${w.name.padEnd(34)} ${String(w.items).padStart(3)} stories cover ${w.hours === null ? "?" : w.hours.toFixed(1).padStart(6)} h${w.busiest ? `; busiest ${MAX_GAP_H} h held ${w.busiest}` : ""}`);
}

// ---------- C ----------
console.log("\n===== C. Feed and council for a spread of towns =====");
const opts = townOptions();
const want = ["newmarket", "toronto", "sarnia", "brant", "kirkland-lake", "norfolk", "espanola", "ottawa", "hamilton", "barrie", "london",
  "kingston", "greater-sudbury", "thunder-bay", "windsor", "guelph", "kitchener", "mississauga", "oakville", "peterborough", "north-bay",
  "timmins", "sault-ste-marie", "kenora", "owen-sound", "stratford", "belleville", "cobourg", "orillia", "goderich", "st-thomas", "huntsville", "pembroke"];
for (const slug of want) {
  const opt = opts.find((o) => o.slug === slug);
  if (!opt) { console.log(`${slug}: not a town slug`); continue; }
  try {
    const f = await (await fetch(`${SITE}/api/feed?town=${slug}&range=week`, { signal: AbortSignal.timeout(60000) })).json();
    const local = f.town?.label ? f.articles.filter((a) => (a.places || []).includes(f.town.label)) : [];
    const newest = f.articles.length ? Math.round((Date.now() - Date.parse(f.articles[0].pubDate)) / 3600000) : null;
    const c = await (await fetch(`${SITE}/api/council?town=${slug}`, { signal: AbortSignal.timeout(60000) })).json();
    const council = c.available === false ? "no council calendar" : c.error ? `calendar error: ${String(c.error).slice(0, 50)}` : `${(c.meetings || []).length} meetings ahead`;
    console.log(`${(f.town?.label ? "OK  " : "--  ")}${slug.padEnd(16)} tab "${f.town?.label || "(none)"}"${f.town?.usingRegion ? " (regional fallback)" : ""}${f.town?.fellBackBecauseFeedFailed ? " FEED FAILED" : ""} | ${f.articles.length} stories this week, ${local.length} local, newest ${newest}h ago | sources failing: ${(f.errors || []).map((e) => e.source).join(", ") || "none"} | council: ${council}`);
  } catch (e) { console.log(`${slug}: ${e.message}`); }
  await sleep(1500);
}
process.exit(0);
