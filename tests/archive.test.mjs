/* Which towns the collector visits. Needs a Redis to talk to (REDIS_URL),
   as in CI; without one these are skipped. They only touch towns named
   "test-…", and remove them afterwards. */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "redis";
import { activateTown, activeTowns, archiveEnabled, ACTIVE_DAYS } from "../app/lib/archive.js";

const skip = !process.env.REDIS_URL || !archiveEnabled() ? "no REDIS_URL" : false;
const DAY = 86400000;
let client;
async function redis() {
  if (!client) client = await createClient({ url: process.env.REDIS_URL, RESP: 2 }).connect();
  return client;
}
after(async () => {
  if (skip) return;
  const r = await redis();
  await r.zRem("archive:active", ["test-new", "test-lapsed", "test-recent", "test-old"]);
  await r.quit();
  setTimeout(() => process.exit(0), 50).unref();   // the site's own connection stays open
});

test("a town opened for the first time is collected from then on", { skip }, async () => {
  assert.equal(await activateTown("test-new"), true, "not reported as new");
  assert.ok((await activeTowns()).includes("test-new"));
  assert.equal(await activateTown("test-new"), false, "a second visit is not new");
});

test(`a town nobody has read for ${ACTIVE_DAYS} days drops out, and a reader brings it back`, { skip }, async () => {
  // After the grace period for towns opened before the change (see archive.js)
  const later = Date.parse("2026-12-20T12:00:00Z");
  const r = await redis();
  await r.zAdd("archive:active", [
    { score: later - (ACTIVE_DAYS + 1) * DAY, value: "test-lapsed" },
    { score: later - 2 * DAY, value: "test-recent" },
  ]);
  const before = await activeTowns(later);
  assert.ok(!before.includes("test-lapsed"), "a lapsed town is still collected");
  assert.ok(before.includes("test-recent"), "a recently read town was dropped");
  assert.equal(await activateTown("test-lapsed", later), true, "a lapsed town's reader should get its news fetched at once");
  assert.ok((await activeTowns(later)).includes("test-lapsed"));
});

test("towns opened before the change keep 30 days from it", { skip }, async () => {
  const r = await redis();
  await r.zAdd("archive:active", [{ score: Date.parse("2026-10-01T12:00:00Z"), value: "test-old" }]);
  assert.ok((await activeTowns(Date.parse("2026-11-05T18:00:00Z"))).includes("test-old"), "dropped before its 30 days");
  assert.ok(!(await activeTowns(Date.parse("2026-12-05T18:00:00Z"))).includes("test-old"), "still collected after them");
});
