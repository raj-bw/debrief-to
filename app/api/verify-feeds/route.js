import Parser from "rss-parser";
import CANDIDATES from "../../lib/candidate-publishers.json";

/* ---- Turning a list of publications into a list of feeds ----
   Raj's research maps 370 Ontario municipalities to the newsrooms that cover
   them, but it gives homepages, not RSS feeds — and a homepage existing tells
   us nothing about whether there is a feed we can read.

   We learned this the hard way with the Village Media towns: a pattern that
   looked obviously right, where two of eighteen still failed for reasons no
   amount of reasoning would have surfaced (ottawamatters.com turned out to be
   a Rogers site with no such feed; kitchenertoday.com serves malformed XML).

   So nothing goes into the source list until it has answered. This route does
   the asking, from Vercel, where the publishers will actually talk to us.

     /api/verify-feeds              first batch
     /api/verify-feeds?offset=10    the next one
     /api/verify-feeds?limit=15     bigger bites

   It is read-only and changes nothing. Work through the batches, keep what
   answers, and discard the rest. ---- */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The paths a publisher is most likely to serve a feed from, cheapest first.
/* The paths a publisher is most likely to serve a feed from, cheapest first.

   The last one is the lesson from the Metroland sweep. Every Metroland
   portal answered 404 or served HTML on all of the obvious paths, and the
   whole chain — twelve regional portals, most of southern Ontario outside
   the Village Media towns — was written off as feedless. They run on BLOX,
   which will hand back a search result as RSS, and that feed is complete
   and current. A chain is not feedless until the platform it runs on has
   been asked in the way that platform answers. */
const FEED_PATHS = [
  "/feed",
  "/rss",
  "/feed/",
  "/rss.xml",
  "/local/feed",
  "/index.xml",
  "/search/?f=rss&t=article&c=news*&l=30&s=start_time&sd=desc",
];

const parser = new Parser({
  timeout: 5000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
  },
});

async function probe(candidate) {
  const base = candidate.url.replace(/\/+$/, "");
  const tried = [];
  for (const path of FEED_PATHS) {
    const url = base + path;
    try {
      const feed = await parser.parseURL(url);
      const items = feed.items || [];
      if (items.length === 0) { tried.push(`${path}: empty`); continue; }
      const newest = items[0]?.isoDate || items[0]?.pubDate || null;
      return {
        name: candidate.name,
        domain: candidate.domain,
        scope: candidate.scope,
        servesCount: candidate.servesCount,
        ok: true,
        feedUrl: url,
        items: items.length,
        newest,
        daysSinceNewest: newest ? Math.floor((Date.now() - new Date(newest)) / 86400000) : null,
        // A feed that answers but stopped publishing months ago is its own
        // kind of broken, so the verdict says so rather than just "ok".
        /* A weekly paper is not a broken one. Anything inside thirty days is
           worth carrying — it will simply appear in This Week or This Month
           rather than in Today, which is where a reader would look for it
           anyway. Past thirty days the paper has stopped, and we say so. */
        verdict: !newest ? "undated"
          : (Date.now() - new Date(newest)) / 86400000 > 30 ? "stale"
          : (Date.now() - new Date(newest)) / 86400000 > 7 ? "monthly"
          : "good",
      };
    } catch (err) {
      tried.push(`${path}: ${(err?.message || "failed").slice(0, 60)}`);
    }
  }
  return { name: candidate.name, domain: candidate.domain, scope: candidate.scope, servesCount: candidate.servesCount, ok: false, tried };
}

/* ---- Metroland and Torstar: which other doors are open? (temporary) ----
   Their search feed (the only feed BLOX offers) answers 429 to our server on
   most portals, even when asked once and politely. This asks one refused
   portal and one that answers for the other files a BLOX site publishes —
   robots.txt, which lists its sitemaps, and the sitemaps themselves — one at
   a time, and reports what came back, to choose a second way in.
   /api/verify-feeds?blox=1. Read-only. */
/* Round one found robots.txt and the sitemap index served while every
   page built per request (search, section feeds, the news sitemap) got 429.
   Round two reads the index in full and the article sitemaps it points to. */
const BLOX_PROBE_HOSTS = ["www.thespec.com"];
const BLOX_PROBE_PATHS = [
  "/sitemap.xml",
  "/tncms/sitemap/editorial.xml",
  "/tncms/sitemap/editorial.xml?year=2026",
];

async function probeBlox() {
  const out = [];
  for (const host of BLOX_PROBE_HOSTS) {
    for (const path of BLOX_PROBE_PATHS) {
      const url = `https://${host}${path}`;
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", Accept: "*/*" },
          signal: AbortSignal.timeout(8000),
        });
        const text = await res.text();
        out.push({
          url, status: res.status, type: res.headers.get("content-type"), bytes: text.length,
          ...(path === "/robots.txt"
            ? { sitemaps: (text.match(/^sitemap:.*$/gim) || []).slice(0, 15) }
            : { start: text.slice(0, 2500) }),
        });
      } catch (err) {
        out.push({ url, error: String(err?.message || err).slice(0, 100) });
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return out;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("blox") === "1") {
    return Response.json({ blox: await probeBlox() }, { headers: { "Cache-Control": "no-store" } });
  }
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10));
  const scope = searchParams.get("scope");           // "town" | "regional" | omit for both

  const pool = scope ? CANDIDATES.filter((c) => c.scope === scope) : CANDIDATES;
  const batch = pool.slice(offset, offset + limit);
  const results = await Promise.all(batch.map(probe));

  // "Keep" is the thirty-day bar, not the seven-day one: a weekly counts.
  const good = results.filter((r) => r.ok && (r.verdict === "good" || r.verdict === "monthly"));
  const stale = results.filter((r) => r.ok && r.verdict === "stale");
  const failed = results.filter((r) => !r.ok);

  if (searchParams.get("format") === "text") {
    const lines = results.map((r) =>
      r.ok
        ? `OK|${r.name}|${r.feedUrl}|items=${r.items}|days=${r.daysSinceNewest ?? "?"}|${r.verdict}|${r.scope}|serves=${r.servesCount}`
        : `NO|${r.name}|${r.domain}`
    );
    const done = offset + batch.length;
    lines.push(`--- ${offset}-${done - 1} of ${pool.length} | ${good.length} good, ${stale.length} stale, ${failed.length} none`);
    lines.push(done < pool.length ? `NEXT offset=${done}` : "NEXT none");
    return new Response(lines.join("\n"), {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  return Response.json({
    batch: { offset, limit, returned: batch.length, totalInScope: pool.length },
    next: offset + batch.length < pool.length
      ? `/api/verify-feeds?offset=${offset + batch.length}&limit=${limit}${scope ? `&scope=${scope}` : ""}`
      : null,
    summary: `${good.length} good, ${stale.length} stale, ${failed.length} no feed found`,
    // Ready to paste into the source list
    good: good.map((r) => ({ name: r.name, feedUrl: r.feedUrl, items: r.items, scope: r.scope, serves: r.servesCount })),
    stale: stale.map((r) => ({ name: r.name, feedUrl: r.feedUrl, daysSinceNewest: r.daysSinceNewest })),
    failed: failed.map((r) => ({ name: r.name, domain: r.domain, tried: r.tried })),
  }, { headers: { "Cache-Control": "no-store" } });
}
