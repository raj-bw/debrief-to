import { townOptions } from "./lib/towns";

// The pages search engines should list: the front page, and each town's own
// page (app/[town]/page.js). The About page and the picks live at debrief.to.
export default function sitemap() {
  const now = new Date();
  return [
    { url: "https://debrief.to", lastModified: now, changeFrequency: "hourly", priority: 1 },
    ...townOptions().map((t) => ({ url: `https://debrief.to/${t.slug}`, lastModified: now, changeFrequency: "daily", priority: 0.7 })),
  ];
}
