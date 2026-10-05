// Fills the local archive with the live site's month of Newmarket stories,
// so both builds show the same cards and the same photos.
import { readFileSync } from "node:fs";
import { storeArticles } from "../app/lib/archive.js";
const { articles } = JSON.parse(readFileSync(process.argv[2], "utf8"));
const groups = new Map();
for (const a of articles) {
  const key = `${a.bucket}\u0000${a.source}`;
  if (!groups.has(key)) groups.set(key, []);
  const { bucket, places, alsoCoveredBy, ...rest } = a;
  groups.get(key).push(rest);
}
let n = 0;
for (const [key, list] of groups) { const [bucket, label] = key.split("\u0000"); n += (await storeArticles(bucket, label, list)).added; }
console.log("stories seeded:", n, "from", articles.length); process.exit(0);
