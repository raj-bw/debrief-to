/* The newsroom list is hand-edited data, and a slip in it fails quietly: a
   misspelled town just never gets its paper, a removed source leaves its
   About-page entry behind. These checks catch that before it goes live. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PUBLISHERS } from "../app/lib/publishers.js";
import { SOURCES } from "../app/lib/sources.js";
import { NEWSROOM_REGION, HOMEPAGE_OVERRIDE, REGION_ORDER } from "../app/lib/regions.js";
import { PICKS } from "../app/lib/picks.js";
import { UNMATCHED_SERVES, townOptions, resolveTown, publisherFeeds, localNewsrooms, PLACE_COUNT } from "../app/lib/towns.js";

const isHttps = (u) => { try { return new URL(u).protocol === "https:"; } catch { return false; } };
const WAYS_IN = ["urls", "wp", "village", "blox"];

test("every publisher has a name and exactly one way in", () => {
  for (const p of PUBLISHERS) {
    assert.ok(p.name && typeof p.name === "string", `a publisher without a name: ${JSON.stringify(p).slice(0, 80)}`);
    const ways = WAYS_IN.filter((k) => p[k]);
    assert.equal(ways.length, 1, `${p.name} has ${ways.length ? ways.join(" and ") : "no"} way in (one of ${WAYS_IN.join(", ")})`);
  }
});

test("publisher and source names are unique", () => {
  const names = [...PUBLISHERS, ...SOURCES].map((p) => p.name);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  assert.deepEqual(dupes, [], `listed twice: ${dupes.join(", ")}`);
});

test("feed addresses are https", () => {
  for (const p of [...PUBLISHERS, ...SOURCES]) {
    for (const u of p.urls || []) assert.ok(isHttps(u), `${p.name}: ${u}`);
    if (p.wp) assert.ok(isHttps(p.wp.api), `${p.name}: ${p.wp.api}`);
    if (p.fallback?.api) assert.ok(isHttps(p.fallback.api), `${p.name} fallback: ${p.fallback.api}`);
  }
});

test("WordPress API entries name a category id and its slug", () => {
  for (const p of PUBLISHERS.filter((x) => x.wp)) {
    assert.ok(Number.isInteger(p.wp.categoryId) && p.wp.categoryId > 0, `${p.name}: categoryId`);
    assert.match(p.wp.category || "", /^[a-z0-9-]+$/, `${p.name}: category slug`);
  }
});

test("`pages` is only on plain RSS, between 2 and 5", () => {
  for (const p of PUBLISHERS.filter((x) => "pages" in x)) {
    assert.ok(p.urls, `${p.name}: pages only works with urls`);
    assert.ok(Number.isInteger(p.pages) && p.pages >= 2 && p.pages <= 5, `${p.name}: pages = ${p.pages}`);
  }
});

test("every town a publisher serves is a real Ontario municipality", () => {
  assert.deepEqual(UNMATCHED_SERVES, [], `not matched to a municipality: ${UNMATCHED_SERVES.join("; ")}`);
  for (const p of PUBLISHERS.filter((x) => x.home)) {
    assert.ok((p.serves || []).includes(p.home), `${p.name}: home "${p.home}" is not in its serves list`);
  }
});

test("every municipality gets at least one newsroom", () => {
  const towns = townOptions();
  // All but Toronto, which has its own tab rather than being a hometown
  assert.equal(towns.length, PLACE_COUNT - 1);
  assert.ok(!towns.some((t) => t.slug === "toronto"));
  const bare = towns.filter((t) => { const r = resolveTown(t.slug); return !(r.feeds?.length || r.regionFeeds?.length); });
  assert.deepEqual(bare.map((t) => t.name), []);
});

test("an unknown town falls back to the default rather than failing", () => {
  assert.equal(resolveTown("no-such-town").slug, "newmarket");
});

test("region and homepage notes refer to newsrooms that exist", () => {
  const known = new Set([
    ...publisherFeeds().map((f) => f.name.match(/\(([^)]*)\)$/)?.[1] ?? f.name),
    ...SOURCES.map((s) => s.name),
    ...localNewsrooms().map((n) => n.name),
  ]);
  const stale = [...Object.keys(NEWSROOM_REGION), ...Object.keys(HOMEPAGE_OVERRIDE)].filter((n) => !known.has(n));
  assert.deepEqual(stale, [], "left behind after a newsroom was renamed or removed");
  const noRegion = localNewsrooms().filter((n) => !NEWSROOM_REGION[n.name]).map((n) => n.name);
  assert.deepEqual(noRegion, [], "local newsrooms the About page can't place in a region");
  const unknownRegions = [...new Set(Object.values(NEWSROOM_REGION))].filter((r) => !REGION_ORDER.includes(r));
  assert.deepEqual(unknownRegions, []);
});

test("standing sources have a place and a colour", () => {
  for (const s of SOURCES) {
    assert.ok(["Toronto", "Ontario", "Canada"].includes(s.place), `${s.name}: place ${s.place}`);
    assert.match(s.color || "", /^#[0-9A-Fa-f]{6}$/, `${s.name}: colour`);
  }
});

test("the About page's standing list matches the sources", () => {
  // app/page.js keeps its own copy (with funding labels) for the About page.
  const page = readFileSync(new URL("../app/page.js", import.meta.url), "utf8");
  const block = page.slice(page.indexOf("const PUBLISHERS = ["), page.indexOf("];", page.indexOf("const PUBLISHERS = [")));
  const onAbout = [...block.matchAll(/name: "([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(onAbout, SOURCES.map((s) => s.name).sort());
});

test("Editor's Picks are well formed", () => {
  for (const p of PICKS) {
    assert.ok(isHttps(p.url), `pick url: ${p.url}`);
    assert.ok(p.title && p.source, `pick needs a title and source: ${p.url}`);
    assert.ok(Number.isFinite(Date.parse(p.published)), `published date: ${p.url}`);
    if (p.until) assert.ok(Number.isFinite(Date.parse(p.until)), `until date: ${p.url}`);
    if (p.image) assert.ok(isHttps(p.image), `image: ${p.url}`);
  }
});
