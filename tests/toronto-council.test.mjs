/* Toronto's schedule comes from one Open Data file per term of council. A
   file whose last meeting has passed is out of date, not "no meetings". */
import { test } from "node:test";
import assert from "node:assert/strict";
import { scheduleIsStale } from "../app/lib/toronto-council.js";

test("a term's file that ended before today is out of date", () => {
  assert.equal(scheduleIsStale(["2026-11-10", "2026-11-03", "2026-10-30"], "2026-11-17"), true);
  assert.equal(scheduleIsStale([], "2026-11-17"), true);
});

test("a file with meetings still ahead is current, even if none are this week", () => {
  assert.equal(scheduleIsStale(["2026-12-09", "2026-11-10"], "2026-11-17"), false);
  assert.equal(scheduleIsStale(["2026-11-17T00:00:00"], "2026-11-17"), false);
});
