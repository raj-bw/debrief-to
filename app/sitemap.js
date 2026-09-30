// The pages search engines should list. Today that is the one page: every
// town's feed, the About page and the picks all live at debrief.to.
export default function sitemap() {
  return [
    { url: "https://debrief.to", lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
  ];
}
