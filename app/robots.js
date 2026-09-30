// Tells search engines what to read. The page loads its headlines and
// council agendas from /api/feed and /api/council after it opens, and a
// search engine rendering the page needs those too, so they stay open. The
// site's other endpoints (the collector, health checks) and the printed-QR
// redirects (see app/go) are kept out of search.
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/feed", "/api/council"],
      disallow: ["/api/", "/go/"],
    },
    sitemap: "https://debrief.to/sitemap.xml",
  };
}
