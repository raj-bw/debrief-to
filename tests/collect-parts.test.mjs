/* A collector run in two parts covers every publication exactly once, with
   the slow Metroland/Torstar papers shared evenly between the parts. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { partOf } from "../app/lib/collect-jobs.js";

const job = (name, blox = false) => ({
  bucket: `b-${name}`,
  src: { name, urls: [blox ? `https://www.${name}.com/search/?f=rss&t=article` : `https://${name}.ca/feed`] },
});
const jobs = [
  ...Array.from({ length: 9 }, (_, i) => job(`paper${i}`)),
  ...Array.from({ length: 6 }, (_, i) => job(`metro${i}`, true)),
];

test("two parts cover every publication once", () => {
  const one = partOf(jobs, 1, 2), two = partOf(jobs, 2, 2);
  const names = [...one, ...two].map((j) => j.src.name).sort();
  assert.deepEqual(names, jobs.map((j) => j.src.name).sort());
  assert.equal(new Set(names).size, jobs.length);
});

test("the slow lane is split evenly", () => {
  const metro = (list) => list.filter((j) => j.src.name.startsWith("metro")).length;
  assert.equal(metro(partOf(jobs, 1, 2)), 3);
  assert.equal(metro(partOf(jobs, 2, 2)), 3);
});

test("the same publication lands in the same part every run", () => {
  const shuffled = [...jobs].reverse();
  assert.deepEqual(partOf(shuffled, 1, 2).map((j) => j.src.name).sort(), partOf(jobs, 1, 2).map((j) => j.src.name).sort());
});

test("without parts, a run is everything", () => {
  assert.equal(partOf(jobs, undefined, undefined).length, jobs.length);
  assert.equal(partOf(jobs, 1, 1).length, jobs.length);
  assert.equal(partOf(jobs, 3, 2).length, jobs.length, "a part number out of range runs everything");
});
