# Backlog

Agreed with Raj, not started yet. Take an item off when it's done.
Last updated November 18, 2026.

## Waiting on Raj

- **Google Search Console and Bing Webmaster Tools** (about 10 minutes each).
  - Google: add a Domain property for `debrief.to`, verified with a TXT record at Porkbun (blank host).
  - Then submit `sitemap.xml`, which lists 414 pages.
  - Bing: use "Import from Google Search Console".
- **Account security.** Two-factor login on Porkbun, GitHub, Vercel, the Redis host and the email behind them; auto-renew and Domain Lock on at Porkbun; a rule for `main` in GitHub (pull requests and passing checks required); Dependabot alerts on.
- **The Walrus and The Napanee Beaver** are on the newsroom list but show nothing: The Walrus has refused us since October 6 (on purpose), the Napanee Beaver has been down since October 16 and its last stored stories expired November 18. Remove them, or keep them listed?
- **The cron-job.org token** needs renewing by November 2, 2027 (GitHub → Settings → Developer settings → Fine-grained tokens), and paste the new one into the cron-job.org job's Authorization header.

## Ready when Raj says go

- **Test every town, 25 at a time.** A read-only check of what readers see in each of the 412 towns this week: stories, whether the tab falls back to the region, errors, the council box. On a preview copy, without signing towns up for collection or asking Metroland's papers directly. About 20 minutes to build, then 17 batches of 1 to 2 minutes.

## Website work, most useful first

1. **Show the newest Editor's Pick in the main feed.** Picks are only behind the Editor's Picks button today. Small.
2. **Put the latest headlines in the page itself, rendered on the server.** The front page and town pages arrive as loading placeholders, and stories load afterwards. With headlines in the HTML, Google sees real local news and phones show stories sooner. Medium; worth it once the sitemap is in Search Console.
3. **Sharing.**
   - A share button on stories and town pages that opens the phone's own share menu.
   - A preview image per town ("Kingston news — Debrief.TO") so shared links look local.
   - Almost all visitors type the address, so word of mouth is how the site grows. Small to medium.
4. **Owners for the 39 local newsrooms without one.** The About page shows who owns or funds each newsroom; these 39 show nothing until their owner is confirmed.
5. **A feed for each town for news reader apps** (`/kingston/feed.xml`). Parked by Raj: nice to have, not a priority.

## Watching

- **Metroland/Torstar papers turned away with "too many requests"** (429), from Vercel and from GitHub's network alike. We ask each paper once per run, slowly, so this is their limit and not to be worked around. 75 towns depend on one of these papers for their own news; when it has nothing in the week, their tab shows the region's newsroom instead.
- **The collector.** Runs hourly at :47 (cron-job.org) and :17 (GitHub's schedule, often late), each in two parts of four minutes, so every publication is reached. The nightly stats report lists failures.
- **Database space.** 66% of the free 30 MB on November 18. At 85% the oldest days start being trimmed early. Towns opened before November 4 stop being collected on December 4 unless someone reads them, which should slow it.
- **Toronto's council box** says the new council's schedule isn't published as open data yet. It fills on its own once the City publishes the 2026–2030 file.

## Known, leave for now

- **"`url.parse()` is deprecated" in the server logs.** It comes from `rss-parser`, unmaintained since 2023. It's harmless: Node still supports it. Replacing the library would touch every feed fetch.
