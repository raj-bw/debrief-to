# Debrief.TO

**Free local news for Ontario, in one place.** → [debrief.to](https://debrief.to)

Debrief.TO gathers headlines from local and independent newsrooms across Ontario and shows them on one page, newest first. Pick your town and you get your local news next to stories about Toronto, Ontario and Canada. Every headline links to the full story on the newsroom's own website.

No account, no ads, no cookies, and nothing ranked by popularity or personalized.

---

## Why it exists

Local news is spread across hundreds of websites, and on social media it competes with everything else in the feed. Debrief.TO answers one question: *what's happening where I live?* It doesn't host or rewrite stories. It sends readers to the newsrooms that reported them, because local journalism depends on people who read, subscribe and donate.

---

## What it does

- **Your town's news.** Covers 412 Ontario towns and cities through 134 local newsrooms. If your town has no newsroom on our list, you get the one covering your region. Every town has its own page, like [debrief.to/kingston](https://debrief.to/kingston).
- **Toronto, Ontario and Canada.** A fixed set of city, provincial and national newsrooms that every reader sees.
- **Topics.** Environment, Investigative, National Politics, and Urbanism & Transit, assigned story by story.
- **Today, This Week, This Month.** Stories are kept for 33 days, so the longer views stay complete after stories drop out of a newsroom's own feed.
- **Editor's Picks.** Stories chosen by hand for strong reporting or importance to Ontarians. Each stays at the top for 90 days, then moves to Past picks.
- **Council meetings.** Upcoming council and committee meetings, with agenda links, for 119 towns and the City of Toronto. Kept apart from the news.
- **Clear labels.**
  - *Subscription*: the story may need a subscription to read.
  - *Opinion*: commentary.
  - *Republished from*: one newsroom carrying another's story, with a link to the original.
  - *Also covered by*: several newsrooms reported the same story; it's shown once, with links to the others.
- **Private by design.** Your town, saved stories and settings stay on your device. Visits are counted without cookies, and nothing tracks what you read. See [debrief.to/privacy](https://debrief.to/privacy).

The full list of newsrooms, and what's left out of the feed and why, are on the site's About page.

---

## Credits

**The newsrooms.** Every story on Debrief.TO belongs to the newsroom that reported it. If a story is useful to you, read it on the newsroom's site and subscribe if you can. Newsrooms that would rather not appear can email hello@debrief.to.

**Apathy is Boring.** Debrief.TO was built in Newmarket, Ontario, as part of the [Apathy is Boring](https://www.apathyisboring.com) BUILD program.

**Public data.**
- Council schedules come from each town's official eSCRIBE meeting portal, and from the [City of Toronto Open Data](https://open.toronto.ca/dataset/city-council-and-committees-meeting-schedule-reports/) portal (Open Government Licence – Toronto).
- Regions follow [Statistics Canada's economic regions](https://www23.statcan.gc.ca/imdb/p3VD.pl?Function=getVDStruct&TVD=131938&CVD=138862&CPV=35&CST=01012006&CLV=1&MLV=4) for Ontario.

**Claude.** Much of the code was written with [Claude](https://claude.ai), Anthropic's AI assistant, working from the project's direction and decisions. That includes the feed pipeline, the archive, the council integrations and the testing. Editorial decisions, including which newsrooms are carried, the Editor's Picks and the rules for what is shown, are made by a person.

---

## Contact and feedback

- Email: hello@debrief.to
- Feedback, bugs or a newsroom we should add: [open an issue](https://github.com/raj-bw/debrief-to/issues/new). Issues are public, so use email for anything private.

---

## For developers

<details>
<summary>How it works, and how to run it locally</summary>

### How it works

1. **Collector** (`app/api/collect`) reads every newsroom's RSS feed (or WordPress API) and stores new stories in Redis. It runs whether or not anyone visits.
   - It runs every hour from GitHub Actions (`.github/workflows/archive-ping.yml`), started on time by a cron-job.org timer, plus once a day from Vercel Cron as a backup.
   - Each run comes in two parts (`?part=1&of=2`, then `part=2`), each with four minutes, so every newsroom is reached.
   - Metroland/Torstar papers that refuse Vercel with "too many requests" are asked once more from GitHub's network (`scripts/second-network.mjs` → `app/api/deliver`).
2. **Readers** (`app/api/feed`) read from Redis, not from newsrooms. A town is collected while someone has read it in the last 30 days. At most 25 new towns join per hour. Crawlers don't add towns.
3. **Cleanup.** Stories older than 33 days are removed daily. If storage passes 85% full, older days are trimmed early, never below 21 days.
4. **Story matching** (`app/lib/cluster.js`). The same story from several newsrooms becomes one card. A copy republished days later is marked "Republished from" (`app/lib/republished.js`).
5. **Council** (`app/api/council`) reads eSCRIBE portals and Toronto Open Data, cached for an hour.
6. **Health** (`/api/health`) reports which feeds answer, how many stories readers would get from each, and the state of the archive.
   - `?limit=0`: archive summary only (asks no newsroom).
   - `?scope=standing`: the Toronto, Ontario and Canada sources.
   - `?towns=1&offset=0&limit=30`: town feeds, in pages. `&skip=blox` leaves out Metroland/Torstar.
   - `?sample=<name>`: what one feed carries.
   - `?last=1`: the last full check.
   - Without `CRON_SECRET` (as `Authorization: Bearer …`), a check that asks newsrooms runs at most once every two minutes.

### Stack

- [Next.js](https://nextjs.org) 16 (App Router), hosted on [Vercel](https://vercel.com), with Vercel Web Analytics (no cookies)
- [Redis](https://redis.io) (Redis Cloud, via the Vercel Marketplace) for the story archive
- GitHub Actions for collection and for the checks on every pull request

### Key files

| Path | What it holds |
|---|---|
| `app/page.js` | The site's interface, including the About page |
| `app/[town]/page.js` | A page for each town |
| `app/privacy/` | The privacy page |
| `app/lib/sources.js` | Toronto, Ontario and Canada newsrooms |
| `app/lib/publishers.js`, `app/lib/towns.js` | Local newsrooms and the towns they serve |
| `app/lib/picks.js` | Editor's Picks |
| `app/lib/filters.js`, `app/lib/topics.js` | What's left out, and how topics and places are assigned |
| `app/lib/cluster.js`, `app/lib/republished.js` | One card per story; "Republished from" |
| `app/lib/archive.js`, `app/lib/collect-jobs.js` | Redis storage, the 33-day rule, which towns are collected |
| `app/lib/councils.js`, `app/lib/toronto-council.js` | Council meeting sources |

### Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

### Tests

```bash
npm test                      # unit tests; archive tests also need REDIS_URL
npm run build && npm start    # then, in another terminal:
npm run test:browser          # phone and computer checks in a real browser
```

The browser checks need Playwright (`npm install --no-save playwright`) and a test archive: run `node --import ./tests/register.mjs tests/seed.mjs` against a throwaway Redis first. They block every outside request, so they never reach a newsroom or debrief.to. GitHub runs all of this on every pull request (`.github/workflows/checks.yml`).

### Environment variables

| Name | Purpose |
|---|---|
| `REDIS_URL` | Redis connection for the archive. Without it, the site asks newsrooms directly. |
| `CRON_SECRET` | Protects `/api/collect` and `/api/deliver`. Set the same value as a GitHub Actions secret. |
| `ARCHIVE_CAPACITY_MB` | Optional. Storage limit used for the 85% safety trim (default 30). |

</details>
