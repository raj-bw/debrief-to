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
