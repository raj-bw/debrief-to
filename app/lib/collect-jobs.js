import { SOURCES } from "./sources";
import { resolveTown, DEFAULT_TOWN } from "./towns";
import { bucketFor, activeTowns } from "./archive";

/* ---- What the collector visits ----
   The standing sources, plus every publication — own and regional — of
   every town anyone has ever picked. Newmarket always. Each job is one
   publication and the archive shelf its stories go on.

   Shared by /api/collect, which fetches them, and /api/deliver, which files
   what the second network (GitHub) fetched for the same papers, so both put
   a paper's stories on the same shelf under the same name. */
export async function buildJobs() {
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
  const standing = SOURCES.map((s) => ({ src: s, bucket: "shared" }));
  // Start somewhere different each run, so if a run ever hits its time
  // budget it isn't always the same publications left out.
  const local = [...jobs.values()];
  const start = Math.floor(Math.random() * Math.max(local.length, 1));
  return { jobs: [...standing, ...local.slice(start), ...local.slice(0, start)], towns: towns.size };
}
