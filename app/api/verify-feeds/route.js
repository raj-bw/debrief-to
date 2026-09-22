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
const FEED_PATHS = ["/feed", "/rss", "/feed/", "/rss.xml", "/local/feed", "/index.xml"];

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
        verdict: newest && (Date.now() - new Date(newest)) / 86400000 > 30 ? "stale" : "good",
      };
    } catch (err) {
      tried.push(`${path}: ${(err?.message || "failed").slice(0, 60)}`);
    }
  }
  return { name: candidate.name, domain: candidate.domain, scope: candidate.scope, servesCount: candidate.servesCount, ok: false, tried };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10));
  const scope = searchParams.get("scope");           // "town" | "regional" | omit for both

  const pool = scope ? CANDIDATES.filter((c) => c.scope === scope) : CANDIDATES;
  const batch = pool.slice(offset, offset + limit);
  const results = await Promise.all(batch.map(probe));

  const good = results.filter((r) => r.ok && r.verdict === "good");
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
