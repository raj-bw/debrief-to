/* ---- Web app manifest ----
   What lets Debrief.TO be added to a phone's Home Screen and open like an app:
   full-screen, with its own icon and its own place in the app switcher, and
   no browser toolbars. Served at /manifest.webmanifest. ---- */
export default function manifest() {
  return {
    id: "/",
    name: "Debrief.TO — Ontario's local news",
    short_name: "Debrief.TO",
    description: "Headlines from local and independent newsrooms across Ontario, free and in one feed.",
    start_url: "/",
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
}
