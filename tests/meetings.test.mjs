/* The council box: what has already happened leaves it, and a meeting a
   council posted twice shows once. Real cases from November 2026. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { torontoClock, notOverYet, withoutRepeats } from "../app/lib/meetings.js";

// 10:52 p.m. on Tuesday, November 3, 2026 in Toronto (EST, after the clocks went back)
const lateTuesday = Date.UTC(2026, 10, 4, 3, 52);

test("Toronto's clock, through the change back to standard time", () => {
  assert.equal(torontoClock(lateTuesday), "2026-11-03 22:52");
  assert.equal(torontoClock(Date.UTC(2026, 6, 1, 16, 0)), "2026-07-01 12:00");   // summer: UTC-4
});

test("a meeting held this morning is no longer 'coming up' tonight", () => {
  assert.equal(notOverYet("2026-11-03 09:30", lateTuesday), false, "the Toronto Atmospheric Fund met at 9:30 a.m.");
  assert.equal(notOverYet("2026-11-03 19:00", lateTuesday), false, "started nearly four hours ago");
  assert.equal(notOverYet("2026-11-03 20:00", lateTuesday), true, "under way: its agenda is still worth opening");
  assert.equal(notOverYet("2026-11-04 09:30", lateTuesday), true);
  assert.equal(notOverYet("2026-11-03", lateTuesday), true, "a date with no time stays all that day");
  assert.equal(notOverYet("2026-11-02", lateTuesday), false);
  assert.equal(notOverYet("", lateTuesday), false);
});

test("a meeting posted twice under two wordings shows once, the copy with an agenda", () => {
  const m = (name, start, agenda = null) => ({ name, start, agenda });
  const out = withoutRepeats([
    m("Regular Meeting of Council", "2026/11/10 18:00:51", "https://example.test/a"),
    m("Inaugural Council Meeting", "2026/11/17 18:00:00"),
    m("Inaugural Meeting of Council", "2026/11/17 18:00:00", "https://example.test/b"),
    m("Committee of Adjustment Meeting", "2026/11/17 18:00:00"),
    m("Regular Meeting of Council", "2026/11/24 18:00:20"),
  ]);
  assert.deepEqual(out.map((x) => x.name), [
    "Regular Meeting of Council", "Inaugural Meeting of Council", "Committee of Adjustment Meeting", "Regular Meeting of Council",
  ]);
  assert.equal(out[1].agenda, "https://example.test/b");
});
