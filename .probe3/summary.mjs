import { readFileSync } from "node:fs";
const groups = {};
for (const f of process.argv.slice(2)) {
  const g = f.replace(/^lh-/, "").replace(/-run\d+\.json$/, "");
  let r; try { r = JSON.parse(readFileSync(f, "utf8")); } catch { continue; }
  if (!r.categories?.performance) { console.log("unusable:", f, r.runtimeError?.message || ""); continue; }
  (groups[g] ||= []).push(r);
}
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
for (const [g, rs] of Object.entries(groups).sort()) {
  const perf = rs.map((r) => Math.round(r.categories.performance.score * 100));
  const lcp = rs.map((r) => r.audits["largest-contentful-paint"].numericValue);
  const fcp = rs.map((r) => r.audits["first-contentful-paint"].numericValue);
  console.log(`\n=== ${g} (${rs.length} runs) perf ${perf.join(",")} -> median ${med(perf)} | LCP ${lcp.map((x) => (x / 1000).toFixed(2)).join(",")} s -> median ${(med(lcp) / 1000).toFixed(2)} s | FCP median ${(med(fcp) / 1000).toFixed(2)} s`);
  const r = rs[0];
  const disc = r.audits["lcp-discovery-insight"];
  const chk = disc?.details?.items?.find((i) => i.type === "checklist");
  if (chk) console.log("  LCP photo checklist:", Object.entries(chk.items).map(([k, v]) => `${v.label}: ${v.value ? "yes" : "NO"}`).join(" | "));
  const node = disc?.details?.items?.find((i) => i.type === "node");
  if (node) console.log("  LCP element:", (node.snippet || "").slice(0, 160));
  const br = r.audits["lcp-breakdown-insight"]?.details?.items?.find((i) => i.type === "table");
  if (br) console.log("  LCP breakdown:", br.items.map((i) => `${i.label || i.subpart}: ${Math.round(i.duration)} ms`).join(" | "));
  const imgs = (r.audits["network-requests"]?.details?.items || []).filter((i) => i.resourceType === "Image" && !i.url.startsWith("http://localhost")).sort((a, b) => a.networkRequestTime - b.networkRequestTime).slice(0, 4);
  for (const i of imgs) console.log(`  photo request at ${Math.round(i.networkRequestTime)} ms, priority ${i.priority}: ${i.url.slice(0, 90)}`);
}
