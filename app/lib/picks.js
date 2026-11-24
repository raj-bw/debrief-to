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
  // Added Nov 24 2026
  {
    url: "https://www.nationalobserver.com/2026/11/23/news/ford-smith-double-down-oil-pipeline-ontario",
    title: "Ford and Smith double down on oil pipeline to Ontario",
    source: "National Observer",
    published: "2026-11-23T22:39:33Z",
    description: "Ontario Premier Doug Ford is continuing to push his vision for a new crude oil pipeline between Alberta and Ontario, which he says would bring “national security” to Canada.",
  },
  {
    url: "https://www.thetrillium.ca/news/health/premier-says-drugmakers-are-refusing-to-seek-approval-in-canada-as-he-defends-us-cancer-treatment-denials-13050325",
    title: "Premier says drugmakers are refusing to seek approval in Canada as he defends U.S. cancer treatment denials",
    source: "The Trillium",
    published: "2026-11-23T20:34:00Z",
    description: "‘My heart breaks for them,’ Ford said of patients fighting for access to treatment, as his government rejected a call to review and approve denied cases",
    image: "https://www.vmcdn.ca/f/files/trillium/whatsapp-image-2026-11-23-at-124335.jpeg;w=960",
  },
  {
    url: "https://theijf.org/brief/telesat-lobbied-feds-every-other-business-day-prior-to-2-3-billion-contract-award",
    title: "Telesat lobbied feds every other business day prior to $2.3-billion contract award",
    source: "IJF",
    published: "2026-11-23T03:20:41Z",
    description: "Federal Conservatives criticized the deal saying the PM had a conflict of interest due to his friendship with Telesat’s CEO. Carney has since implemented a formal ethics “screen”",
    image: "https://storage.ghost.io/c/f9/62/f9622874-fed0-4058-bf3d-67605eb66d47/content/images/2026/11/CP2895355--1-.jpg",
  },
  {
    url: "https://thegreenline.to/stories/thorncliffe-park-rent-hikes/",
    title: "400 Thorncliffe Park tenants are saying no to one landlord’s rent hike",
    source: "The Green Line",
    published: "2026-11-20T20:42:40Z",
    description: "Tenants at 47 Thorncliffe Park Dr. are challenging rent increases in a building they say has barely been maintained by the landlord.",
    image: "https://thegreenline.to/wp-content/uploads/2026/11/2-1024x576.png",
  },
  {
    url: "https://www.torontotoday.ca/local/city-hall/ttc-investigation-consultant-billed-4k-per-day-ceo-13031433",
    title: "Meet the TTC’s ‘deputy CEO’: Consultant billed $4K per day to cash-strapped agency",
    source: "TorontoToday",
    published: "2026-11-18T18:15:00Z",
    description: "A consulting firm incorporated six days before Mandeep Lali took over as TTC CEO has since received at least two single-source contracts from the transit agency",
    image: "https://www.vmcdn.ca/f/files/torontotoday/images/transit/satpal-mandeep.png;w=960",
  },
  {
    url: "https://projects.thenarwhal.ca/breathing-lands/",
    title: "Deep in the breathing lands: a 1,700-km paddle to the centre of Ontario’s mining ambitions",
    source: "The Narwhal",
    published: "2026-11-18T16:51:13Z",
    description: "The mineral-rich region of northern Ontario is known also as the breathing lands — a massive carbon-storing peatland traversed by First Nations for millennia. Mining and roads could change that",
    image: "https://thenarwhal.ca/wp-content/uploads/2026/11/breathing-lands-header-site-1400x725.jpg",
  },
  {
    url: "https://www.nationalobserver.com/2026/11/18/news/rcmp-agent-embedded-major-projects-office-indigenous-policing",
    title: "Documents reveal RCMP agent embedded in the Major Projects Office",
    source: "National Observer",
    published: "2026-11-18T16:17:23Z",
    description: "An RCMP agent specializing in Indigenous policing is working in the federal government's Major Projects Office.",
  },
  {
    url: "https://www.cbc.ca/news/canada/toronto/ontario-government-legislation-osap-pause-9.7426005",
    title: "Part of new bill would prevent lawsuits against Ontario government over OSAP pause",
    source: "CBC Toronto",
    published: "2026-11-18T02:03:35Z",
    description: "The Ontario government is taking steps to protect itself from lawsuits related to its provincewide pause on financial assistance payments to students at private post-secondary institutions.",
  },
  {
    url: "https://www.thetrillium.ca/news/education-and-training/education-minister-defends-60m-digital-learning-platform-after-concerns-about-outdated-inappropriate-material-13028736",
    title: "Education minister defends $60M digital learning platform after concerns about outdated, inappropriate material",
    source: "The Trillium",
    published: "2026-11-17T21:18:23Z",
    description: "Paul Calandra says platform is 'updated as required,' after educators questioned whether the $60-million investment was adequately vetted",
    image: "https://www.vmcdn.ca/f/files/trillium/screenshot-2026-11-17-at-34601-pm.png;w=960",
  },
  // Added for launch, Nov 18 2026
  {
    url: "https://www.thetrillium.ca/news/the-trillium-investigations/ford-gov-pledged-175m-for-horse-racing-after-minister-raised-20k-of-political-donations-from-industry-13027672",
    title: "Ford gov pledged $175M for horse racing after minister raised $20K of political donations from industry",
    source: "The Trillium",
    published: "2026-11-17T18:52:00Z",
    description: "It’s part of a wider trend of how the Progressive Conservatives have fundraised in recent years",
    image: "https://www.vmcdn.ca/f/files/trillium/images/stancho-woodbine-kingsplate-2025.jpeg;w=960",
  },
  {
    url: "https://theijf.org/article/clean-harbors-sarnia-mercury",
    title: "Over the limit: Ontario toxic waste incinerator fined as mercury emissions soared",
    source: "IJF",
    published: "2026-11-17T14:00:00Z",
    description: "Clean Harbors says heavy metal released by Sarnia facility poses no risk to human health",
    image: "https://storage.ghost.io/c/f9/62/f9622874-fed0-4058-bf3d-67605eb66d47/content/images/2026/11/IMG_3135.JPG",
  },
  {
    url: "https://www.thetrillium.ca/news/social-services-and-society/ford-government-audit-finds-kids-needs-not-bonuses-and-taj-mahal-offices-driving-up-childrens-aid-societies-costs-13024031",
    title: "Ford government audit finds kids’ needs, not bonuses and ‘Taj Mahal’ offices, driving up Children's Aid Societies’ costs",
    source: "The Trillium",
    published: "2026-11-16T21:45:25Z",
    description: "The third-party audit validated concerns from parents and child welfare workers about escalating costs for caring for kids with complex needs where provincial services are lacking",
    image: "https://www.vmcdn.ca/f/files/trillium/images/parsa2nov16.JPG;w=960",
  },
  {
    url: "https://www.readthemaple.com/amazon-workers-are-fighting-for-a-gta-union/",
    title: "Amazon Workers Are Fighting For A GTA Union",
    source: "The Maple",
    published: "2026-11-16T12:30:00Z",
    description: "The workers have joined forces with Unifor in a major, new unionization drive.",
    image: "https://storage.ghost.io/c/09/c4/09c4d01a-bbb3-47cd-86e0-7333b3184673/content/images/2026/11/amazon-canada.jpg",
  },
  {
    url: "https://breachmedia.ca/instead-of-supporting-grandparents-ontario-is-putting-money-into-private-group-homes/",
    title: "Instead of supporting grandparents raising children, Ontario is plowing money into private group homes",
    source: "The Breach",
    published: "2026-11-12T17:33:45Z",
    description: "In Ontario, ‘kinship’ caregivers struggle for support while cash from the child welfare system flows to privatized care.",
    image: "https://d1833qsio4cxsx.cloudfront.net/wp-content/uploads/2026/11/12122444/Article_GrandparentsCare_2026v1-414x276.png",
  },
  {
    url: "https://thenarwhal.ca/ontario-bill-140-recycling-garbage/",
    title: "How Ontario’s Bill 140 could trash some recyclables and build more landfills",
    source: "The Narwhal",
    published: "2026-11-12T13:00:00Z",
    description: "The Ford government’s latest omnibus bill rewrites the rules for the Blue Box program and makes more space for landfills and garbage incinerators",
    image: "https://thenarwhal.ca/wp-content/uploads/2026/11/CP2652484-1399x958.jpg",
  },
  {
    url: "https://theijf.org/brief/ccdi-data-centre-policies-ontario",
    title: "Tech, power and construction companies seek data centre friendly policies in Ontario",
    source: "IJF",
    published: "2026-11-10T13:00:00Z",
    description: "As some GTA municipalities hit pause on new data centres, Google, Meta and Amazon are pushing for policies favouring digital infrastructure in Ontario",
    image: "https://storage.ghost.io/c/f9/62/f9622874-fed0-4058-bf3d-67605eb66d47/content/images/2026/11/CP176626913.JPG",
  },
  {
    url: "https://thenarwhal.ca/canada-pesticides-bill-pushback-2026/",
    title: "As Ottawa loosens pesticide rules, its own water tests keep detecting high-risk chemicals",
    source: "The Narwhal",
    published: "2026-11-09T13:00:00Z",
    description: "Pesticides with environmental risks Health Canada considers unacceptable could still be authorized for use, if the federal government deems them necessary for economic or food security",
    image: "https://thenarwhal.ca/wp-content/uploads/2026/11/11072024JakeLeguee087TS-1400x933.jpg",
  },
  {
    url: "https://thenarwhal.ca/ontario-bill-140-environmental-rights/",
    title: "How the Ford government’s new omnibus bill could affect Ontarians’ say in environmental decisions",
    source: "The Narwhal",
    published: "2026-11-04T11:30:00Z",
    description: "The Ontario government’s proposed Bill 140 would create exemptions for public posting on the environmental registry and limit avenues for residents to raise concerns",
    image: "https://thenarwhal.ca/wp-content/uploads/2023/05/ON-development-DuffinsPreserve-CKL106DRAP-1400x933.jpg",
  },
  {
    url: "https://theijf.org/article/migrant-workers-visa-applications",
    title: "Record numbers of Canadian foreign workers claim abuse by employers",
    source: "IJF",
    published: "2026-11-03T13:50:00Z",
    description: "More than 15,000 applied for emergency permit last year, leading to longer wait times",
    image: "https://storage.ghost.io/c/f9/62/f9622874-fed0-4058-bf3d-67605eb66d47/content/images/2026/11/_MG_5596.webp",
  },
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
