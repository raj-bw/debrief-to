/* ---- Which meetings the council box lists ----
   Shared by the eSCRIBE towns (app/api/council) and Toronto
   (toronto-council.js). Times are Toronto's, written "YYYY-MM-DD HH:MM",
   which compare correctly as plain text. */

// Toronto's wall clock at a given moment, "YYYY-MM-DD HH:MM"
const CLOCK = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hour12: false,
});
export function torontoClock(ms = Date.now()) {
  const p = Object.fromEntries(CLOCK.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}

/* A meeting stays listed until three hours after it starts. Meetings don't
   say when they end, and one under way still has an agenda worth opening,
   but a meeting held this morning isn't "coming up" tonight, which is how
   the box read until November 2026. A meeting with a date and no time
   (startLocal "YYYY-MM-DD") stays all that day. */
const UNDER_WAY_MS = 3 * 60 * 60 * 1000;
export function notOverYet(startLocal, now = Date.now()) {
  if (!startLocal) return false;
  if (startLocal.length <= 10) return startLocal >= torontoClock(now).slice(0, 10);
  return startLocal >= torontoClock(now - UNDER_WAY_MS);
}

/* Some councils post one meeting twice under two wordings at the same time:
   LaSalle's "Inaugural Council Meeting" and "Inaugural Meeting of Council".
   The same start and the same words, give or take "meeting" and "of", is
   one meeting. Of the copies, the one with an agenda is kept; otherwise the
   first. Order is otherwise unchanged. */
const FILLER = new Set(["meeting", "meetings", "of", "the", "and", "a", "for", "to"]);
const sameAs = (m) => `${m.start}|${String(m.name || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !FILLER.has(w)).sort().join(" ")}`;
export function withoutRepeats(meetings) {
  const kept = new Map();
  for (const m of meetings) {
    const prev = kept.get(sameAs(m));
    if (!prev || (!prev.agenda && m.agenda)) kept.set(sameAs(m), m);
  }
  return meetings.filter((m) => kept.get(sameAs(m)) === m);
}
