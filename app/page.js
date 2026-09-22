"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { townOptions, DEFAULT_TOWN, resolveTown } from "./lib/towns";

/* The newsrooms Debrief.TO carries. This list is the credit roll on the About
   page — it is no longer what drives the filters, because categories now
   belong to individual articles rather than to whole publications. */
const PUBLISHERS = [
  { name: "CBC Toronto", color: "#E03C31", url: "https://www.cbc.ca/news/canada/toronto", place: "Toronto" },
  { name: "TorontoToday", color: "#0F7B6C", url: "https://www.torontotoday.ca", place: "Toronto" },
  { name: "The Green Line", color: "#4C8C2B", url: "https://thegreenline.to", place: "Toronto" },
  { name: "thelocal.to", color: "#3A9B7A", url: "https://thelocal.to", place: "Toronto" },
  { name: "Spacing Toronto", color: "#0F2E4A", url: "https://spacing.ca/toronto", place: "Toronto" },
  { name: "Toronto Star", color: "#003DA5", url: "https://www.thestar.com", place: "Toronto", paywall: true },
  { name: "The Trillium", color: "#7B2D8E", url: "https://www.thetrillium.ca", place: "Ontario", paywall: true },
  { name: "The Narwhal", color: "#2D6A4F", url: "https://thenarwhal.ca", place: "Ontario" },
  { name: "National Observer", color: "#0B7285", url: "https://www.nationalobserver.com", place: "National" },
  { name: "The Breach", color: "#1565C0", url: "https://breachmedia.ca", place: "National" },
  { name: "IJF", color: "#8B5E00", url: "https://theijf.org", place: "National" },
  { name: "Ricochet", color: "#B3261E", url: "https://ricochet.media", place: "National" },
  { name: "The Maple", color: "#A8324A", url: "https://www.readthemaple.com", place: "National" },
  { name: "Canadaland", color: "#C62828", url: "https://www.canadaland.com", place: "National" },
  { name: "The Walrus", color: "#D4872C", url: "https://thewalrus.ca", place: "National" },
];

/* Two kinds of filter, shown as two rows in the Sources panel: WHERE the news
   is from, and WHAT it covers.

   These are separate axes, not alternatives. An article about a highway's
   environmental assessment is Toronto AND Environment, and selecting either
   one finds it. Selecting both still shows it once — the feed is deduplicated
   by link long before it reaches the page.

   The first place is whatever the reader's local tab is called: their town if
   it has a publisher of its own, otherwise the region that covers it. */
function buildCategories(homeLabel) {
  return [
    { label: homeLabel, icon: "\u{1F4CD}", group: "place", kind: "place", color: "#1A73E8", home: true },
    { label: "Toronto", icon: "\u{1F3D9}", group: "place", kind: "place", color: "#0F7B6C" },
    { label: "Ontario", icon: "\u{1F341}", group: "place", kind: "place", color: "#7B2D8E" },
    { label: "Environment", icon: "\u{1F33F}", group: "topic", kind: "topic", color: "#2D6A4F" },
    { label: "Investigative", icon: "\u{1F50D}", group: "topic", kind: "topic", color: "#8B5E00" },
    { label: "National Politics", icon: "\u{1F1E8}\u{1F1E6}", group: "topic", kind: "topic", color: "#B3261E" },
    { label: "Urbanism & Transit", icon: "\u{1F687}", group: "topic", kind: "topic", color: "#0F2E4A" },
  ];
}

const TIME_OPTIONS = ["Today", "This Week", "This Month"];
// What each view asks the server for. The server reaches into the archive for
// anything longer than a day.
const RANGE_FOR = { "Today": "today", "This Week": "week", "This Month": "month" };

// Helper: get a visible tint for category pill backgrounds
// Dark source colours like #0F2E4A need stronger opacity to show up
// Brand colours like Spacing's navy are too dark to read on a dark background,
// so in dark mode we mix the colour with white until it's legible.
function lightenForDark(hexColor, amount = 0.55) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function getCatTint(hexColor, opacity) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function filterByTime(articles, timeFilter) {
  // Rolling windows (not calendar boundaries) so the feed is never empty just
  // because it's early in a new day/week/month. "This Month" is the last 31 days.
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const cutoff =
    timeFilter === "Today" ? now - DAY :
    timeFilter === "This Week" ? now - 7 * DAY :
    now - 31 * DAY;
  return articles.filter((a) => new Date(a.pubDate).getTime() >= cutoff);
}

function formatDateHeading(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" });
}

function groupByDate(articles) {
  const groups = {};
  articles.forEach((a) => {
    const key = new Date(a.pubDate).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });
  return Object.entries(groups)
    .sort(([a], [b]) => new Date(b) - new Date(a))
    .map(([dateKey, arts]) => ({ label: formatDateHeading(dateKey), articles: arts }));
}

/* ---- Header pieces shared by the feed, Saved and About pages ----
   Keeping one component means the three capsules land in exactly the same
   place on every page, so the button you clicked is the button you click
   again to come back. ---- */

