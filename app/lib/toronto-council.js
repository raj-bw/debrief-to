/* ---- Toronto's council calendar ----
   Toronto doesn't use eSCRIBE like the 119 towns in councils.js. Its
   meetings live in TMMIS (secure.toronto.ca/council), whose public pages
   are built from two read-only JSON addresses:

     /council/api/multiple/decisionbody-list.json?termId=N
         every council, committee and board for one term of council
     /council/api/multiple/meeting.json?decisionBodyId=N
         every meeting of one of them, past and future

   Both answer a plain GET with no sign-in. Terms are numbered (8 is
   2022–2026, 9 is 2026–2030); the newest term with any bodies in it is
   the current one, so nothing needs changing when a new council sits.

   Quasi-judicial panels and internal subcommittees (property standards
   hearings, dog-bite tribunals, bid awards, staff appraisals) are left out:
   they are public, but they are not what a resident means by "council". */

const BASE = "https://secure.toronto.ca/council";
export const TORONTO_PORTAL = `${BASE}/`;

const SKIP = /property standards|dangerous dog|sign variance|tribunal|bid award|debenture|nominating|appraisal|human resources|labour relations|budget subcommittee|compliance audit/i;

const HEADERS = {
  Accept: "application/json",
  "User-Agent": "DebriefTO/1.0 (+https://debrief.to; free local news reader)",
};

async function getJson(url) {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Status code ${res.status}`);
  return res.json();
}

// A few at a time, so the city's server isn't asked fifty things at once.
async function mapLimit(items, limit, fn) {
  const out = [];
  let i = 0;
  const worker = async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]).catch(() => null); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function currentBodies() {
  const terms = [12, 11, 10, 9, 8];
  const lists = await Promise.all(terms.map((t) =>
    getJson(`${BASE}/api/multiple/decisionbody-list.json?termId=${t}`).then((j) => j.Records || []).catch(() => [])));
  // The newest term with bodies, plus the one before it: around an election
  // the outgoing term's boards still have meetings on the books.
  const filled = lists.filter((l) => l.length);
  const bodies = new Map();
  for (const list of filled.slice(0, 2)) {
    for (const b of list) {
      if (b.webpostInd && b.webpostInd !== "Y") continue;
      if (SKIP.test(b.decisionBodyName || "")) continue;
      bodies.set(b.decisionBodyId, b);
    }
  }
  return [...bodies.values()];
}

const DAY_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", weekday: "long", month: "long", day: "numeric", year: "numeric" });
const TIME_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hour: "numeric", minute: "2-digit" });
const HM = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hour: "2-digit", minute: "2-digit", hour12: false });

function when(ms) {
  const d = new Date(ms);
  const day = DAY_FMT.format(d);
  // TMMIS often records only the date (midnight); don't invent a time.
  return HM.format(d) === "00:00" ? day : `${day} @ ${TIME_FMT.format(d)}`;
}

let memo = null;
const MEMO_MS = 60 * 60 * 1000;

export async function torontoMeetings({ daysAhead = 21, max = 6 } = {}) {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.value;
  const bodies = await currentBodies();
  if (!bodies.length) throw new Error("no council bodies listed");
  // Compare calendar days in Toronto, so a meeting dated today still counts
  // this afternoon even when TMMIS stored it as midnight.
  const day = (ms) => new Date(ms).toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
  const today = day(Date.now());
  const last = day(Date.now() + daysAhead * 86400000);

  const perBody = await mapLimit(bodies, 8, (b) =>
    getJson(`${BASE}/api/multiple/meeting.json?decisionBodyId=${b.decisionBodyId}`).then((j) => (j.Records || []).map((m) => ({ ...m, body: b }))));
  const seen = new Set();
  const meetings = perBody.flat().filter(Boolean)
    .filter((m) => { const d = day(m.meetingDate); return d >= today && d <= last; })
    .filter((m) => !/CANC/i.test(m.mtgStatusCd || ""))
    .filter((m) => (seen.has(m.meetingId) ? false : seen.add(m.meetingId)))
    .sort((a, b) => a.meetingDate - b.meetingDate || (a.body.tier || 9) - (b.body.tier || 9))
    .slice(0, max)
    .map((m) => {
      const page = `${BASE}/#/committees/${m.decisionBodyId}/${m.meetingId}`;
      // Until the agenda is published the meeting is only "scheduled".
      const agendaOut = !/^SCHED|^SCHDL/i.test(m.mtgStatusCd || "");
      return {
        name: (m.body.decisionBodyName || "").trim(),
        when: when(m.meetingDate),
        start: new Date(m.meetingDate).toISOString(),
        where: "",
        agenda: agendaOut ? page : null,
        page,
      };
    });
  memo = { at: Date.now(), value: meetings };
  return meetings;
}
