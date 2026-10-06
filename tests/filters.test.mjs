/* What gets left out of the feed, and what gets labelled. Each case here is a
   rule the About page promises readers. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldSkip, isPaywalled, isOpinion } from "../app/lib/filters.js";

const village = { name: "Newmarket Today", kind: "village" };
const postmedia = { name: "Sarnia Observer", owner: "Postmedia" };
const plain = { name: "Some Paper" };
const skip = (src, link, title = "A council story") => shouldSkip(src, { link, title });

test("local reporting is kept", () => {
  assert.equal(skip(village, "https://www.newmarkettoday.ca/local-news/council-approves-budget-123"), false);
  assert.equal(skip(postmedia, "https://www.theobserver.ca/news/local-news/council-approves-budget"), false);
  assert.equal(skip(plain, "https://example.ca/2026/10/05/council-approves-budget/"), false);
});

test("wire copy, obituaries and paid posts are left out", () => {
  assert.equal(skip(village, "https://www.newmarkettoday.ca/national-news/ottawa-story-1"), true);
  assert.equal(skip(village, "https://www.newmarkettoday.ca/obituaries/jane-doe-1"), true);
  assert.equal(skip(plain, "https://example.ca/press-releases/new-product/"), true);
  assert.equal(skip(plain, "https://example.ca/2026/10/05/x/", "Obituary: Jane Doe"), true);
  assert.equal(skip(postmedia, "https://www.theobserver.ca/news/national/ottawa-story"), true);
});

test("syndicated columns are left out", () => {
  assert.equal(skip(village, "https://www.newmarkettoday.ca/local-news/x-1", "The Paikin Podcast: this week"), true);
  assert.equal(skip(postmedia, "https://www.theobserver.ca/opinion/x", "WARMINGTON: A column"), true);
});

test("Seaway News's sponsored posts are left out", () => {
  const seaway = { name: "Seaway News" };
  assert.equal(skip(seaway, "https://www.cornwallseawaynews.com/publi-t/5-best-gyms-in-montreal/"), true);
  assert.equal(skip(seaway, "https://www.cornwallseawaynews.com/non-classe/a-new-office/"), true);
  assert.equal(skip(seaway, "https://www.cornwallseawaynews.com/local/be-wary-of-new-fraud-schemes-opp/"), false);
});

test("paywall and opinion labels", () => {
  assert.equal(isPaywalled({ name: "The Trillium" }, "https://www.thetrillium.ca/insider-news/x"), true);
  assert.equal(isPaywalled({ name: "The Trillium" }, "https://www.thetrillium.ca/news/x"), false);
  assert.equal(isPaywalled({ name: "Toronto Star" }, "https://www.thestar.com/news/x"), true);
  assert.equal(isOpinion({ link: "https://example.ca/opinion/x", title: "x" }), true);
  assert.equal(isOpinion({ link: "https://example.ca/news/x", title: "Editorial: x" }), true);
  assert.equal(isOpinion({ link: "https://example.ca/news/x", title: "Council votes" }), false);
});

test("listings, round-ups and e-editions from the October 2026 additions are left out", () => {
  assert.equal(skip({ name: "NewsNow" }, "https://www.newsnowniagara.com/2026/09/30/x/", "NewsNow E-Edition October 1 2026"), true);
  assert.equal(skip({ name: "kawarthaNOW" }, "https://kawarthanow.com/2026/10/05/x/", "encoreNOW – October 5, 2026"), true);
  assert.equal(skip({ name: "kawarthaNOW" }, "https://kawarthanow.com/2026/10/01/x/", "nightlifeNOW – October 1 to 7"), true);
  assert.equal(skip({ name: "Pembroke Today" }, "https://www.pembroketoday.ca/2026/10/06/1/", "Looking for the cheapest gas? Here's where"), true);
  assert.equal(skip({ name: "Napanee Today" }, "https://www.napaneetoday.ca/2026/10/06/2/", "Things to do in L&A County: art and more"), true);
  assert.equal(skip({ name: "Pembroke Today" }, "https://www.pembroketoday.ca/2026/10/05/3/", "City of Pembroke looking for feedback with services"), false);
});

test("letters are labelled Opinion, by headline or by the paper's own category", () => {
  assert.equal(isOpinion({ link: "https://haldimandpress.com/x/", title: "Letter: Get out and vote" }), true);
  assert.equal(isOpinion({ link: "https://www.rivertowntimes.com/post/x", title: "Reader puts forth items" }, ["Letters to the Editor", "All News"]), true);
  assert.equal(isOpinion({ link: "https://www.rivertowntimes.com/post/y", title: "Event raises $16k" }, ["Local News", "Community"]), false);
  assert.equal(isOpinion({ link: "https://x.example/a", title: "B" }, [{ _: "Columns" }]), true);
});