// Left block: the wordmark. Fixed width so the capsules never shift sideways
// between pages, whatever size the wordmark is.
function Wordmark({ dm, size = 28, tagline = true, onClick }) {
  const inner = (
    <>
      <h1 style={{ fontFamily: "'Georgia', serif", fontSize: size, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1, margin: 0 }}>
        <span style={{ color: "#2D6A4F" }}>Debrief</span>
        <span style={{ color: dm ? "#E8E5E0" : "#2C2C2C" }}>.TO</span>
      </h1>
      {tagline && <p style={{ fontSize: 12, color: dm ? "#C8C4BE" : "#000", marginTop: 4, fontWeight: 400 }}>Local news, in one place</p>}
    </>
  );
  const box = { flex: "0 0 auto", minWidth: "min(230px, 100%)", textAlign: "left" };
  if (!onClick) return <div style={box}>{inner}</div>;
  return (
    <button onClick={onClick} aria-label="Back to the feed" style={{ ...box, background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}>
      {inner}
    </button>
  );
}

// The three capsules. On the Saved and About pages the matching capsule is
// filled in and shows an x — clicking it takes you back to the feed.
function NavCapsules({ dm, page, savedCount, onToggleDark, onGo }) {
  const base = { display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s ease", whiteSpace: "nowrap" };
  const X = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  );
  const savedOpen = page === "bookmarks";
  const aboutOpen = page === "about";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 auto", flexShrink: 0 }}>
      <button onClick={onToggleDark} style={{ ...base, gap: 5, background: dm ? "#2D6A4F" : "transparent", border: `1.5px solid ${dm ? "#2D6A4F" : "#8A8580"}`, color: dm ? "#FFF" : "#6B665F" }}>
        {dm ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        )}
        {dm ? "Light" : "Dark"}
      </button>

      <button onClick={() => onGo(savedOpen ? "feed" : "bookmarks")} aria-pressed={savedOpen}
        aria-label={savedOpen ? "Close saved articles and go back to the feed" : "Open saved articles"}
        style={{ ...base, fontWeight: savedOpen ? 600 : 500, background: savedOpen ? "#C0354A" : "transparent", border: `1.5px solid ${savedOpen ? "#C0354A" : (dm ? "#5A3040" : "#E8D0D6")}`, color: savedOpen ? "#FFF" : (dm ? "#E63956" : "#C0354A") }}>
        {savedOpen ? <X /> : <svg width="15" height="15" viewBox="0 0 24 24" fill="#E63956" stroke="#2B2D5B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>}
        Saved
        {savedCount > 0 && !savedOpen && (
          <span style={{ fontSize: 10, fontWeight: 700, background: "#E63956", color: "#FFF", padding: "1px 6px", borderRadius: 8, lineHeight: "16px" }}>{savedCount}</span>
        )}
      </button>

      <button onClick={() => onGo(aboutOpen ? "feed" : "about")} aria-pressed={aboutOpen}
        aria-label={aboutOpen ? "Close About and go back to the feed" : "Open About"}
        style={{ ...base, fontWeight: aboutOpen ? 600 : 500, background: aboutOpen ? "#2D6A4F" : "transparent", border: `1.5px solid ${aboutOpen ? "#2D6A4F" : (dm ? "#2E5A47" : "#CDE3D7")}`, color: aboutOpen ? "#FFF" : (dm ? "#7FD3A8" : "#2D6A4F") }}>
        {aboutOpen ? <X /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>}
        About
      </button>
    </div>
  );
}

/* ---- Choosing your town ----
   Asked once, on a reader's first visit. The list is the towns Debrief.TO
   knows about, searched as you type — not every place in Canada, because
   offering a town we have no publisher for and then showing an empty page
   would be worse than not offering it.

   A town with no publisher of its own is still listed, greyed out, saying
   which region it will fall back to. Skipping leaves the site on Newmarket,
   the town it was built for. ---- */
