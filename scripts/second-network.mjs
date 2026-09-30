/* ---- The second network ----
   Run by the "Keep the archive filling" GitHub Action, right after it calls
   the collector. The collector's answer lists, under `retryElsewhere`, the
   Metroland/Torstar feeds that turned Vercel away with "too many requests".
   Their platform allows each network address only so much, and Vercel's
   addresses are shared with thousands of other sites; GitHub's are a
   different crowd. So each of those feeds is asked once more from here —
   one at a time, a few seconds apart, under the site's honest name — and
   whatever answers is posted to /api/deliver, which files it exactly as the
   collector would have.

   Anything still refused gets one more try after a rest, then is left for
   the next run. Nothing here fails the workflow: this is a second chance,
   not the main road.

   Usage: node scripts/second-network.mjs <collector-answer.json> */

import { readFileSync } from "node:fs";

const SITE = process.env.DEBRIEF_SITE || "https://debrief.to";
const HONEST_UA = "DebriefTO/1.0 (+https://debrief.to; free local news reader)";
const ACCEPT_XML = "application/rss+xml, application/atom+xml, application/xml, text/xml, */*";
const GAP_MS = Number(process.env.GAP_MS || 5000);     // between requests to the platform
const REST_MS = Number(process.env.REST_MS || 30000);  // before the one retry of anything refused
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const secret = process.env.CRON_SECRET;
let urls = [];
try {
  urls = JSON.parse(readFileSync(process.argv[2] || "out.json", "utf8")).retryElsewhere || [];
} catch (err) {
  console.log(`No collector answer to read (${err.message}); nothing to do.`);
  process.exit(0);
}
if (!urls.length) { console.log("Every Metroland/Torstar paper answered Vercel; nothing to ask again."); process.exit(0); }
if (!secret) { console.log("::warning::CRON_SECRET isn't set, so /api/deliver would refuse; skipping."); process.exit(0); }

const nameOf = (url) => { try { return new URL(url).host.replace(/^www\./, ""); } catch { return url; } };

async function ask(url) {
  const res = await fetch(url, { headers: { "User-Agent": HONEST_UA, Accept: ACCEPT_XML }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) return { refused: res.status };
  const xml = await res.text();
  if (!/<item[\s>]/.test(xml)) return { refused: "no stories in the answer" };
  const post = await fetch(`${SITE}/api/deliver`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, xml }),
    signal: AbortSignal.timeout(40000),
  });
  const answer = await post.json().catch(() => ({}));
  if (!post.ok) return { deliveryFailed: `${post.status} ${answer.error || ""}`.trim() };
  return { stored: answer.stored || [] };
}

async function round(list) {
  const again = [];
  for (const [i, url] of list.entries()) {
    if (i) await sleep(GAP_MS);
    let r;
    try { r = await ask(url); } catch (err) { r = { refused: err.message }; }
    if (r.stored) {
      const s = r.stored.map((x) => `${x.name}: ${x.items} stories, ${x.added} new`).join("; ");
      console.log(`✓ ${nameOf(url)} — ${s}`);
      delivered++;
    } else if (r.refused === 429) {
      console.log(`… ${nameOf(url)} — 429 from here too`);
      again.push(url);
    } else {
      console.log(`✗ ${nameOf(url)} — ${r.refused ?? r.deliveryFailed}`);
    }
  }
  return again;
}

let delivered = 0;
console.log(`Asking ${urls.length} Metroland/Torstar feed(s) again from GitHub's network.`);
const refused = await round(urls);
if (refused.length) {
  console.log(`Resting ${REST_MS / 1000}s, then one more try for ${refused.length}.`);
  await sleep(REST_MS);
  await round(refused);
}
console.log(`Second network: ${delivered} of ${urls.length} delivered.`);
