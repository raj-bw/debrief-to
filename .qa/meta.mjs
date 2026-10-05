// Search-engine and sharing metadata, plus HTML validation (W3C Nu validator
// and html-validate) of the server's HTML and the page as rendered.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const BASE = process.env.BASE || "https://debrief.to";
const UA = "DebriefTO-QA/1.0 (+https://debrief.to)";
const out = (ok, name, detail = "") => console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
const note = (name, detail) => console.log(`NOTE ${name}: ${detail}`);

const res = await fetch(BASE + "/", { headers: { "User-Agent": UA } });
const html = await res.text();
writeFileSync("ssr.html", html);
const meta = (attr, name) => {
  const re = new RegExp(`<meta[^>]+${attr}="${name}"[^>]*>`, "i");
  const tag = html.match(re)?.[0];
  return tag ? (tag.match(/content="([^"]*)"/i)?.[1] ?? "") : null;
};
const title = html.match(/<title>([^<]*)<\/title>/i)?.[1];
out(!!title && title.length <= 65, "title present and ≤ 65 characters", `${title?.length} chars: ${title}`);
const desc = meta("name", "description");
out(!!desc && desc.length >= 70 && desc.length <= 160, "meta description 70–160 characters", `${desc?.length} chars`);
out(/<html[^>]+lang="[a-z]{2}/i.test(html), "html lang attribute", html.match(/<html[^>]*>/)?.[0]);
out(!!meta("name", "viewport"), "viewport meta", meta("name", "viewport"));
out(!/user-scalable=no|maximum-scale=1(\.0)?[",]/i.test(meta("name", "viewport") || ""), "viewport allows zoom (WCAG 1.4.4)");
const canonical = html.match(/<link[^>]+rel="canonical"[^>]*>/i)?.[0];
out(!!canonical, "canonical link", canonical || "missing");
out(meta("name", "robots") === null || !/noindex/i.test(meta("name", "robots")), "not marked noindex", meta("name", "robots") || "(no robots meta)");
out(!!meta("name", "theme-color"), "theme-color meta", meta("name", "theme-color") || "missing");
out(/<link[^>]+rel="manifest"/i.test(html), "manifest linked from the page");
out(/<link[^>]+rel="apple-touch-icon"/i.test(html), "apple-touch-icon linked");
out(/<link[^>]+rel="(shortcut )?icon"/i.test(html), "favicon linked in the server HTML", "the tab icon is added by script after load");
for (const p of ["og:title", "og:description", "og:image", "og:url", "og:type", "og:site_name", "og:locale", "og:image:alt"]) {
  out(meta("property", p) !== null, `Open Graph ${p}`, meta("property", p) || "missing");
}
for (const p of ["twitter:card", "twitter:title", "twitter:image"]) out(meta("name", p) !== null, `Twitter ${p}`, meta("name", p) || "missing");
const ogImage = meta("property", "og:image");
if (ogImage) {
  const r = await fetch(ogImage, { headers: { "User-Agent": UA } });
  const buf = Buffer.from(await r.arrayBuffer());
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  out(r.ok && w === 1200 && h === 630, "share image is 1200×630 and loads", `${r.status} ${r.headers.get("content-type")} ${w}×${h} ${buf.length} bytes`);
}
const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
try { const j = ld.map((s) => JSON.parse(s)); out(j.length > 0 && j[0]["@type"], "JSON-LD parses", JSON.stringify(j).slice(0, 200)); }
catch (e) { out(false, "JSON-LD parses", e.message); }

// What a crawler sees before any script runs
const text = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
note("words of text in the server HTML (before scripts)", `${text.split(" ").length}: "${text.slice(0, 300)}"`);
out(/<h1[\s>]/i.test(html), "an h1 in the server HTML");
note("server HTML size", `${html.length} bytes, ${(html.match(/<script/g) || []).length} script tags`);

// --- W3C Nu HTML Checker (validator.w3.org/nu), the reference validator ---
async function nu(file, label) {
  if (!existsSync(file)) return;
  try {
    const r = await fetch("https://validator.w3.org/nu/?out=json", { method: "POST", headers: { "Content-Type": "text/html; charset=utf-8", "User-Agent": UA }, body: readFileSync(file) });
    const j = await r.json();
    const errs = j.messages.filter((m) => m.type === "error");
    const warns = j.messages.filter((m) => m.type === "info" && m.subType === "warning");
    console.log(`\n--- Nu validator, ${label}: ${errs.length} errors, ${warns.length} warnings`);
    const group = new Map();
    for (const m of [...errs, ...warns]) { const k = `${m.type === "error" ? "error" : "warning"}: ${m.message}`; group.set(k, (group.get(k) || { n: 0, ex: m.extract })); group.get(k).n++; }
    for (const [k, v] of group) console.log(`  ${v.n}× ${k.slice(0, 220)}\n      e.g. ${(v.ex || "").replace(/\s+/g, " ").slice(0, 160)}`);
  } catch (e) { console.log(`Nu validator unavailable for ${label}: ${e.message}`); }
  await new Promise((r) => setTimeout(r, 2000));
}
await nu("ssr.html", "server HTML of /");
await nu("rendered-feed.html", "feed as rendered");
await nu("rendered-about.html", "About as rendered");

// --- html-validate (standard + a11y rule sets) ---
writeFileSync(".htmlvalidate.json", JSON.stringify({ extends: ["html-validate:standard", "html-validate:a11y"], rules: { "no-inline-style": "off" } }));
for (const f of ["ssr.html", "rendered-feed.html", "rendered-about.html"]) {
  if (!existsSync(f)) continue;
  let report = "";
  try { execSync(`npx html-validate -f json ${f}`, { stdio: "pipe" }); report = "[]"; } catch (e) { report = e.stdout.toString(); }
  let msgs = [];
  try { msgs = JSON.parse(report).flatMap((r) => r.messages); } catch { console.log(report.slice(0, 500)); }
  const group = new Map();
  for (const m of msgs) { const k = `${m.ruleId}: ${m.message.replace(/"[^"]{30,}"/g, '"…"')}`; const g = group.get(k) || { n: 0, sel: m.selector }; g.n++; group.set(k, g); }
  console.log(`\n--- html-validate, ${f}: ${msgs.length} messages`);
  for (const [k, v] of [...group].sort((a, b) => b[1].n - a[1].n).slice(0, 25)) console.log(`  ${v.n}× ${k.slice(0, 200)}  (${(v.sel || "").slice(0, 80)})`);
}
