/* ---- Editor's Picks ----
   A short, hand-chosen list of stories worth reading in full. Unlike the
   feed, nothing here is collected automatically: a story is added by
   putting it in the list below.

   Each pick stays at the top of Editor's Picks for 90 days from the day the
   newsroom published it, then moves on its own to "Past picks", a plain
   list further down the same view. A pick can be given its own end date
   instead (`until`), such as one about an upcoming election, which moves
   down the day after the vote. Nothing needs deleting: the list below is
   the archive.

   To add a pick, copy an entry and fill in:
     url        the story's address on the newsroom's own site
     title      the headline, as the newsroom wrote it
     source     the newsroom's name, as it appears on the About page
     published  the publication date (from the article page)
     description  one or two sentences, usually the newsroom's own summary
     image      optional: the article's preview image
     paywall    optional: true if the story is subscriber-only
     until      optional: when to move it to Past picks, instead of after 90 days,
                e.g. "2026-10-27T23:59:59-04:00" for the end of Oct 27 in Toronto
   ---- */

export const PICKS_LABEL = "Editor's Picks";
export const PICKS_DAYS = 90;

export const PICKS = [
  {
    url: "https://thegreenline.to/stories/toronto-chinatown-city-council-candidates/",
    title: "Toronto councillors outline plan to protect Chinatown",
    source: "The Green Line",
    published: "2026-10-28T20:30:31Z",
    description: "Toronto Chinatown residents ask Spadina Fort-York and University-Rosedale candidates about affordability and cultural preservation plans.",
    image: "https://thegreenline.to/wp-content/uploads/2026/10/CHINATOWN--1024x768.webp",
  },
  {
    url: "https://www.thetrillium.ca/news/energy-and-the-environment/ontario-environment-minister-hopes-to-burn-more-garbage-build-more-landfills-12952369",
    title: "Ontario environment minister hopes to burn more garbage, build more landfills",
    source: "The Trillium",
    published: "2026-10-28T19:58:35Z",
    description: "Ontario's environment minister hopes to burn more garbage for energy and build more landfills as the province runs out of space to dump its trash.",
    image: "https://www.vmcdn.ca/f/files/shared/feeds/cp/2026/10/3f6d0fdb82d78f07c8e2a10a27594ed53f404dc5d2df237b12d037633738a0a6.jpg;w=960",
    paywall: true,
  },
  {
    url: "https://thenarwhal.ca/canada-youth-climate-change-case/",
    title: "Canadian youth ask courts to hold governments accountable for meaningful climate action",
    source: "The Narwhal",
    published: "2026-10-26T21:33:14Z",
    description: "A landmark trial in Canada is part of a growing global wave of climate litigation testing whether governments can be held legally responsible for failing to protect people from a warming world.",
    image: "https://thenarwhal.ca/wp-content/uploads/2026/10/Natl-FireSmart-Yellowknifeevacuation-PatKane-HayRiver_Summer_005-1400x933.jpg",
  },
  {
    url: "https://theijf.org/brief/finance-minister-discussed-west-coast-pipeline-with-enbridge",
    title: "Finance minister discussed West Coast pipeline with Enbridge",
    source: "IJF",
    published: "2026-10-22T12:00:00Z",
    description: "Briefing note reveals Champagne sought Enbridge CEO’s view before federal government championed pipeline project.",
    image: "https://storage.ghost.io/c/f9/62/f9622874-fed0-4058-bf3d-67605eb66d47/content/images/2026/10/CP177015511.JPG",
  },
  {
    url: "https://spacing.ca/toronto/2026/09/28/exclusive-inside-the-contract-to-rip-out-torontos-bike-lanes/",
    title: "EXCLUSIVE: Inside the contract to rip out Toronto’s bike lanes",
    source: "Spacing Toronto",
    published: "2026-09-28T16:00:00Z",
    description: "Spacing obtained the RFP for the Ford government's bike lane removal, and it looks even worse than thought.",
  },
  {
    url: "https://thenarwhal.ca/trc-residential-school-records-connie-walker-2026/",
    title: "Canada plans to destroy thousands of residential school testimonies",
    source: "The Narwhal",
    published: "2026-09-28T12:00:00Z",
    description: "The 38,000 testimonies are the largest body of evidence about children’s experiences in these institutions. Journalist Connie Walker and lawyer Kimberly Murray say losing it would mean losing history.",
    image: "https://thenarwhal.ca/wp-content/uploads/2026/09/Karlene-Harvey-Truth-and-Reconciliation-2026-illustration-1400x788.jpeg",
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

// "current" (inside its 90 days, or before its own `until` date), "past",
// or null for a pick dated more than a day ahead or without a usable date.
function stage(p, now) {
  const t = Date.parse(p.published);
  if (!Number.isFinite(t) || t > now + 86400000) return null;
  const end = p.until ? Date.parse(p.until) : t + PICKS_DAYS * 86400000;
  return now <= end ? "current" : "past";
}
const newestFirst = (a, b) => Date.parse(b.published) - Date.parse(a.published);

// The picks at the top of Editor's Picks, newest first.
export function currentPicks(now = Date.now()) {
  return PICKS.filter((p) => stage(p, now) === "current").sort(newestFirst);
}

// Every pick that has moved down to Past picks, newest first.
export function pastPicks(now = Date.now()) {
  return PICKS.filter((p) => stage(p, now) === "past").sort(newestFirst);
}
