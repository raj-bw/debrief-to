/* Fills a local archive (REDIS_URL) with made-up stories for the browser
   checks: a month of Newmarket Today and a few from each standing source,
   built the same way the collector builds real ones. Photos point at
   images.test, which the browser checks answer themselves, so nothing here
   ever reaches a real newsroom. */
import { buildArticles } from "../app/lib/articles.js";
import { storeArticles, bucketFor, activateTown, archiveEnabled } from "../app/lib/archive.js";
import { resolveTown } from "../app/lib/towns.js";
import { SOURCES } from "../app/lib/sources.js";

if (!archiveEnabled()) { console.error("Set REDIS_URL to a test Redis first."); process.exit(1); }

const HOUR = 3600e3;
const words = ["Council", "Library", "Transit", "School board", "Housing", "Park", "Budget", "Hospital", "Festival", "Bridge"];
const items = (host, n, everyHours, prefix = "local-news") => Array.from({ length: n }, (_, i) => ({
  title: `${words[i % words.length]} update number ${i + 1}`,
  link: `https://${host}/${prefix}/test-story-${i + 1}`,
  isoDate: new Date(Date.now() - (i + 1) * everyHours * HOUR).toISOString(),
  contentSnippet: `A made-up story for the site's own checks, number ${i + 1}.`,
  enclosure: { url: `https://images.test/photo-${i % 5}.png` },
}));

const town = resolveTown("newmarket");
let added = 0;
for (const src of town.feeds) {
  const host = new URL(src.urls?.[0] || "https://www.newmarkettoday.ca").host;
  const built = buildArticles({ ...src, place: "home" }, items(host, 40, 15), { limit: 60 });
  added += (await storeArticles(bucketFor(src), src.name, built)).added;
}
for (const s of SOURCES) {
  const host = new URL(s.urls[0]).host;
  added += (await storeArticles("shared", s.name, buildArticles(s, items(host, 3, 20, "news"), { limit: 60 }))).added;
}
// Picked before, so the feed reads the archive rather than asking Newmarket Today
await activateTown("newmarket");
console.log(`seeded ${added} stories`);
process.exit(0);
