"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";

const RSS_SOURCES = [
  // Newmarket / York Region
  { name: "Newmarket Today", color: "#1A73E8", tag: "Local News", category: "Newmarket" },
  { name: "thelocal.to", color: "#3A9B7A", tag: "Local News", category: "Newmarket" },
  // Toronto
  { name: "CBC Toronto", color: "#E03C31", tag: "Toronto", category: "Toronto" },
  { name: "Toronto Star", color: "#003DA5", tag: "Toronto", category: "Toronto", paywall: true },
  { name: "Toronto Sun", color: "#DA1A32", tag: "Toronto", category: "Toronto" },
  { name: "Spacing Toronto", color: "#0F2E4A", tag: "Urban Issues", category: "Toronto" },
  // Ontario
  { name: "The Trillium", color: "#7B2D8E", tag: "Ontario Politics", category: "Ontario", paywall: true },
  { name: "The Narwhal", color: "#2D6A4F", tag: "Environment & Policy", category: "Ontario" },
  // Independent newsrooms
  { name: "The Breach", color: "#1565C0", tag: "Investigative", category: "Independent" },
  { name: "Canadaland", color: "#C62828", tag: "Investigative", category: "Independent" },
  { name: "The Walrus", color: "#D4872C", tag: "Current Affairs", category: "Independent" },
];

const SOURCE_CATEGORIES = [
  { label: "Newmarket", icon: "\u{1F4CD}", sources: ["Newmarket Today", "thelocal.to"], group: "place" },
  { label: "Toronto", icon: "\u{1F3D9}", sources: ["CBC Toronto", "Toronto Star", "Toronto Sun", "Spacing Toronto"], group: "place" },
  { label: "Ontario", icon: "\u{1F341}", sources: ["The Trillium", "The Narwhal"], group: "place" },
  { label: "Independent", icon: "\u{1F50D}", sources: ["The Breach", "Canadaland", "The Walrus", "The Narwhal", "Spacing Toronto", "thelocal.to"], group: "kind" },
];

const TIME_OPTIONS = ["Today", "This Week", "This Month"];

// Helper: get a visible tint for category pill backgrounds
// Dark source colours like #0F2E4A need stronger opacity to show up
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
  // because it's early in a new day/week/month. "Today" = last 24h, etc.
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const cutoff =
    timeFilter === "Today" ? now - DAY :
    timeFilter === "This Week" ? now - 7 * DAY :
    now - 30 * DAY;
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

/* ---- About Page ---- */

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
      {tagline && <p style={{ fontSize: 12, color: dm ? "#C8C4BE" : "#000", marginTop: 4, fontWeight: 400 }}>Toronto&apos;s local news, in one place</p>}
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