function TownPicker({ dm, onPick, onSkip }) {
  const [query, setQuery] = useState("");
  const options = townOptions();
  const q = query.trim().toLowerCase();
  // Every town, always — the list scrolls. Showing only the first handful made
  // it look like those were the only places on offer.
  const matches = q
    ? options.filter((t) => t.name.toLowerCase().includes(q) || t.regionName.toLowerCase().includes(q))
    : options;

  const c = {
    panel: dm ? "#242424" : "#FFF",
    border: dm ? "#3A3A3A" : "#E8E5E0",
    text: dm ? "#F0EDE8" : "#1A1A1A",
    body: dm ? "#C8C4BE" : "#3C3A37",
    muted: dm ? "#9A958E" : "#6B665F",
    inputBg: dm ? "#2A2A2A" : "#FFF",
    inputBorder: dm ? "#4A4A4A" : "#8A8580",
    rowHover: dm ? "#2F2F2F" : "#F4F1EC",
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Choose your town"
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 16, width: "100%", maxWidth: 460, maxHeight: "min(640px, 92vh)", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "26px 24px 16px" }}>
          <h2 style={{ fontFamily: "'Georgia', serif", fontSize: 22, fontWeight: 700, color: c.text, margin: "0 0 8px" }}>Where do you live?</h2>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: c.body, margin: "0 0 16px" }}>
            Debrief.TO will show your community&apos;s news first. Your choice stays in this browser — there&apos;s no account and nothing is sent to us.
          </p>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for your town..."
            aria-label="Search for your town"
            style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${c.inputBorder}`, borderRadius: 24, padding: "12px 18px", fontSize: 15, fontFamily: "inherit", background: c.inputBg, color: c.text, outline: "none" }}
          />
          <p style={{ fontSize: 12, color: c.muted, margin: "10px 2px 0" }}>
            {q
              ? `${matches.length} ${matches.length === 1 ? "match" : "matches"}`
              : `${options.length} towns \u2014 scroll, or start typing`}
          </p>
        </div>

        <div style={{ overflowY: "auto", padding: "0 12px", flex: 1, minHeight: 180, WebkitOverflowScrolling: "touch" }}>
          {matches.length === 0 ? (
            <p style={{ fontSize: 14, color: c.muted, padding: "18px 12px 24px", lineHeight: 1.6, margin: 0 }}>
              No town by that name yet. Skip for now and you&apos;ll get Newmarket — or email hello@debrief.to and ask for yours.
            </p>
          ) : (
            matches.map((t) => (
              <button key={t.slug} onClick={() => onPick(t.slug)}
                style={{ display: "flex", width: "100%", alignItems: "baseline", justifyContent: "space-between", gap: 10, textAlign: "left", background: "transparent", border: "none", borderRadius: 10, padding: "12px 12px", cursor: "pointer", fontFamily: "inherit", color: c.text }}
                onMouseEnter={(e) => { e.currentTarget.style.background = c.rowHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                <span style={{ fontSize: 15.5, fontWeight: t.hasOwn ? 600 : 500, color: t.hasOwn ? c.text : c.muted }}>{t.name}</span>
                <span style={{ fontSize: 12, color: c.muted, textAlign: "right", flexShrink: 0 }}>
                  {t.hasOwn ? t.regionName : `No results — showing ${t.regionName}`}
                </span>
              </button>
            ))
          )}
        </div>

        <div style={{ borderTop: `1px solid ${c.border}`, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: c.muted }}>You can change this any time.</span>
          <button onClick={onSkip} style={{ background: "transparent", border: `1.5px solid ${dm ? "#4A4A4A" : "#D4D0CA"}`, borderRadius: 20, padding: "9px 18px", fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", color: c.body }}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

function SiteIcons({ dark }) {
  const dir = dark ? "/icons/dark" : "/icons";
  return (
    <>
      <link rel="icon" type="image/png" sizes="16x16" href={`${dir}/favicon-16.png`} />
      <link rel="icon" type="image/png" sizes="32x32" href={`${dir}/favicon-32.png`} />
      <link rel="icon" type="image/png" sizes="192x192" href={`${dir}/favicon-192.png`} />
    </>
  );
}

/* ---- About ----
   The site argues that opaque algorithms decide too much of what people see.
   Publishing our own rules is the consistent thing to do — and it is a
   promise we can be held to. ---- */
function AboutPage({ onBack, darkMode, onToggleDark, onGo, savedCount, homeLabel }) {
  const dm = darkMode;
  const c = {
    bg: dm ? "#1A1A1A" : "#FAF8F5",
    cardBg: dm ? "#242424" : "#FFF",
    cardBorder: dm ? "#3A3A3A" : "#E8E5E0",
    text: dm ? "#E8E5E0" : "#2C2C2C",
    title: dm ? "#F0EDE8" : "#1A1A1A",
    body: dm ? "#C8C4BE" : "#3C3A37",
    muted: dm ? "#9A958E" : "#6B665F",
    accent: dm ? "#7FD3A8" : "#2D6A4F",
  };
  const Section = ({ heading, children }) => (
    <section style={{ marginBottom: 36 }}>
      {heading && (
        <h3 style={{ fontFamily: "'Georgia', serif", fontSize: 21, fontWeight: 700, color: c.title, margin: "0 0 14px" }}>{heading}</h3>
      )}
      {children}
    </section>
  );
  const P = ({ children }) => (
    <p style={{ fontSize: 15.5, lineHeight: 1.75, color: c.body, margin: "0 0 15px" }}>{children}</p>
  );
  const Rule = ({ title, children }) => (
    <p style={{ fontSize: 15.5, lineHeight: 1.75, color: c.body, margin: "0 0 15px" }}>
      <strong style={{ color: c.title, fontWeight: 600 }}>{title}</strong> {children}
    </p>
  );

  const groups = [
    { label: "Toronto", note: "City and neighbourhood reporting" },
    { label: "Ontario", note: "Provincial politics and the environment beat" },
    { label: "National", note: "Independent and investigative newsrooms" },
  ];

  return (
    <div style={{ fontFamily: "inherit", minHeight: "100vh", background: c.bg, color: c.text }}>
      <header style={{ background: dm ? "#1E1E1E" : "#FFF", borderBottom: `1px solid ${dm ? "#2A2A2A" : "#E8E5E0"}`, zIndex: 100 }}>
        <div style={{ padding: "20px clamp(16px, 5vw, 120px) 16px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <Wordmark dm={dm} size={22} tagline={false} onClick={onBack} />
          <NavCapsules dm={dm} page="about" savedCount={savedCount} onToggleDark={onToggleDark} onGo={onGo} />
          <div style={{ flex: "0 1 480px", minWidth: "min(240px, 100%)", display: "flex", alignItems: "center", justifyContent: "flex-end", order: 3 }}>
            <h2 style={{ fontFamily: "'Georgia', serif", fontSize: 22, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10, color: c.title }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              About
            </h2>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px clamp(16px, 4vw, 24px) 96px" }}>

        <h1 style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(24px, 5.5vw, 32px)", fontWeight: 700, color: c.title, lineHeight: 1.3, margin: "0 0 22px" }}>
          Most people aren&apos;t disengaged because they don&apos;t care. They&apos;re disengaged because they&apos;re overwhelmed.
        </h1>

        <P>
          When everything feels like a crisis at once — housing, transit, climate, the cost of living — it&apos;s
          exhausting before you even start. And getting accurate information about your own community turns out to
          be surprisingly hard. Credible local reporting sits behind paywalls. Social media fills the gap with
          whatever the algorithm decides you should see. The result is a lot of confusion and a lot of misplaced
          certainty.
        </P>
        <P>
          Debrief.TO is a free, simple answer to one question: <strong style={{ color: c.title, fontWeight: 600 }}>what
          is actually happening where I live?</strong>
        </P>
        <P>
          It gathers headlines from local and independent newsrooms across Ontario and puts them on one page, in one
          place, in the order they were published. Nothing is hidden behind a login. Nothing is ranked by how much
          outrage it generated. You read the headline here and then you go read the story on the publisher&apos;s own
          site, where it belongs.
        </P>

        <Section heading="How stories are chosen">
          <P>
            This site exists because opaque algorithms decide too much of what people see. It would be hypocritical
            not to show you ours.
          </P>
          <Rule title="Where stories come from.">
            We publish from a hand-picked list of newsrooms — local papers, independent outlets, and investigative
            non-profits doing real reporting in Ontario communities. Choosing that list is the only genuinely
            editorial decision here, and it is made by a person, in public, further down this page.
          </Rule>
          <Rule title="What we filter out.">
            We remove syndicated wire copy that isn&apos;t about your community, sports and entertainment sections,
            weather posts, video clips, event promotions, and opinion columns. In every case we are filtering
            by <em>format</em>, not by subject. A story is never removed because of what it is about or what
            conclusion it reaches.
          </Rule>
          <Rule title="What we never do.">
            We don&apos;t rank stories by popularity. We don&apos;t track what you read. We don&apos;t promote a story
            because it&apos;s getting clicks or bury one because it isn&apos;t. There is no personalization, no
            engagement scoring, and no algorithm learning what keeps you here longer.
          </Rule>
          <Rule title="Where the line sits.">
            We are not in the business of deciding which news people are allowed to see — that would make this site
            the very thing it was built to work around. But tabloid churn and manufactured outrage aren&apos;t
            journalism, and they have no place here. Our aim is a page you can read in five minutes and come away
            better informed than when you started, rather than more agitated.
          </Rule>
          <Rule title="Labels, not judgments.">
            Where a story sits behind a paywall, we mark it <em>Subscription</em> so you know before you click. Where
            a piece is commentary rather than reporting, we mark it <em>Opinion</em>. Where several newsrooms
            covered the same story, we show it once and say who else was on it. We tell you what something is; what
            you do with it is yours to decide.
          </Rule>
        </Section>

        <Section heading="Your privacy">
          <P>
            Your town, your saved articles, and your settings live in your own browser. They are never sent to us,
            because there is no account and no profile to send them to. We can&apos;t see what you read, and
            we&apos;ve built it that way deliberately.
          </P>
        </Section>

        <Section heading="Where the news comes from">
          <P>
            Your local tab currently draws on {homeLabel ? <strong style={{ color: c.title, fontWeight: 600 }}>{homeLabel}</strong> : "your community"}. Alongside it:
          </P>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 20 }}>
            {groups.map((g) => (
              <div key={g.label}>
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: c.muted, margin: "0 0 8px" }}>
                  {g.label} <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>· {g.note}</span>
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 10px" }}>
                  {PUBLISHERS.filter((p) => p.place === g.label).map((p) => (
                    <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, textDecoration: "none", color: dm ? lightenForDark(p.color) : p.color, border: `1px solid ${getCatTint(p.color, dm ? 0.5 : 0.28)}`, background: getCatTint(p.color, dm ? 0.16 : 0.07), borderRadius: 18, padding: "6px 12px" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dm ? lightenForDark(p.color) : p.color, display: "inline-block" }} />
                      {p.name}
                      {p.paywall && <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px", opacity: 0.75 }}>Sub</span>}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <P>
            Every headline belongs to the newsroom that reported it, and every link goes to their site. Local
            journalism only survives if people read it at the source — if something here is worth your time, the best
            thing you can do is go read it there, and subscribe if you can.
          </P>
          <p style={{ fontSize: 14.5, lineHeight: 1.7, color: c.muted, margin: "0 0 15px" }}>
            <strong style={{ color: c.body, fontWeight: 600 }}>Publishers:</strong>{" "}
            if you&apos;d rather not appear here, email{" "}
            <a href="mailto:hello@debrief.to" style={{ color: c.accent }}>hello@debrief.to</a>{" "}
            and you&apos;ll be removed, no questions asked.
          </p>
        </Section>

        <Section heading="Who made this">
          <P>
            Debrief.TO was built by Raj, in Newmarket, as part of the BUILD program with Apathy is Boring. It started
            as a small attempt to solve one problem: access to credible local information shouldn&apos;t depend on how
            many subscriptions you can afford.
          </P>
          <p style={{ fontSize: 15.5, lineHeight: 1.75, margin: 0 }}>
            <a href="mailto:hello@debrief.to" style={{ color: c.accent, fontWeight: 600 }}>hello@debrief.to</a>
          </p>
        </Section>

      </main>
    </div>
  );
}
function BookmarksPage({ bookmarks, onBack, onRemove, darkMode, onToggleDark, onGo }) {
  const dm = darkMode;
  const grouped = groupByDate(bookmarks);
  return (
    <div style={{ fontFamily: "inherit", minHeight: "100vh", background: dm ? "#1A1A1A" : "#FAF8F5", color: dm ? "#E8E5E0" : "#2C2C2C" }}>
      <header style={{ background: dm ? "#1E1E1E" : "#FFF", borderBottom: `1px solid ${dm ? "#2A2A2A" : "#E8E5E0"}`, zIndex: 100 }}>
        <div style={{ padding: "20px clamp(16px, 5vw, 120px) 16px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <Wordmark dm={dm} size={22} tagline={false} onClick={onBack} />
          <NavCapsules dm={dm} page="bookmarks" savedCount={bookmarks.length} onToggleDark={onToggleDark} onGo={onGo} />
          <div style={{ flex: "0 1 480px", minWidth: "min(240px, 100%)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, order: 3 }}>
            <h2 style={{ fontFamily: "'Georgia', serif", fontSize: 22, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10, color: dm ? "#E8E5E0" : "#2C2C2C" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#E63956" stroke="#2B2D5B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              Saved Articles
            </h2>
            <span style={{ fontSize: 13, color: dm ? "#9A958E" : "#6B665F" }}>{bookmarks.length} saved</span>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px clamp(16px, 4vw, 24px) 64px" }}>
        {bookmarks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px", background: dm ? "#2A2A2A" : "#FFF", borderRadius: 12, border: `1px solid ${dm ? "#3A3A3A" : "#E8E5E0"}` }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={dm ? "#444" : "#D4D0CA"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            <p style={{ fontFamily: "'Georgia', serif", fontSize: 18, fontWeight: 600, marginBottom: 6 }}>No saved articles yet</p>
            <p style={{ fontSize: 14, color: dm ? "#9A958E" : "#6B665F" }}>Click the bookmark icon on any article to save it for later. Saved articles stay in this browser until you remove them.</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label} style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: dm ? "#9A958E" : "#6B665F", marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${dm ? "#333" : "#E8E5E0"}` }}>{group.label}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {group.articles.map((article, i) => (
                  <div key={i} style={{ background: dm ? "#2A2A2A" : "#FFF", border: `1px solid ${dm ? "#3A3A3A" : "#E8E5E0"}`, borderRadius: 10, overflow: "hidden", display: "flex" }}>
                    <div style={{ width: 4, background: article.sourceColor, flexShrink: 0 }} />
                    <div style={{ padding: "14px 18px", flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: article.sourceColor, display: "inline-block" }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: article.sourceColor, textTransform: "uppercase", letterSpacing: "0.3px" }}>{article.source}</span>
                        <span style={{ fontSize: 11, color: dm ? "#9A958E" : "#6B665F" }}>{"\u00B7"} {timeAgo(article.pubDate)}</span>
                      </div>
                      <a href={article.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                        <h4 style={{ fontFamily: "'Georgia', serif", fontSize: 16, fontWeight: 600, color: dm ? "#F0EDE8" : "#1A1A1A", margin: "0 0 6px", lineHeight: 1.35 }}>{article.title}</h4>
                      </a>
                      <p style={{ fontSize: 13, color: dm ? "#9A958E" : "#6B665F", lineHeight: 1.5, margin: 0 }}>{article.description}</p>
                    </div>
                    <button onClick={() => onRemove(article)} style={{ background: "none", border: "none", cursor: "pointer", padding: "14px 14px 14px 8px", color: "#E63956", alignSelf: "flex-start", flexShrink: 0 }} title="Remove bookmark">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#E63956" stroke="#2B2D5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}

/* ---- Main App ---- */
export default function Home() {
  // --- Persisted state: preferences and saved articles live in localStorage (this browser only) ---
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(21);
  const loaderRef = useRef(null);
  const [activeCategories, setActiveCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSources, setShowSources] = useState(false);
  const [timeFilter, setTimeFilter] = useState("This Month");
  const [darkMode, setDarkMode] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [page, setPage] = useState("feed");
  const [hydrated, setHydrated] = useState(false);
  // The reader's town. Newmarket until they say otherwise — it's the town the
  // site was built for.
  const [townSlug, setTownSlug] = useState(DEFAULT_TOWN);
  const [showPicker, setShowPicker] = useState(false);
  const [archiveInfo, setArchiveInfo] = useState({ enabled: false, days: 0 });
  // What the server says the local tab is called. Usually the same as what we
  // work out here, but it differs when a town's own publisher didn't answer and
  // the server fell back to the region — so the server's answer wins.
  const [serverTown, setServerTown] = useState(null);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem("cp_categories")); if (v) setActiveCategories(v); } catch {}
    try { const v = JSON.parse(localStorage.getItem("cp_showSources")); if (v) setShowSources(v); } catch {}
    try { const v = localStorage.getItem("cp_timeFilter"); if (v) setTimeFilter(v); } catch {}
    try { const v = JSON.parse(localStorage.getItem("cp_darkMode")); if (v) setDarkMode(v); } catch {}
    try { const v = JSON.parse(localStorage.getItem("cp_bookmarks")); if (v) setBookmarks(v); } catch {}
    // Ask for a town once, on the first visit. Skipping counts as answering.
    try {
      const saved = localStorage.getItem("cp_town");
      const asked = localStorage.getItem("cp_townAsked");
      if (saved) setTownSlug(saved);
      else if (!asked) setShowPicker(true);
    } catch {}
    setHydrated(true);
  }, []);

  // Save preferences to localStorage when they change (only after hydration)
  useEffect(() => { if (hydrated) localStorage.setItem("cp_categories", JSON.stringify(activeCategories)); }, [activeCategories, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("cp_showSources", JSON.stringify(showSources)); }, [showSources, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("cp_timeFilter", timeFilter); }, [timeFilter, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("cp_darkMode", JSON.stringify(darkMode)); }, [darkMode, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("cp_bookmarks", JSON.stringify(bookmarks)); }, [bookmarks, hydrated]);

  // Saved articles now stay until the reader removes them. Older versions of the
  // site kept a tab counter (and deleted saved articles when it hit zero) —
  // remove that leftover so it can't do anything.
  useEffect(() => {
    try { localStorage.removeItem("cp_tabCount"); } catch {}
  }, []);

  // What the local tab is called, and whether it's falling back to a region.
  const localGuess = resolveTown(townSlug);
  const home = serverTown && serverTown.slug === townSlug ? serverTown : localGuess;
  const CATEGORIES = buildCategories(home.label);

  const chooseTown = (slug) => {
    try { localStorage.setItem("cp_town", slug); localStorage.setItem("cp_townAsked", "1"); } catch {}
    // A place filter naming the old town means nothing now, so let it go.
    setActiveCategories((prev) => prev.filter((l) => l !== home.label));
    setTownSlug(slug);
    setShowPicker(false);
  };
  const skipTown = () => {
    try { localStorage.setItem("cp_townAsked", "1"); } catch {}
    setShowPicker(false);
  };

  // Load articles from live RSS feeds via /api/feed
  const [feedError, setFeedError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [reloadKey, setReloadKey] = useState(0); // bump this to load the feed again
  const lastLoadedRef = useRef(0);
  const hasArticlesRef = useRef(false);
  const range = RANGE_FOR[timeFilter] || "today";
  useEffect(() => {
    if (!hydrated) return;      // wait until we know which town to ask for
    let cancelled = false;
    // Only show the grey placeholder cards if there's nothing on screen yet
    if (!hasArticlesRef.current) setLoading(true);
    setFeedError(null);
    (async () => {
      try {
        // "no-cache" = the browser must check with the server instead of reusing an old copy
        const res = await fetch(`/api/feed?town=${encodeURIComponent(townSlug)}&range=${range}`, { cache: "no-cache" });
        let data = null;
        try { data = await res.json(); } catch {}
        if (!res.ok) {
          throw new Error(
            res.status === 503
              ? "None of our news sources answered just now."
              : `The server had a problem (error ${res.status}).`
          );
        }
        if (!data) throw new Error("The server sent back something we couldn't read.");
        if (cancelled) return;
        const sorted = (data.articles || []).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        setArticles(sorted);
        setFetchedAt(data.fetchedAt || null);
        setArchiveInfo(data.archive || { enabled: false, days: 0 });
        setServerTown(data.town || null);
        hasArticlesRef.current = sorted.length > 0;
        lastLoadedRef.current = Date.now();
        if (data.errors?.length) {
          console.warn("[debrief.to] some sources failed:", data.errors);
        }
      } catch (err) {
        if (!cancelled) {
          setFeedError(
            err instanceof TypeError
              ? "We couldn't reach the server. Check your internet connection."
              : err.message || "Something went wrong."
          );
        }
        console.error("[debrief.to] feed load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey, townSlug, range, hydrated]);

  // If someone comes back to a tab that has been open for 30+ minutes
  // (common on phones), quietly load the latest articles.
  useEffect(() => {
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        lastLoadedRef.current &&
        Date.now() - lastLoadedRef.current > 30 * 60 * 1000
      ) {
        setReloadKey((k) => k + 1);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const toggleCategory = (catLabel) => {
    setActiveCategories((prev) => {
      if (prev.includes(catLabel)) return prev.filter((c) => c !== catLabel);
      return [...prev, catLabel];
    });
  };

  const clearAllFilters = () => setActiveCategories([]);

  const toggleBookmark = (article) => {
    setBookmarks((prev) => {
      const exists = prev.find((b) => b.title === article.title);
      if (exists) return prev.filter((b) => b.title !== article.title);
      return [...prev, article];
    });
  };

  const isBookmarked = (article) => bookmarks.some((b) => b.title === article.title);

  /* Categories now live on the article, not on its publisher, so a newsroom
     that covers both housing and the environment lands in both tabs. Selecting
     several categories widens the net rather than narrowing it — and an article
     matching two of them still appears once, because this is a filter over a
     list that was deduplicated by link before it ever got here. */
  const activeCats = activeCategories.filter((l) => CATEGORIES.some((c) => c.label === l));
  const matchesCategory = (a) =>
    activeCats.length === 0 ||
    activeCats.some((label) => {
      const cat = CATEGORIES.find((c) => c.label === label);
      if (!cat) return false;
      return cat.kind === "place"
        ? (a.places || []).includes(label)
        : (a.topics || []).includes(label);
    });

  // Step 1: apply the category + search filters
  const matchesOtherFilters = articles.filter((a) => {
    const matchesSearch = !searchQuery || a.title.toLowerCase().includes(searchQuery.toLowerCase()) || (a.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory(a) && matchesSearch;
  });
  // Step 2: apply the time filter (Today / This Week / This Month)
  const timeFiltered = filterByTime(matchesOtherFilters, timeFilter);
  // Safety net: if the time filter leaves nothing but there ARE matching articles,
  // show the most recent ones instead of an empty page.
  const showingFallback = timeFiltered.length === 0 && matchesOtherFilters.length > 0;
  const filtered = showingFallback ? matchesOtherFilters : timeFiltered;

  const visibleArticles = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Reset visible count when filters change
  useEffect(() => { setVisibleCount(21); }, [activeCategories, timeFilter, searchQuery, townSlug]);

  // Infinite scroll: load 21 more when sentinel comes into view
  useEffect(() => {
    const node = loaderRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((prev) => prev + 21);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore]);

  // Full-page views. These early returns must come AFTER every hook above so
  // the hook order stays identical on every render (Rules of Hooks).
  if (page === "bookmarks") {
    return (
      <>
        <SiteIcons dark={darkMode} />
        <BookmarksPage bookmarks={bookmarks} onBack={() => setPage("feed")} onRemove={toggleBookmark} darkMode={darkMode} onToggleDark={() => setDarkMode(!darkMode)} onGo={setPage} />
      </>
    );
  }

  if (page === "about") {
    return (
      <>
        <SiteIcons dark={darkMode} />
        <AboutPage onBack={() => setPage("feed")} darkMode={darkMode} onToggleDark={() => setDarkMode(!darkMode)} onGo={setPage} savedCount={bookmarks.length} homeLabel={home.label} />
      </>
    );
  }

  const dm = darkMode;
  const t = {
    bg: dm ? "#1A1A1A" : "#FAF8F5",
    headerBg: dm ? "#1E1E1E" : "#FFF",
    border: dm ? "#333" : "#8A8580",
    cardBg: dm ? "#242424" : "#FFF",
    cardBorder: dm ? "#3A3A3A" : "#E8E5E0",
    text: dm ? "#E8E5E0" : "#2C2C2C",
    textSec: dm ? "#A09B94" : "#6B665F",
    textMuted: dm ? "#9A958E" : "#6B665F",
    inputBg: dm ? "#2A2A2A" : "#FFF",
    inputBorder: dm ? "#444" : "#8A8580",
    title: dm ? "#F0EDE8" : "#1A1A1A",
    desc: dm ? "#D0CCC6" : "#000000",
    skeleton: dm ? "#333" : "#EBE8E3",
  };

  // A quiet, honest line about why a week or month view might look thin.
  const archiveNote = (() => {
    if (range === "today" || loading) return null;
    const wanted = range === "week" ? 7 : 31;
    if (!archiveInfo.enabled) {
      return "This is everything currently in the publishers' feeds. Older stories will appear here as the archive fills up.";
    }
    if (archiveInfo.days < wanted - 1) {
      return `The archive currently holds ${archiveInfo.days} day${archiveInfo.days === 1 ? "" : "s"} of older stories, and grows each day.`;
    }
    return null;
  })();

  return (
    <div style={{ fontFamily: "inherit", minHeight: "100vh", background: t.bg, color: t.text }}>
      <SiteIcons dark={darkMode} />
      {showPicker && <TownPicker dm={dm} onPick={chooseTown} onSkip={skipTown} />}
      {/* ===== HEADER ===== */}
      <header style={{ background: t.headerBg, borderBottom: `1px solid ${dm ? "#2A2A2A" : "#E8E5E0"}`, zIndex: 100 }}>
        <div style={{ padding: "20px clamp(16px, 5vw, 120px) 16px" }}>

          {/* Top row: wordmark - capsules - search. The capsules sit in the middle
              with even space on both sides, and in the same spot on every page. */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
            <Wordmark dm={dm} />
            <NavCapsules dm={dm} page="feed" savedCount={bookmarks.length} onToggleDark={() => setDarkMode(!dm)} onGo={setPage} />
            <div style={{ flex: "0 1 480px", minWidth: "min(240px, 100%)", display: "flex", justifyContent: "flex-end", order: 3 }}>
              <div style={{ position: "relative", width: "100%", maxWidth: 480 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  style={{ border: `1px solid ${t.inputBorder}`, borderRadius: 24, padding: "12px 18px 12px 44px", fontSize: 14, background: t.inputBg, color: t.text, width: "100%", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  placeholder="Search articles..."
                  aria-label="Search articles"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Second row: Sources + Time + Active filters */}
          <div className="filter-row" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setShowSources(!showSources)} aria-expanded={showSources} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "11px clamp(11px, 2.8vw, 16px)", borderRadius: 24, fontSize: "clamp(13px, 3.4vw, 15px)", fontWeight: 600, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s ease", whiteSpace: "nowrap",
              // Same look as the time capsules: solid green when on, outlined when off
              background: showSources ? "#2D6A4F" : "transparent",
              color: showSources ? "#FFF" : (dm ? "#7FD3A8" : "#2D6A4F"),
              border: `1.5px solid ${showSources ? "#2D6A4F" : (dm ? "#3E6B57" : t.inputBorder)}` }}>
              Sources
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.2s ease", transform: showSources ? "rotate(180deg)" : "rotate(0deg)" }}><polyline points="6 9 12 15 18 9" /></svg>
            </button>

            <div className="filter-divider" style={{ width: 1, height: 22, background: dm ? t.desc : t.border, margin: "0 4px" }} />

            {TIME_OPTIONS.map((opt) => {
              const isActive = timeFilter === opt;
              return (
                <button key={opt} onClick={() => setTimeFilter(opt)} style={{ padding: "11px clamp(9px, 2.6vw, 16px)", borderRadius: 24, fontSize: "clamp(13px, 3.4vw, 15px)", fontWeight: isActive ? 600 : 400, fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s ease", whiteSpace: "nowrap", background: isActive ? "#2D6A4F" : "transparent", color: isActive ? "#FFF" : (dm ? t.desc : t.textSec), border: isActive ? "1.5px solid #2D6A4F" : "1.5px solid transparent" }}>
                  {opt.startsWith("This ") ? (<><span className="time-prefix">This </span>{opt.slice(5)}</>) : opt}
                </button>
              );
            })}

            {/* Active category pills with x */}
            {activeCats.length > 0 && (
              <>
                <div style={{ width: 1, height: 22, background: t.border, margin: "0 4px" }} />
                {activeCats.map((catLabel) => {
                  const cat = CATEGORIES.find((c) => c.label === catLabel);
                  const color = cat?.color || "#2D6A4F";
                  return (
                    <span key={catLabel} style={{ fontSize: 14, fontWeight: 600, padding: "6px 10px 6px 14px", borderRadius: 16, display: "inline-flex", alignItems: "center", gap: 5, ...(dm ? { color: "#FFF", background: color } : { color, background: getCatTint(color, 0.12) }) }}>
                      <span style={{ fontSize: 15 }}>{cat?.icon}</span>
                      {catLabel}
                      <button onClick={() => toggleCategory(catLabel)} aria-label={`Remove the ${catLabel} filter`} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: dm ? "rgba(255,255,255,0.7)" : color, padding: "0 2px", lineHeight: 1, display: "flex", alignItems: "center", opacity: 0.7 }}>{"×"}</button>
                    </span>
                  );
                })}
                {/* Clear all pill - only shows when 2+ categories selected */}
                {activeCats.length > 1 && (
                  <button onClick={clearAllFilters} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 20, fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s ease", background: "transparent", border: `1.5px solid ${dm ? "#555" : "#D4D0CA"}`, color: t.textSec }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = dm ? "#333" : "#F0EDE8"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Clear all
                  </button>
                )}
              </>
            )}
          </div>

          {/* Sources panel. Place on the left, subject on the right.
              The publisher names that used to sit under each chip are gone —
              they were clutter, and now that categories belong to articles
              rather than publications they were misleading too. The full list
              of newsrooms lives on the About page. */}
          {showSources && (
            <div style={{ padding: "20px 0 8px", marginTop: 12, borderTop: `1px solid ${dm ? t.desc : t.border}`, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 10 }}>
              {CATEGORIES.map((cat, catIdx) => {
                const isActive = activeCats.includes(cat.label);
                const prevCat = CATEGORIES[catIdx - 1];
                const showDivider = prevCat && prevCat.group !== cat.group;
                return (
                  <React.Fragment key={cat.label}>
                    {showDivider && <div className="cat-divider" style={{ width: 1.5, height: 26, background: dm ? t.desc : t.border, margin: "0 8px", borderRadius: 1 }} />}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <button onClick={() => toggleCategory(cat.label)} aria-pressed={isActive} style={{ padding: "11px 18px", borderRadius: 20, fontSize: 15, fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s ease", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, lineHeight: 1, fontWeight: isActive ? 600 : 500,
                        background: isActive ? (dm ? cat.color : getCatTint(cat.color, 0.12)) : "transparent",
                        color: isActive ? (dm ? "#FFF" : cat.color) : (dm ? "#D0CCC6" : t.textSec),
                        border: `1.5px solid ${isActive ? (dm ? cat.color : getCatTint(cat.color, 0.3)) : (dm ? "#3C3C3C" : t.border)}` }}>
                        <span style={{ fontSize: 16, lineHeight: 1, display: "inline-flex", alignItems: "center" }}>{cat.icon}</span>
                        <span>{cat.label}</span>
                        {isActive && <span style={{ fontSize: 13, opacity: 0.6, marginLeft: 2 }}>{"×"}</span>}
                      </button>
                      {/* The local tab is the only one that can be changed — this is
                          where a reader swaps Newmarket for their own town. */}
                      {cat.home && (
                        <button onClick={() => setShowPicker(true)} title="Change your town"
                          aria-label={`Change your town, currently ${home.label}`}
                          /* Amber, so it reads as an action rather than as one more
                             category to filter by. It borrows the same warm palette
                             as the Subscription pill, so it is obviously not green
                             and still obviously part of this site. */
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 600,
                            background: dm ? "#3A2E1C" : "#F6ECD9",
                            border: `1.5px solid ${dm ? "#7A5F2E" : "#E0B978"}`,
                            color: dm ? "#E8C98A" : "#8A5A12",
                            borderRadius: 20, padding: "11px 13px", fontSize: 13, fontFamily: "inherit", cursor: "pointer", lineHeight: 1, transition: "all 0.15s ease" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = dm ? "#4A3A22" : "#F0E0C2"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = dm ? "#3A2E1C" : "#F6ECD9"; }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                          <span className="change-town-label">Change</span>
                        </button>
                      )}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "28px clamp(16px, 4vw, 24px) 64px" }}>
        <div style={{ marginBottom: 20, fontSize: 13, color: t.textSec, fontWeight: 400, letterSpacing: "0.2px", textTransform: "none" }}>
          Showing {visibleArticles.length}{hasMore ? ` of ${filtered.length}` : ""} article{filtered.length !== 1 ? "s" : ""} {"·"} {showingFallback ? "most recent" : timeFilter.toLowerCase()}
          {activeCats.length > 0 && ` · ${activeCats.join(", ")}`}
          {fetchedAt && !loading && ` · Updated ${timeAgo(fetchedAt)}`}
        </div>

        {loading ? (
          <div style={gridStyle}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "20px" }}>
                  <div style={{ background: t.skeleton, borderRadius: 8, height: 14, width: "40%", marginBottom: 12 }} />
                  <div style={{ background: t.skeleton, borderRadius: 8, height: 22, width: "95%", marginBottom: 8 }} />
                  <div style={{ background: t.skeleton, borderRadius: 8, height: 22, width: "70%", marginBottom: 16 }} />
                  <div style={{ background: t.skeleton, borderRadius: 8, height: 14, width: "100%", marginBottom: 6 }} />
                  <div style={{ background: t.skeleton, borderRadius: 8, height: 14, width: "80%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : feedError && articles.length === 0 ? (
          <div role="alert" style={{ textAlign: "center", padding: "64px 24px", background: t.cardBg, borderRadius: 10, border: `1px solid ${t.cardBorder}`, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <p style={{ fontSize: 18, fontFamily: "'Georgia', serif", fontWeight: 600, color: t.text }}>Couldn&apos;t load the news right now</p>
            <p style={{ fontSize: 14, color: t.textSec, marginTop: 6, maxWidth: 420, lineHeight: 1.5 }}>{feedError}</p>
            <button onClick={() => setReloadKey((k) => k + 1)} style={{ marginTop: 18, padding: "9px 18px", borderRadius: 8, fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", background: "#2D6A4F", color: "#FFF", border: "1.5px solid #2D6A4F" }}>
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 24px", background: t.cardBg, borderRadius: 10, border: `1px solid ${t.cardBorder}`, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <p style={{ fontSize: 18, fontFamily: "'Georgia', serif", fontWeight: 600, color: t.text }}>No articles found</p>
            <p style={{ fontSize: 14, color: t.textSec, marginTop: 6, maxWidth: 440, lineHeight: 1.6 }}>
              {activeCats.length > 0
                ? "Nothing matches these filters yet. Topic tabs fill up more slowly than place tabs, because a story only earns a topic when the publisher's own section or headline makes it clear."
                : "Try a different search term."}
            </p>
          </div>
        ) : (
          <>
          {showingFallback && (
            <div role="status" style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 10, fontSize: 14, lineHeight: 1.5, background: dm ? "#23302A" : "#EEF5F1", border: `1px solid ${dm ? "#35503F" : "#CDE3D7"}`, color: t.text }}>
              Nothing new {timeFilter === "Today" ? "in the last 24 hours" : timeFilter === "This Week" ? "in the last 7 days" : "in the last 31 days"}
              {searchQuery ? " for this search" : ""}. Here are the most recent articles instead.
            </div>
          )}
          {archiveNote && !showingFallback && (
            <div role="status" style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 10, fontSize: 13.5, lineHeight: 1.55, background: dm ? "#262626" : "#F4F1EC", border: `1px solid ${dm ? "#383838" : "#E4E0DA"}`, color: t.textSec }}>
              {archiveNote}
            </div>
          )}
          <div style={gridStyle}>
            {visibleArticles.map((article, i) => (
              <div key={article.link + i} style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", transition: "transform 0.25s ease, box-shadow 0.25s ease", cursor: "default", position: "relative", boxShadow: dm ? "0 2px 8px rgba(0,0,0,0.2)" : "0 1px 4px rgba(0,0,0,0.04)" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = dm ? "0 12px 32px rgba(0,0,0,0.35)" : "0 12px 32px rgba(0,0,0,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = dm ? "0 2px 8px rgba(0,0,0,0.2)" : "0 1px 4px rgba(0,0,0,0.04)"; }}
              >
                {/* Translucent background image */}
                {article.image && (
                  <img
                    src={article.image}
                    alt=""
                    loading="lazy"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: dm ? 0.14 : 0.18,
                      pointerEvents: "none",
                      zIndex: 0,
                    }}
                  />
                )}
                <div style={{ height: 3, borderRadius: "3px 3px 0 0", width: "100%", background: article.sourceColor, position: "relative", zIndex: 1 }} />
                <div style={{ padding: "20px 24px 22px", flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", marginBottom: 10, flex: 1 }}>
                      <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: dm ? lightenForDark(article.sourceColor) : article.sourceColor, marginRight: 7 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: dm ? lightenForDark(article.sourceColor) : article.sourceColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>{article.source}</span>
                      {(article.topics || []).slice(0, 1).map((tp) => (
                        <React.Fragment key={tp}>
                          <span style={{ margin: "0 6px", color: t.textMuted, fontSize: 10 }}>{"·"}</span>
                          <span style={{ fontSize: 11, color: t.textMuted, fontWeight: 400 }}>{tp}</span>
                        </React.Fragment>
                      ))}
                      {article.opinion && (
                        <span title="Commentary, not straight reporting" style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, letterSpacing: "0.3px", textTransform: "uppercase", padding: "2px 7px", borderRadius: 10, color: dm ? "#A9B7D0" : "#44506B", background: dm ? "#252B36" : "#EDF0F6", border: `1px solid ${dm ? "#3A4454" : "#D6DDE9"}` }}>
                          Opinion
                        </span>
                      )}
                      {article.paywall && (
                        <span title="This article needs a subscription" style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, letterSpacing: "0.3px", textTransform: "uppercase", padding: "2px 7px", borderRadius: 10, color: dm ? "#E0B978" : "#8A5A12", background: dm ? "#3A2E1C" : "#F6ECD9", border: `1px solid ${dm ? "#5A4526" : "#E8D5B0"}` }}>
                          Subscription
                        </span>
                      )}
                    </div>
                    <button onClick={() => toggleBookmark(article)} aria-label={isBookmarked(article) ? `Remove "${article.title}" from saved` : `Save "${article.title}" to read later`}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "12px", margin: "-8px -10px -8px 0", flexShrink: 0, transition: "color 0.15s ease", display: "flex", alignItems: "center", color: isBookmarked(article) ? "#E63956" : t.textMuted }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={isBookmarked(article) ? "#E63956" : "none"} stroke={isBookmarked(article) ? "#2B2D5B" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    </button>
                  </div>
                  <a href={article.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit", flex: 1, display: "flex", flexDirection: "column" }}>
                    <h3 style={{ fontFamily: "'Georgia', serif", fontSize: 17, fontWeight: 600, lineHeight: 1.4, marginBottom: 8, color: t.title, letterSpacing: "-0.3px" }}>{article.title}</h3>
                    <p style={{ fontSize: 14, lineHeight: 1.65, color: t.desc, flex: 1, marginBottom: 14 }}>{article.description}</p>
                    {/* When several newsrooms covered the same story, that is
                        itself worth knowing — so the story appears once, and
                        says who else was on it. */}
                    {article.alsoCoveredBy?.length > 0 && (
                      <p style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.5, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        Also covered by {article.alsoCoveredBy.join(", ")}
                      </p>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${dm ? "#333" : "#F0EDE8"}`, paddingTop: 14, marginTop: "auto" }}>
                      <span style={{ fontSize: 12, color: t.textMuted }}>{timeAgo(article.pubDate)}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: dm ? "#7FD3A8" : "#2D6A4F", display: "flex", alignItems: "center", gap: 4, letterSpacing: "0.2px" }}>
                        Read<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                      </span>
                    </div>
                  </a>
                </div>
              </div>
            ))}
          </div>
          </>
        )}

        {/* Infinite scroll sentinel + loading indicator */}
        {!loading && hasMore && (
          <div ref={loaderRef} style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
            <span style={{ fontSize: 13, color: t.textMuted }}>Loading more articles...</span>
          </div>
        )}
        {!loading && !hasMore && filtered.length > 21 && (
          <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
            <span style={{ fontSize: 13, color: t.textMuted }}>You&apos;re all caught up ✓</span>
          </div>
        )}
      </main>

      {/* ===== FOOTER ===== */}
      <footer style={{ borderTop: `1px solid ${dm ? "#2A2A2A" : "#E8E5E0"}`, padding: "36px 24px", textAlign: "center", background: t.headerBg }}>
        <p style={{ fontSize: 12, color: t.textMuted, maxWidth: 560, margin: "0 auto 12px", lineHeight: 1.7, letterSpacing: "0.1px" }}>
          Debrief.TO gathers headlines from independent and local newsrooms and links straight back to them.
          All content belongs to the newsroom that reported it — click through to read it there, and subscribe if you can.
        </p>
        <button onClick={() => setPage("about")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: dm ? "#7FD3A8" : "#2D6A4F" }}>
          Who we publish, and how stories are chosen
        </button>
      </footer>
    </div>
  );
}

const gridStyle = {
  display: "grid",
  // min() keeps a single card from being wider than a phone screen
  gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))",
  gap: 24,
};
