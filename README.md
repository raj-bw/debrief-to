# Debrief.TO

**Free local news for Ontario, in one place.** → [debrief.to](https://debrief.to)

Debrief.TO collects headlines from local and independent newsrooms across Ontario and shows them on one page, newest first. Pick your town, and you get your local paper alongside Toronto, Ontario and national reporting. Every headline links to the original story on the publisher's own website.

There is no account, no paywall on our side, and no personalized or popularity-based ranking.

---

## Why it exists

Credible local reporting is spread across dozens of sites, and much of it sits behind paywalls. Many people end up relying on social media feeds for news about their own community. Debrief.TO is a simple answer to one question: *what is happening where I live?* It does not host or rewrite stories. It points readers to the newsrooms that reported them.

---

## What it does

- **Your town's news.** Covers all 412 Ontario municipalities through 117 local newsrooms. If your town has no newsroom on the list, you get the one covering your region.
- **Toronto, Ontario and Canada.** A fixed set of city, provincial and national newsrooms that every reader sees.
- **Topics.** Environment, Investigative, National Politics, and Urbanism & Transit, assigned story by story.
- **Today, This Week, This Month.** Stories are kept for 33 days, so the longer views stay complete even after they drop out of a publisher's own feed.
- **Council agendas.** Upcoming council and committee meetings, with agenda links, for 119 towns and the City of Toronto. Shown separately from the news.
- **Clear labels.** *Subscription* for paywalled stories, *Opinion* for commentary, and one card with "also covered by" when several newsrooms report the same story.
- **Private by design.** Your town, saved stories and settings stay in your browser. Nothing is tracked.

The full list of newsrooms, and the rules for what is included and filtered out, are published on the site's About page.

---

## Credits

**The newsrooms.** Every story on Debrief.TO belongs to the newsroom that reported it. Local journalism depends on readers: if a story is useful to you, read it on the publisher's site and subscribe if you can. Publishers who would prefer not to appear can email hello@debrief.to.

**Apathy is Boring.** Debrief.TO was built in Newmarket, Ontario, as part of the [Apathy is Boring](https://www.apathyisboring.com) BUILD program.

**Public data.**
- Council schedules come from each municipality's official eSCRIBE meeting portal, and from the [City of Toronto Open Data](https://open.toronto.ca/dataset/city-council-and-committees-meeting-schedule-reports/) portal (Open Government Licence – Toronto).
- Regional groupings follow [Statistics Canada's economic regions](https://www23.statcan.gc.ca/imdb/p3VD.pl?Function=getVDStruct&TVD=131938&CVD=138862&CPV=35&CST=01012006&CLV=1&MLV=4) for Ontario.

**Claude.** Much of the code was written with [Claude](https://claude.ai), Anthropic's AI assistant, working from the project's direction and decisions. That includes the feed pipeline, the archive, the council integrations and the testing. Editorial decisions, including which newsrooms are carried and the rules for what is shown, are made by a person.

---

## Contact

hello@debrief.to

---

## For developers

<details>
<summary>How it works, and how to run it locally</summary>

### How it works

1. **Collector** (`app/api/collect`) visits every newsroom's RSS feed or WordPress API every hour and stores new stories in Redis. It runs whether or not anyone visits the site.
2. **Readers** (`app/api/feed`) read from Redis, not from publishers. A town is added to the collector's list the first time anyone picks it.
3. **Retention.** Stories older than 33 days are removed daily. If storage passes 85% full, older days are trimmed early, never below 21 days.
4. **Council** (`app/api/council`) reads eSCRIBE portals and Toronto Open Data, cached for an hour.
5. **Health** (`/api/health`) reports which feeds answer and the state of the archive. `?limit=1` gives a quick archive summary. `?scope=standing` checks the Toronto, Ontario and Canada sources.

### Stack

- [Next.js](https://nextjs.org) 16 (App Router), hosted on [Vercel](https://vercel.com)
- [Redis](https://redis.io) (Redis Cloud, via the Vercel Marketplace) for the story archive
- A GitHub Action (`.github/workflows/archive-ping.yml`) that runs the collector hourly, plus a daily Vercel Cron as a backup

### Key files

| Path | What it holds |
|---|---|
| `app/page.js` | The site's interface |
| `app/lib/sources.js` | Toronto, Ontario and Canada newsrooms |
| `app/lib/publishers.js`, `app/lib/towns.js` | Local newsrooms and the towns they serve |
| `app/lib/filters.js`, `app/lib/topics.js` | What is filtered out, and how topics and places are assigned |
| `app/lib/archive.js` | Redis storage and the 33-day rule |
| `app/lib/councils.js`, `app/lib/toronto-council.js` | Council meeting sources |

### Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

### Environment variables

| Name | Purpose |
|---|---|
| `REDIS_URL` | Redis connection for the archive. Without it, the site fetches publishers live. |
| `CRON_SECRET` | Protects `/api/collect`. Set the same value as a GitHub Actions secret. |
| `ARCHIVE_CAPACITY_MB` | Optional. Storage limit used for the 85% safety trim (default 30). |

</details>