function AboutPage({ onBack, darkMode, onToggleDark, onGo, savedCount }) {
  const dm = darkMode;
  const c = {
    bg: dm ? "#1A1A1A" : "#FAF8F5",
    headerBg: dm ? "#222" : "#FFF",
    cardBg: dm ? "#2A2A2A" : "#FFF",
    border: dm ? "#333" : "#E8E5E0",
    cardBorder: dm ? "#3A3A3A" : "#E8E5E0",
    text: dm ? "#E8E5E0" : "#2C2C2C",
    title: dm ? "#F0EDE8" : "#1A1A1A",
    body: dm ? "#C8C4BE" : "#3C3A37",
    muted: dm ? "#8A857E" : "#8A857E",
    accent: "#2D6A4F",
  };
  const Section = ({ heading, children }) => (
    <section style={{ marginBottom: 34 }}>
      {heading && (
        <h3 style={{ fontFamily: "'Georgia', serif", fontSize: 20, fontWeight: 700, color: c.title, margin: "0 0 12px" }}>{heading}</h3>
      )}
      {children}
    </section>
  );
  const P = ({ children }) => (
    <p style={{ fontSize: 15.5, lineHeight: 1.7, color: c.body, margin: "0 0 14px" }}>{children}</p>
  );
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

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "44px clamp(16px, 4vw, 24px) 80px" }}>
        {/* Hero */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(26px, 6vw, 34px)", fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.5px", margin: "0 0 12px", color: c.title }}>
            Local news you can actually get to.
          </h1>
          <p style={{ fontSize: "clamp(16px, 4vw, 18px)", lineHeight: 1.6, color: c.body, margin: 0 }}>
            Debrief.TO collects headlines from newsrooms covering Newmarket, Toronto and Ontario, and links you
            straight to the people who reported them.
          </p>
          <p style={{ fontSize: 14, color: c.muted, margin: "16px 0 0" }}>
            Built and run by Raj Bawa in Newmarket, Ontario.
          </p>
        </div>

        <Section heading="Why I built it">
          <P>
            I don&rsquo;t think most people my age are apathetic about their city. I think they&rsquo;re
            overwhelmed. Between the cost of living, two jobs and everything else, nobody has time to check a
            dozen news sites to find out that their bus route is changing or that council is voting on housing
            on Tuesday.
          </P>
          <P>
            Then there&rsquo;s the access problem. A lot of good reporting sits behind subscriptions, so social
            media becomes the default news source, and what you understand about your own city depends on what
            an algorithm decided to show you.
          </P>
          <P>
            Debrief.TO is my small attempt at the first step: put credible local reporting in one place, for
            free, and make it easy to find. It grew out of my application to BUILD, a civic engagement program
            run by Apathy is Boring, and I keep working on it because I think knowing what&rsquo;s happening
            near you is where getting involved starts.
          </P>
        </Section>

        <Section heading="How it works">
          <P>
            Every newsroom here publishes a public feed of its own headlines. Debrief.TO reads those feeds, sorts
            everything newest first, and shows you the headline, the first couple of lines, and where it came
            from. It refreshes itself throughout the day.
          </P>
          <P>
            Full articles are never copied. Every headline links to the publisher&rsquo;s own page, and reading
            it there is what supports the reporting. If you can subscribe to a local newsroom, please do.
          </P>
        </Section>

        <Section heading="What it doesn&rsquo;t do">
          <P>
            No accounts, no ads and no tracking of what you read. Saved articles and your dark-mode choice are
            stored by your own browser, on your own device, and never sent anywhere. Clear your browser data and
            they&rsquo;re gone.
          </P>
          <P>
            Some outlets are marked <strong>Subscription</strong>, which means most of their articles need a paid
            account. That label is there so a link never wastes your time.
          </P>
        </Section>

        <Section heading="Where the stories come from">
          <div style={{ display: "grid", gap: 10 }}>
            {SOURCE_CATEGORIES.map((cat) => (
              <div key={cat.label} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: c.title, minWidth: 104 }}>{cat.icon} {cat.label}</span>
                {cat.sources.map((name) => {
                  const src = RSS_SOURCES.find((r) => r.name === name);
                  return (
                    <span key={name} style={{ fontSize: 14, color: c.body, display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: src?.color, display: "inline-block" }} />
                      {name}
                      {src?.paywall && <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px", color: dm ? "#E0B978" : "#8A5A12" }}>subscription</span>}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: c.muted, margin: "18px 0 0" }}>
            Newsrooms: if you&rsquo;d rather not appear here, email me and I&rsquo;ll take your feed out the same
            day. If your feed is broken or missing, tell me that too.
          </p>
        </Section>

        <Section heading="Get in touch">
          <P>
            Suggestions for sources to add, corrections, or anything that looks broken:{" "}
            <a href="mailto:hello@debrief.to" style={{ color: c.accent, fontWeight: 600 }}>hello@debrief.to</a>.
          </P>
        </Section>

        <p style={{ fontSize: 13, lineHeight: 1.7, color: c.muted, borderTop: `1px solid ${c.border}`, paddingTop: 20, margin: 0 }}>
          Debrief.TO is an independent, non-commercial project. It isn&rsquo;t affiliated with any of the
          newsrooms listed above, and headlines and summaries belong to them.
        </p>
      </main>
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

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem("cp_categories")); if (v) setActiveCategories(v); } catch {}
    try { const v = JSON.parse(localStorage.getItem("cp_showSources")); if (v) setShowSources(v); } catch {}
    try { const v = localStorage.getItem("cp_timeFilter"); if (v) setTimeFilter(v); } catch {}
    try { const v = JSON.parse(localStorage.getItem("cp_darkMode")); if (v) setDarkMode(v); } catch {}
    try { const v = JSON.parse(localStorage.getItem("cp_bookmarks")); if (v) setBookmarks(v); } catch {}
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

  // Load articles from live RSS feeds via /api/feed
  const [feedError, setFeedError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [reloadKey, setReloadKey] = useState(0); // bump this to load the feed again
  const lastLoadedRef = useRef(0);
  const hasArticlesRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    // Only show the grey placeholder cards if there's nothing on screen yet
    if (!hasArticlesRef.current) setLoading(true);
    setFeedError(null);
    (async () => {
      try {
        // "no-cache" = the browser must check with the server instead of reusing an old copy
        const res = await fetch("/api/feed", { cache: "no-cache" });
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
  }, [reloadKey]);

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

  // Get all source names from active categories
  const activeSources = activeCategories.length === 0
    ? []
    : SOURCE_CATEGORIES.filter((c) => activeCategories.includes(c.label)).flatMap((c) => c.sources);

  // Step 1: apply the source + search filters
  const matchesOtherFilters = articles.filter((a) => {
    const matchesSource = activeCategories.length === 0 || activeSources.includes(a.source);
    const matchesSearch = !searchQuery || a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSource && matchesSearch;
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
  useEffect(() => { setVisibleCount(21); }, [activeCategories, timeFilter, searchQuery]);

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
        <AboutPage onBack={() => setPage("feed")} darkMode={darkMode} onToggleDark={() => setDarkMode(!darkMode)} onGo={setPage} savedCount={bookmarks.length} />
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

  return (
    <div style={{ fontFamily: "inherit", minHeight: "100vh", background: t.bg, color: t.text }}>
      <SiteIcons dark={darkMode} />
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
            {activeCategories.length > 0 && (
              <>
                <div style={{ width: 1, height: 22, background: t.border, margin: "0 4px" }} />
                {activeCategories.map((catLabel) => {
                  const cat = SOURCE_CATEGORIES.find((c) => c.label === catLabel);
                  const srcObj = RSS_SOURCES.find((s) => cat?.sources.includes(s.name));
                  return (
                    <span key={catLabel} style={{ fontSize: 14, fontWeight: 600, padding: "6px 10px 6px 14px", borderRadius: 16, display: "inline-flex", alignItems: "center", gap: 5, ...(dm ? { color: "#FFF", background: srcObj?.color || "#2D6A4F", boxShadow: `0 0 10px ${getCatTint(srcObj?.color || "#2D6A4F", 0.35)}` } : { color: srcObj?.color || "#2D6A4F", background: getCatTint(srcObj?.color || "#2D6A4F", 0.12) }) }}>
                      <span style={{ fontSize: 15 }}>{cat?.icon}</span>
                      {catLabel}
                      <button onClick={() => toggleCategory(catLabel)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: dm ? "rgba(255,255,255,0.7)" : (srcObj?.color || "#2D6A4F"), padding: "0 2px", lineHeight: 1, display: "flex", alignItems: "center", opacity: 0.7 }}>{"\u00D7"}</button>
                    </span>
                  );
                })}
                {/* Clear all pill - only shows when 2+ categories selected */}
                {activeCategories.length > 1 && (
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

          {/* Sources panel - categorized, multi-select */}
          {showSources && (
            <div style={{ padding: "20px 0 8px", marginTop: 12, borderTop: `1px solid ${dm ? t.desc : t.border}`, display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "center", gap: 16 }}>
              {SOURCE_CATEGORIES.map((cat, catIdx) => {
                const isActive = activeCategories.includes(cat.label);
                const srcObj = RSS_SOURCES.find((s) => s.name === cat.sources[0]);
                const prevCat = SOURCE_CATEGORIES[catIdx - 1];
                const showDivider = prevCat && prevCat.group !== cat.group;
                return (
                  <React.Fragment key={cat.label}>
                    {showDivider && <div style={{ width: 1.5, background: dm ? t.desc : t.border, margin: "0 8px 2.3px", alignSelf: "stretch", borderRadius: 1 }} />}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <button onClick={() => toggleCategory(cat.label)} aria-pressed={isActive} style={{ padding: "11px 18px", borderRadius: 20, fontSize: 15, fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s ease", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, lineHeight: 1, fontWeight: isActive ? 600 : 500,
                      background: isActive ? (dm ? srcObj.color : getCatTint(srcObj.color, 0.12)) : "transparent",
                      color: isActive ? (dm ? "#FFF" : srcObj.color) : (dm ? "#D0CCC6" : t.textSec),
                      border: `1.5px solid ${isActive ? (dm ? srcObj.color : getCatTint(srcObj.color, 0.3)) : (dm ? "#3C3C3C" : t.border)}` }}>
                      <span style={{ fontSize: 16, lineHeight: 1, display: "inline-flex", alignItems: "center" }}>{cat.icon}</span>
                      <span>{cat.label}</span>
                      {isActive && <span style={{ fontSize: 13, opacity: 0.6, marginLeft: 2 }}>{"\u00D7"}</span>}
                    </button>
                    <div style={{ fontSize: 11, color: dm ? t.desc : t.textMuted, display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap", justifyContent: "center", maxWidth: 120 }}>
                      {cat.sources.map((sName, idx) => {
                        const s = RSS_SOURCES.find((r) => r.name === sName);
                        return (
                          <span key={sName} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <span style={{ width: 4, height: 4, borderRadius: "50%", background: s?.color, display: "inline-block" }} />
                            {sName}
                          </span>
                        );
                      })}
                    </div>
                  </div>
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
          Showing {visibleArticles.length}{hasMore ? ` of ${filtered.length}` : ""} article{filtered.length !== 1 ? "s" : ""} {"\u00B7"} {showingFallback ? "most recent" : timeFilter.toLowerCase()}
          {activeCategories.length > 0 && ` \u00B7 ${activeCategories.join(", ")}`}
          {fetchedAt && !loading && ` \u00B7 Updated ${timeAgo(fetchedAt)}`}
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
            <p style={{ fontSize: 18, fontFamily: "'Georgia', serif", fontWeight: 600, color: t.text }}>Couldn't load the news right now</p>
            <p style={{ fontSize: 14, color: t.textSec, marginTop: 6, maxWidth: 420, lineHeight: 1.5 }}>{feedError}</p>
            <button onClick={() => setReloadKey((k) => k + 1)} style={{ marginTop: 18, padding: "9px 18px", borderRadius: 8, fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", background: "#2D6A4F", color: "#FFF", border: "1.5px solid #2D6A4F" }}>
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 24px", background: t.cardBg, borderRadius: 10, border: `1px solid ${t.cardBorder}`, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <p style={{ fontSize: 18, fontFamily: "'Georgia', serif", fontWeight: 600, color: t.text }}>No articles found</p>
            <p style={{ fontSize: 14, color: t.textSec, marginTop: 6 }}>Try a different search term or source filter.</p>
          </div>
        ) : (
          <>
          {showingFallback && (
            <div role="status" style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 10, fontSize: 14, lineHeight: 1.5, background: dm ? "#23302A" : "#EEF5F1", border: `1px solid ${dm ? "#35503F" : "#CDE3D7"}`, color: t.text }}>
              Nothing new {timeFilter === "Today" ? "in the last 24 hours" : timeFilter === "This Week" ? "in the last 7 days" : "in the last 30 days"}
              {searchQuery ? " for this search" : ""}. Here are the most recent articles instead.
            </div>
          )}
          <div style={gridStyle}>
            {visibleArticles.map((article, i) => (
              <div key={article.title + i} style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", transition: "transform 0.25s ease, box-shadow 0.25s ease", cursor: "default", position: "relative", boxShadow: dm ? "0 2px 8px rgba(0,0,0,0.2)" : "0 1px 4px rgba(0,0,0,0.04)" }}
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
                      <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: article.sourceColor, marginRight: 7 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: article.sourceColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>{article.source}</span>
                      <span style={{ margin: "0 6px", color: t.textMuted, fontSize: 10 }}>{"\u00B7"}</span>
                      <span style={{ fontSize: 11, color: t.textMuted, fontWeight: 400 }}>{article.tag}</span>
                      {article.paywall && (
                        <span title="Most articles from this outlet need a subscription" style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, letterSpacing: "0.3px", textTransform: "uppercase", padding: "2px 7px", borderRadius: 10, color: dm ? "#E0B978" : "#8A5A12", background: dm ? "#3A2E1C" : "#F6ECD9", border: `1px solid ${dm ? "#5A4526" : "#E8D5B0"}` }}>
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${dm ? "#333" : "#F0EDE8"}`, paddingTop: 14, marginTop: "auto" }}>
                      <span style={{ fontSize: 12, color: t.textMuted }}>{timeAgo(article.pubDate)}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#2D6A4F", display: "flex", alignItems: "center", gap: 4, letterSpacing: "0.2px" }}>
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
            <span style={{ fontSize: 13, color: t.textMuted }}>You're all caught up ✓</span>
          </div>
        )}
      </main>

      {/* ===== FOOTER ===== */}
      <footer style={{ borderTop: `1px solid ${dm ? "#2A2A2A" : "#E8E5E0"}`, padding: "36px 24px", textAlign: "center", background: t.headerBg }}>
        <p style={{ fontSize: 12, color: t.textMuted, maxWidth: 540, margin: "0 auto 18px", lineHeight: 1.6, letterSpacing: "0.1px" }}>
          Debrief.TO aggregates headlines from {RSS_SOURCES.length} independent and major Toronto publishers.
          All content belongs to its original source. Click through to read and support local journalism.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          {RSS_SOURCES.map((s) => (
            <span key={s.name} style={{ fontSize: 10, color: t.textMuted, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: s.color, opacity: 0.8 }} />
              {s.name}
            </span>
          ))}
        </div>
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
