import { resolveTown } from "../../lib/towns";
import { councilPortal } from "../../lib/councils";

/* ---- Coming up at council ----
   The next few weeks of meetings for the reader's own municipality, with a
   link to each agenda. Read from the town's eSCRIBE portal, which is where
   Ontario councils publish the agendas they're required to post before they
   meet.

   This is not news and isn't shown as news: it sits in its own box, marked
   as the town's official record, and never enters the story feed. What it
   adds is the thing local reporting usually can't cover in full — every
   committee, every week, including the ones no reporter attends.

     /api/council?town=newmarket ---- */

export const dynamic = "force-dynamic";

// Agendas change rarely and councils meet weekly at most, so an hour is plenty.
const CDN_CACHE = "public, s-maxage=3600, stale-while-revalidate=7200";
const DAYS_AHEAD = 21;
const MAX_MEETINGS = 6;

// eSCRIBE gives local Toronto-time strings ("2026/09/22 16:00:06") with no
// zone, so compare them against "now" written the same way.
function torontoNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.year}/${p.month}/${p.day} ${p.hour === "24" ? "00" : p.hour}:${p.minute}:${p.second}`;
}

const ymd = (d) => d.toISOString().slice(0, 10);

function agendaLink(base, m) {
  const docs = Array.isArray(m.MeetingDocumentLink) ? m.MeetingDocumentLink : [];
  // The HTML agenda reads properly on a phone; the PDF is the fallback.
  const pick = docs.find((d) => d.Type === "Agenda" && d.Format === "HTML")
    || docs.find((d) => d.Type === "Agenda")
    || null;
  if (!pick?.Url) return null;
  return pick.Url.startsWith("http") ? pick.Url : `${base}${pick.Url.startsWith("/") ? "" : "/"}${pick.Url}`;
}

function clean(s) {
  return String(s || "").replace(/<br\s*\/?>/gi, ", ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const town = resolveTown(searchParams.get("town") || "");
  const base = councilPortal(town.townName);

  if (!base) {
    return Response.json({ town: town.townName, available: false, meetings: [] },
      { headers: { "Cache-Control": "public, max-age=0", "Vercel-CDN-Cache-Control": CDN_CACHE } });
  }

  const start = new Date();
  const end = new Date(Date.now() + DAYS_AHEAD * 86400000);
  try {
    const res = await fetch(`${base}/MeetingsCalendarView.aspx/GetCalendarMeetings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "DebriefTO/1.0 (+https://debrief.to; free local news reader)",
      },
      body: JSON.stringify({ calendarStartDate: ymd(start), calendarEndDate: ymd(end) }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Status code ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data?.d) ? data.d : [];
    const now = torontoNow();

    const meetings = list
      .filter((m) => m.StartDate && m.StartDate >= now.slice(0, 10) + " 00:00:00")   // today onward
      .filter((m) => !/cancel/i.test(`${m.MeetingName} ${m.Location} ${m.Description}`))
      .sort((a, b) => a.StartDate.localeCompare(b.StartDate))
      .slice(0, MAX_MEETINGS)
      .map((m) => ({
        name: clean(m.MeetingName),
        when: clean(m.FormattedStart),          // "Tuesday, September 22, 2026 @ 4:00 PM"
        start: m.StartDate,
        where: clean(m.Location),
        agenda: m.HasAgenda ? agendaLink(base, m) : null,
        page: m.Url || base,
      }));

    return Response.json({ town: town.townName, available: true, portal: base, meetings },
      { headers: { "Cache-Control": "public, max-age=0", "Vercel-CDN-Cache-Control": CDN_CACHE } });
  } catch (err) {
    // A portal that doesn't answer just means no box today; don't cache that.
    return Response.json({ town: town.townName, available: true, portal: base, meetings: [], error: err?.message },
      { headers: { "Cache-Control": "no-store" } });
  }
}
