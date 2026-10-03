// Prints the scores, the Core Web Vitals and every audit that didn't pass
// from Lighthouse JSON reports.
import { readFileSync } from "node:fs";
for (const f of process.argv.slice(2)) {
  let r; try { r = JSON.parse(readFileSync(f, "utf8")); } catch (e) { console.log(`${f}: unreadable (${e.message})`); continue; }
  console.log(`\n===== Lighthouse ${r.lighthouseVersion}: ${f} (${r.configSettings.formFactor}) ${r.finalDisplayedUrl} =====`);
  if (r.runtimeError) console.log(`runtime error: ${r.runtimeError.message}`);
  console.log(Object.values(r.categories).map((c) => `${c.title} ${Math.round((c.score ?? 0) * 100)}`).join(" | "));
  const m = (id) => r.audits[id]?.displayValue || "-";
  console.log(`FCP ${m("first-contentful-paint")} | LCP ${m("largest-contentful-paint")} | TBT ${m("total-blocking-time")} | CLS ${m("cumulative-layout-shift")} | SI ${m("speed-index")} | TTI ${m("interactive")}`);
  const lcpEl = r.audits["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node;
  if (lcpEl) console.log(`LCP element: ${lcpEl.snippet?.slice(0, 160)}`);
  const weights = r.audits["total-byte-weight"]?.displayValue; if (weights) console.log(`page weight: ${weights}`);
  for (const cat of Object.values(r.categories)) {
    const bad = cat.auditRefs.map((ref) => r.audits[ref.id]).filter((a) => a && a.score !== null && a.score < 0.9 && !["notApplicable", "manual", "informative"].includes(a.scoreDisplayMode));
    if (!bad.length) continue;
    console.log(`-- ${cat.title}: ${bad.length} not passing`);
    for (const a of bad) {
      console.log(`  [${a.score}] ${a.id}: ${a.title}${a.displayValue ? " — " + a.displayValue : ""}`);
      for (const it of (a.details?.items || []).slice(0, 3)) {
        const s = it.node?.snippet || it.url || it.source?.url || it.description || it.label || JSON.stringify(it).slice(0, 140);
        console.log(`      · ${String(s).replace(/\s+/g, " ").slice(0, 170)}${it.wastedBytes ? ` (save ${Math.round(it.wastedBytes / 1024)} KiB)` : ""}${it.wastedMs ? ` (save ${Math.round(it.wastedMs)} ms)` : ""}`);
      }
    }
  }
}
