/* "Republished from …": a story one newsroom carries from another, found in
   the feed's byline or in a credit line in the story's text. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { republishedFrom } from "../app/lib/republished.js";
import { buildArticles } from "../app/lib/articles.js";

const newmarket = { name: "Newmarket Today", kind: "village" };
const cbc = { name: "CBC Toronto" };

test("a byline naming another publication", () => {
  assert.equal(republishedFrom(newmarket, { creator: "Charlie Pinkerton, The Trillium" }), "The Trillium");
  assert.equal(republishedFrom(newmarket, { author: "Be Giant" }), "Be Giant");
  assert.equal(republishedFrom(newmarket, { creator: "Jane Doe, TorontoToday" }), "TorontoToday");
  assert.equal(republishedFrom(cbc, { creator: "The Investigative Journalism Foundation" }), "IJF");
});

test("a credit line in the story", () => {
  assert.equal(republishedFrom(newmarket, { contentEncoded: "<p>…</p><p><em>This story was originally published by Be Giant, a national non-profit newsroom.</em></p>" }), "Be Giant");
  assert.equal(republishedFrom(cbc, { content: "Republished with permission from The Conversation." }), "The Conversation");
  assert.equal(republishedFrom(newmarket, { description: "It first appeared in The Narwhal." }), "The Narwhal");
});

test("a newsroom's own name, staff bylines and wire copy aren't labelled", () => {
  assert.equal(republishedFrom(newmarket, { creator: "Jane Doe, NewmarketToday.ca" }), null);
  assert.equal(republishedFrom(newmarket, { creator: "Newmarket Today Staff" }), null);
  assert.equal(republishedFrom(cbc, { author: "CBC News" }), null);
  assert.equal(republishedFrom(newmarket, { creator: "John Smith, Local Journalism Initiative Reporter" }), null);
  assert.equal(republishedFrom(newmarket, { creator: "The Canadian Press" }), null);
  assert.equal(republishedFrom(newmarket, { creator: "Jane Doe", description: "The mayor first appeared at council on Monday." }), null);
  assert.equal(republishedFrom({ name: "Ricochet" }, { content: "The post A story appeared first on Ricochet." }), null);
  assert.equal(republishedFrom(newmarket, {}), null);
});

test("the label rides along on the story", () => {
  const [a] = buildArticles(newmarket, [{
    title: "How a Canadian-made, ugly-duckling water bomber cornered the world market",
    link: "https://www.newmarkettoday.ca/local-news/water-bomber-1",
    isoDate: new Date().toISOString(),
    creator: "Be Giant",
  }]);
  assert.equal(a.republishedFrom, "Be Giant");
});
