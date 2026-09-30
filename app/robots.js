// Tells search engines what to read: the site itself, not its data
// endpoints or the printed-QR redirects (see app/go).
export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/go/"] },
    sitemap: "https://debrief.to/sitemap.xml",
  };
}
