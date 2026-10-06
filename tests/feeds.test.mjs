/* Reading feeds, against a stand-in publisher on this machine: RSS with
   extra pages (`pages`), and the WordPress API with its own-domain rule. */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { fetchItems, fetcherForRun } from "../app/lib/fetch-feed.js";
import { newestDate } from "../app/lib/archive.js";

let server, base, sharedHits = 0;
const rss = (n0, n1) => `<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>${
  Array.from({ length: n1 - n0 }, (_, i) => `<item><title>Story ${n0 + i}</title><link>https://paper.example/story-${n0 + i}/</link><pubDate>${new Date(Date.now() - (n0 + i) * 3600e3).toUTCString()}</pubDate></item>`).join("")
}</channel></rss>`;

before(async () => {
  server = createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    if (u.pathname === "/feed") {
      const page = Number(u.searchParams.get("paged") || 1);
      // Ten stories a page; page 2 repeats one from page 1; there is no page 3
      if (page === 1) return res.end(rss(0, 10));
      if (page === 2) return res.end(rss(9, 19));
      res.statusCode = 404; return res.end("not found");
    }
    if (u.pathname === "/shared") {
      sharedHits++;
      const item = (n, cat) => `<item><title>${cat} story ${n}</title><link>https://chain.example/${cat}-${n}/</link><category>${cat}</category><pubDate>${new Date().toUTCString()}</pubDate></item>`;
      return res.end(`<?xml version="1.0"?><rss version="2.0"><channel><title>Chain</title>${item(1, "Paris")}${item(2, "Cobourg")}${item(3, "Paris")}</channel></rss>`);
    }
    if (u.pathname === "/wp-json/wp/v2/posts") {
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify([
        { link: `${base}/news/ours-1/`, title: { rendered: "Ours" }, date_gmt: "2026-10-01T12:00:00", excerpt: { rendered: "" } },
        { link: "https://sister-paper.example/news/theirs/", title: { rendered: "A sister paper's" }, date_gmt: "2026-10-01T12:00:00", excerpt: { rendered: "" } },
      ]));
    }
    res.statusCode = 404; res.end();
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test("RSS: one page by default", async () => {
  const { items } = await fetchItems({ name: "Paper", urls: [`${base}/feed`] }, { fresh: true });
  assert.equal(items.length, 10);
});

test("RSS: `pages` reads further pages, skips repeats, and stops at the last page", async () => {
  const { items } = await fetchItems({ name: "Paper", urls: [`${base}/feed`], pages: 3 }, { fresh: true });
  assert.equal(items.length, 19);
  assert.equal(new Set(items.map((i) => i.link)).size, 19);
});

test("WordPress API: only stories on the paper's own site", async () => {
  const { items } = await fetchItems({ name: "Paper", kind: "wpjson", api: base, categoryId: 5, category: "news" }, { fresh: true });
  assert.deepEqual(items.map((i) => i.title), ["Ours"]);
});

test("newestDate ignores bad and far-future dates", () => {
  const day = 864e5;
  const newest = newestDate([
    { isoDate: new Date(Date.now() - 2 * day).toISOString() },
    { pubDate: new Date(Date.now() - day).toUTCString() },
    { isoDate: new Date(Date.now() + 9 * day).toISOString() },
    { isoDate: "not a date" },
  ]);
  assert.ok(Math.abs(Date.parse(newest) - (Date.now() - day)) < 2000);
  assert.equal(newestDate([]), null);
});

test("collector: papers sharing a feed each keep their own stories, from one request", async () => {
  const fetchOnce = fetcherForRun();
  const paris = { name: "Paris paper", urls: [`${base}/shared`], onlyCategories: ["Paris"] };
  const cobourg = { name: "Cobourg paper", urls: [`${base}/shared`], onlyCategories: ["Cobourg"] };
  const [a, b] = await Promise.all([fetchOnce(paris), fetchOnce(cobourg)]);
  assert.deepEqual(a.items.map((i) => i.title), ["Paris story 1", "Paris story 3"]);
  assert.deepEqual(b.items.map((i) => i.title), ["Cobourg story 2"]);
  assert.equal(sharedHits, 1);
});
