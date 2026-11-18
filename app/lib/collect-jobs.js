import { SOURCES } from "./sources";
import { resolveTown, DEFAULT_TOWN } from "./towns";
import { bucketFor, activeTowns } from "./archive";
import { lineOf } from "./fetch-feed";

/* ---- What the collector visits ----
   The standing sources, plus every publication — own and regional — of
   every town anyone has ever picked. Newmarket always. Each job is one
   publication and the archive shelf its stories go on.

   Shared by /api/collect, which fetches them, and /api/deliver, which files
   what the second network (GitHub) fetched for the same papers, so both put
   a paper's stories on the same shelf under the same name. */
/* ---- One run in parts ----
   A run has four minutes. With 57 towns (92 publications) that was no
   longer enough: each run left 7 to 9 publications unvisited. So the
   GitHub Action asks for the run in two parts, one after the other, each
   with its own four minutes: /api/collect?part=1&of=2, then part=2.
   Publications are dealt out alternately within each lane, so the slow
   Metroland/Torstar papers (asked one at a time) are split evenly too.
   Without `part`, a run is everything, as before (Vercel's daily run). */
export function partOf(jobs, part, of) {
  if (!(of > 1) || !(part >= 1 && part <= of)) return jobs;
  const key = (j) => `${j.bucket}|${j.src.name}`;
  const byLane = new Map();
  for (const j of jobs) {
    const lane = lineOf(j.src) || "other";
    if (!byLane.has(lane)) byLane.set(lane, []);
    byLane.get(lane).push(j);
  }
  const mine = [];
  for (const list of byLane.values()) {
    list.sort((a, b) => key(a).localeCompare(key(b)));
    list.forEach((j, i) => { if (i % of === part - 1) mine.push(j); });
  }
  return mine;
}

export async function buildJobs({ part, of } = {}) {
  const jobs = new Map();   // bucket -> job, so a publication shared by many towns is fetched once
  const towns = new Set([DEFAULT_TOWN, ...(await activeTowns())]);
  for (const slug of towns) {
    const t = resolveTown(slug);
    for (const f of [...(t.feeds || []), ...(t.regionFeeds || [])]) {
      const b = bucketFor(f);
      if (!jobs.has(b)) jobs.set(b, { src: { ...f, place: "home" }, bucket: b });
    }
  }
  // Standing sources all share one shelf, but each is its own fetch.
  const standing = partOf(SOURCES.map((s) => ({ src: s, bucket: "shared" })), part, of);
  // Start somewhere different each run, so if a run ever hits its time
  // budget it isn't always the same publications left out.
  const local = partOf([...jobs.values()], part, of);
  const start = Math.floor(Math.random() * Math.max(local.length, 1));
  return { jobs: [...standing, ...local.slice(start), ...local.slice(0, start)], towns: towns.size };
}
