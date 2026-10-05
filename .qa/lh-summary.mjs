// Prints the scores, the Core Web Vitals and every audit that didn't pass
// from Lighthouse JSON reports.
import { readFileSync } from "node:fs";
for (const f of process.argv.slice(2)) {
  if (/-run[23]\.json$/.test(f)) continue; // details from the first run only; medians below
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

// Median of the repeated runs, per page: one Lighthouse run on a shared
// machine can swing 20 points, so the middle of three is the number to trust.
const groups = new Map();
for (const f of process.argv.slice(2)) {
  let r; try { r = JSON.parse(readFileSync(f, "utf8")); } catch { continue; }
  const key = f.replace(/-run\d+\.json$/, "");
  const g = groups.get(key) || [];
  g.push({ perf: Math.round((r.categories.performance?.score ?? 0) * 100), a11y: Math.round((r.categories.accessibility?.score ?? 0) * 100), bp: Math.round((r.categories["best-practices"]?.score ?? 0) * 100), seo: Math.round((r.categories.seo?.score ?? 0) * 100), lcp: r.audits["largest-contentful-paint"]?.numericValue, tbt: r.audits["total-blocking-time"]?.numericValue, cls: r.audits["cumulative-layout-shift"]?.numericValue, bytes: r.audits["total-byte-weight"]?.numericValue });
  groups.set(key, g);
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
console.log("\n===== MEDIANS (performance / accessibility / best practices / SEO; LCP, TBT, CLS, page weight) =====");
for (const [k, g] of groups) {
  console.log(`${k.padEnd(26)} runs=${g.length}  perf ${g.map((x) => x.perf).join(",")} -> ${med(g.map((x) => x.perf))} | a11y ${med(g.map((x) => x.a11y))} | bp ${med(g.map((x) => x.bp))} | seo ${med(g.map((x) => x.seo))} | LCP ${(med(g.map((x) => x.lcp)) / 1000).toFixed(1)}s | TBT ${Math.round(med(g.map((x) => x.tbt)))}ms | CLS ${med(g.map((x) => x.cls)).toFixed(3)} | ${Math.round(med(g.map((x) => x.bytes)) / 1024)} KiB`);
}
