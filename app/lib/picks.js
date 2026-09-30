/* ---- Editor's Picks ----
   A short, hand-chosen list of stories worth reading in full. Unlike the
   feed, nothing here is collected automatically: a story is added by
   putting it in the list below.

   Each pick stays up for 33 days from the day the newsroom published it —
   the same window as the rest of the archive — and then drops off on its own.
   A pick can be given its own end date instead (`until`), for a story that
   matters for longer, such as one about an upcoming election.
   Nothing needs deleting; old entries can be tidied away whenever.

   To add a pick, copy an entry and fill in:
     url        the story's address on the newsroom's own site
     title      the headline, as the newsroom wrote it
     source     the newsroom's name, as it appears on the About page
     published  the publication date (from the article page)
     description  one or two sentences, usually the newsroom's own summary
     image      optional: the article's preview image
     paywall    optional: true if the story is subscriber-only
     until      optional: when to take it down instead of after 33 days,
                e.g. "2026-10-27T23:59:59-04:00" for the end of Oct 27 in Toronto
   ---- */

export const PICKS_LABEL = "Editor's Picks";
export const PICKS_DAYS = 33;

export const PICKS = [
  {
    url: "https://spacing.ca/toronto/2026/09/28/exclusive-inside-the-contract-to-rip-out-torontos-bike-lanes/",
    title: "EXCLUSIVE: Inside the contract to rip out Toronto’s bike lanes",
    source: "Spacing Toronto",
    published: "2026-09-28T16:00:00Z",
    description: "Spacing obtained the RFP for the Ford government's bike lane removal, and it looks even worse than thought.",
  },
  {
    url: "https://spacing.ca/toronto/2026/09/17/election-2026-how-to-read-a-candidates-platform/",
    title: "Election 2026: How to Read a Candidate’s Platform",
    source: "Spacing Toronto",
    published: "2026-09-17T16:00:00Z",
    // About the municipal election, so it stays up to the day after the vote
    until: "2026-10-27T23:59:59-04:00",
    description: "How to look past campaign slogans like “Fix the TTC” to the assumptions behind them, and what they ask voters to accept about the problem.",
  },
  {
    url: "https://www.readthemaple.com/mp-landlords/",
    title: "Find Out If Your MP Is A Landlord Or Invested In Real Estate",
    source: "The Maple",
    published: "2026-09-09T04:30:00Z",
    description: "The Maple examined and analyzed MPs’ disclosure forms and compiled the results.",
    image: "https://storage.ghost.io/c/09/c4/09c4d01a-bbb3-47cd-86e0-7333b3184673/content/images/size/w1200/2026/09/ca-landlords-3.jpg",
  },
];

// The picks still up — inside their 33 days, or before their own `until`
// date — newest first.
export function currentPicks(now = Date.now()) {
  return PICKS
    .filter((p) => {
      const t = Date.parse(p.published);
      if (!Number.isFinite(t) || t > now + 86400000) return false;
      const end = p.until ? Date.parse(p.until) : t + PICKS_DAYS * 86400000;
      return now <= end;
    })
    .sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
}
