/* ---- Web app manifest ----
   What lets Debrief.TO be added to a phone's Home Screen and open like an app:
   full-screen, with its own icon and its own place in the app switcher, and
   no browser toolbars.

   Served from here rather than as a fixed file so the installed app can start
   with the reader's town and theme. The page links to
   /manifest.webmanifest?town=newmarket&dark=1 once it knows them (see
   SiteIcons in app/page.js), and those go into start_url. On iPhone the Home
   Screen app keeps its own storage, separate from Safari, so without this it
   would open with no town and in light mode. ---- */

const SLUG = /^[a-z0-9-]{1,60}$/;

export function GET(request) {
  const params = new URL(request.url).searchParams;
  const start = new URLSearchParams();
  const town = params.get("town");
  if (town && SLUG.test(town)) start.set("town", town);
  if (params.get("dark") === "1") start.set("dark", "1");

  const manifest = {
    // The app's identity stays "/" whatever town it starts in
    id: "/",
    name: "Debrief.TO — Ontario's local news",
    short_name: "Debrief.TO",
    description: "Headlines from local and independent newsrooms across Ontario, free and in one feed.",
    start_url: start.size ? `/?${start}` : "/",
    scope: "/",
    display: "standalone",
    // The splash screen Android shows while the app opens, and the colour of
    // the phone's status bar above it. Matches the site's light theme.
    background_color: "#FAF8F5",
    theme_color: "#FFFFFF",
    lang: "en-CA",
    categories: ["news"],
    icons: [
      { src: "/icons/app-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/app-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops icons to a circle or rounded square; this one keeps the
      // artwork inside the part that survives the crop.
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" },
  });
}
