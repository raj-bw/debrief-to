/* ---- Editor's Picks ----
   A short, hand-chosen list of stories worth reading in full. Unlike the
   feed, nothing here is collected automatically: a story is added by
   putting it in the list below.

   Each pick stays up for 33 days from the day the newsroom published it —
   the same window as the rest of the archive — and then drops off on its own.
   Nothing needs deleting; old entries can be tidied away whenever.

   To add a pick, copy an entry and fill in:
     url        the story's address on the newsroom's own site
     title      the headline, as the newsroom wrote it
     source     the newsroom's name, as it appears on the About page
     published  the publication date (from the article page)
     description  one or two sentences, usually the newsroom's own summary
     image      optional: the article's preview image
     paywall    optional: true if the story is subscriber-only
   ---- */

export const PICKS_LABEL = "Editor's Picks";
export const PICKS_DAYS = 33;

export const PICKS = [
  {
    url: "https://www.readthemaple.com/mp-landlords/",
    title: "Find Out If Your MP Is A Landlord Or Invested In Real Estate",
    source: "The Maple",
    published: "2026-09-09T04:30:00Z",
    description: "The Maple examined and analyzed MPs’ disclosure forms and compiled the results.",
    image: "https://storage.ghost.io/c/09/c4/09c4d01a-bbb3-47cd-86e0-7333b3184673/content/images/size/w1200/2026/09/ca-landlords-3.jpg",
  },
];

// The picks still inside their 33 days, newest first.
export function currentPicks(now = Date.now()) {
  const cutoff = now - PICKS_DAYS * 86400000;
  return PICKS
    .filter((p) => { const t = Date.parse(p.published); return Number.isFinite(t) && t >= cutoff && t <= now + 86400000; })
    .sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
}
