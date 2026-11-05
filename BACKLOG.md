# Backlog

Agreed with Raj, not started yet. Take an item off when it's done.
Last updated November 4, 2026.

## Waiting on Raj (about 10 minutes each)

- **Google Search Console and Bing Webmaster Tools.** Raj is doing this.
  - Google: add a Domain property for `debrief.to`, verified with a TXT record at Porkbun (blank host).
  - Then submit `sitemap.xml`, which lists 413 pages.
  - Bing: use "Import from Google Search Console".
- **Truly hourly collection.** GitHub runs the hourly schedule only about four times a day, 4 to 10 hours apart.
  - Fix: a free cron-job.org job every hour calls GitHub's `POST /repos/raj-bw/debrief-to/actions/workflows/archive-ping.yml/dispatches` with body `{"ref":"main"}`.
  - It needs a fine-grained token with "Actions: read and write" on this repository only.
  - The repository is public, so the extra runs cost nothing.

## Website work, most useful first

1. **Show the newest Editor's Pick in the main feed.** Picks are only behind the Editor's Picks button today. Small.
2. **Put the latest headlines in the page itself, rendered on the server.** Today the front page and the 412 town pages arrive as loading placeholders, and stories load afterwards. With headlines in the HTML, Google sees real local news and phones show stories sooner. Medium; worth it once the sitemap is in Search Console.
3. **Sharing.**
   - A share button on stories and town pages that opens the phone's own share menu.
   - A preview image per town ("Kingston news — Debrief.TO") so shared links look local.
   - Almost all visitors type the address, so word of mouth is how the site grows. Small to medium.
4. **A feed for each town for news reader apps** (`/kingston/feed.xml`). Parked by Raj: nice to have, not a priority.
5. **The Napanee Beaver.**
   - It has refused connections ("socket hang up") since October 16, on both addresses.
   - Its stored stories expire around November 18.
   - Draft Raj a short email to the paper if it's still down.

## Editor's Picks suggested on November 4 (not added)

All free to read. Picks stay at the top for 90 days from publication.

- The Narwhal, Nov 4: [How the Ford government's new omnibus bill could affect Ontarians' say in environmental decisions](https://thenarwhal.ca/ontario-bill-140-environmental-rights/) (Bill 140; matters most while it's debated)
- The Green Line, Oct 30: [What each councillor promised constituents in the 2026 Toronto municipal election](https://thegreenline.to/stories/toronto-councillors-2026-election-promises/)
- IJF, Nov 3: [Record numbers of Canadian foreign workers claim abuse by employers](https://theijf.org/article/migrant-workers-visa-applications)
- Ricochet, Oct 30: [Guns flow north. Toronto lawyer seeks to hold U.S. gun corporations accountable for Canadian deaths](https://ricochet.media/justice/guns-flow-north-toronto-lawyer-seeks-to-hold-u-s-gun-corporations-accountable-for-canadian-deaths/)
- National Observer, Oct 28: [Federal government set to dismantle mandatory pesticide safety reviews](https://www.nationalobserver.com/2026/10/28/news/federal-government-set-dismantle-mandatory-pesticide-safety-reviews) (a vote is coming up)
- Also strong:
  - IJF, Oct 30: [CSIS examining Tether over China ties](https://theijf.org/article/csis-tether-prc-connections)
  - IJF, Oct 27: [The $300 million con man](https://theijf.org/article/the-300-million-con-man)
  - The Maple, Oct 26: [Canada sought U.S. approval before releasing Nazi war criminals report](https://www.readthemaple.com/canada-sought-u-s-approval-before-releasing-nazi-war-criminals-report/)

## Watching

- **Metroland/Torstar papers turned away with "too many requests"** (429), from Vercel and from GitHub's network alike:
  - Brampton Guardian, since November 2.
  - Peterborough Examiner, since November 3.
  - InsideOttawaValley, InsideHalton and Orangeville.com, since the afternoon of November 3.
  - We ask each paper once per run, slowly, so this is their limit and not to be worked around.
  - The nightly stats report lists them.
- **Room to grow.** The collector covers 66 publications in about 200 of its 240 seconds, and the database is 63% of the free 30 MB.
  - Towns now drop out of collection after 30 days without a reader, and crawlers never add one, so this should stay flat.
  - Towns opened before November 4 stay collected until December 4, then follow the 30-day rule.
  - Recheck if the town pages bring real traffic.

## Known, leave for now

- **"`url.parse()` is deprecated" in the server logs.** It comes from `rss-parser`, unmaintained since 2023. It's harmless: Node still supports it. Replacing the library would touch every feed fetch.
