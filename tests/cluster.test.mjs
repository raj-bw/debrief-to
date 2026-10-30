/* The same story from several newsrooms is folded into one card. These are
   real headlines from October 2026, the ones that taught the rules. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { clusterStories } from "../app/lib/cluster.js";

let n = 0;
const story = (source, title, hoursAgo = 1, sourcePlace = "Toronto") => ({
  source, title, sourcePlace, link: `https://example.test/${++n}`,
  pubDate: new Date(Date.now() - hoursAgo * 3600e3).toISOString(),
});
// Unrelated stories around them, as in a real feed, so rarity means something
const filler = () => Array.from({ length: 30 }, (_, i) => story(`Paper ${i}`, `Bakery ${i} wins award for sourdough number ${i}`, i));

test("a provincial announcement written up twice, naming nobody, is one card", () => {
  const out = clusterStories([
    story("CBC Toronto", "Province should burn more garbage, build more landfills, Ontario environment minister says", 2),
    story("The Trillium", "Ontario environment minister hopes to burn more garbage, build more landfills", 1, "Ontario"),
    ...filler(),
  ]);
  const card = out.find((a) => a.alsoCoveredBy);
  assert.ok(card, "not folded together");
  assert.equal(card.source, "CBC Toronto", "the more local newsroom leads");
  assert.deepEqual(card.alsoLinks.map((x) => x.source), ["The Trillium"]);
  assert.match(card.alsoLinks[0].link, /^https:\/\/example\.test\//);
});

test("the town's own newsroom leads when a story is shared", () => {
  const out = clusterStories([
    story("TorontoToday", "Homelessness will be key challenge for new mayors, councils across Ontario", 3),
    story("Newmarket Today", "Tackling homelessness will be a key challenge for incoming Ontario mayors, councils", 2, "home"),
    ...filler(),
  ]);
  const card = out.find((a) => a.alsoCoveredBy);
  assert.equal(card?.source, "Newmarket Today");
});

test("different races in the same election stay apart", () => {
  const out = clusterStories([
    story("thelocal.to", "The Biggest Winner of This Election: The Toronto Police", 5),
    story("Spacing Toronto", "Election 2026: A failure of political imagination", 4),
    story("TorontoToday", "ELECTION WATCH: Beaches-East York candidates present different approaches to governance", 3),
    story("Spacing Toronto", "Election 2026: Making elections accessible", 2),
    ...filler(),
  ]);
  assert.equal(out.filter((a) => a.alsoCoveredBy).length, 0);
});

test("headlines sharing a few words, and no name, stay apart", () => {
  const out = clusterStories([
    story("CBC Toronto", "Toronto man charged with impaired driving after crashes near Casa Loma", 2),
    story("TorontoToday", "Toronto man charged in fraud scheme targeting churches", 1),
    story("Paper A", "Council approves budget for library expansion downtown", 3),
    story("Paper B", "Council approves budget for arena repairs this winter", 2),
    ...filler(),
  ]);
  assert.equal(out.filter((a) => a.alsoCoveredBy).length, 0);
});
