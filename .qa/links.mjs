// Do the links readers click still work? Every outbound link on the About
// page (newsroom homepages), plus one story link per source from this week's
// feeds. One request per host at a time, a few hosts at once.
import { readFileSync, existsSync } from "node:fs";

const BASE = process.env.BASE || "https://debrief.to";
const UA = "DebriefTO-linkcheck/1.0 (+https://debrief.to; checking links to your site)";
const about = existsSync("about-links.json") ? JSON.parse(readFileSync("about-links.json", "utf8")) : [];
const stories = [];
for (const town of ["newmarket", "toronto", "ottawa", "barrie", "hamilton", "kingston", "sudbury", "london"]) {
  try {
    const j = await (await fetch(`${BASE}/api/feed?town=${town}&range=week`, { headers: { "User-Agent": UA } })).json();
    const seen = new Set(stories.map((s) => s.source));
    for (const a of j.articles || []) if (!seen.has(a.source)) { seen.add(a.source); stories.push({ source: a.source, url: a.link }); }
  } catch (e) { console.log(`feed ${town}: ${e.message}`); }
}
const regDomain = (u) => { try { return new URL(u).host.replace(/^www\./, "").split(".").slice(-2).join("."); } catch { return ""; } };

async function probe(url) {
  const t = Date.now();
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,*/*" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
    r.body?.cancel?.();
    return { url, status: r.status, final: r.url, ms: Date.now() - t };
  } catch (e) { return { url, status: 0, error: (e.cause?.code || e.message || "").toString().slice(0, 80), ms: Date.now() - t }; }
}
async function run(list, label) {
  const results = [];
  const queue = [...list];
  await Promise.all(Array.from({ length: 5 }, async () => {
    while (queue.length) { const item = queue.shift(); results.push({ ...item, ...(await probe(item.url)) }); await new Promise((r) => setTimeout(r, 300)); }
  }));
  const broken = results.filter((r) => r.status === 0 || r.status === 404 || r.status === 410 || r.status >= 500);
  const blocked = results.filter((r) => [401, 403, 406, 429].includes(r.status));
  const moved = results.filter((r) => r.status && r.status < 400 && regDomain(r.final) !== regDomain(r.url));
  console.log(`\n===== ${label}: ${results.length} checked, ${broken.length} broken, ${blocked.length} refused a non-browser, ${moved.length} now on another domain =====`);
  for (const r of broken) console.log(`BROKEN ${r.status || r.error} ${r.source ? r.source + " " : ""}${r.url}`);
  for (const r of blocked) console.log(`REFUSED ${r.status} ${r.source ? r.source + " " : ""}${r.url}`);
  for (const r of moved) console.log(`MOVED ${r.url} -> ${r.final}`);
  const slow = results.filter((r) => r.ms > 8000);
  for (const r of slow) console.log(`SLOW ${r.ms}ms ${r.url}`);
}
await run(about.filter((u) => !/debrief\.to/.test(u)).map((url) => ({ url })), "About page links");
await run(stories, "One story per source (this week)");
process.exit(0);
