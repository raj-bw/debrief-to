"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";

const RSS_SOURCES = [
  // Environment
  { name: "The Narwhal", color: "#2D6A4F", tag: "Environment & Policy", category: "Environment" },
  // Politics
  { name: "The Trillium", color: "#7B2D8E", tag: "Ontario Politics", category: "Politics" },
  // Toronto
  { name: "Spacing Toronto", color: "#0F2E4A", tag: "Urban Issues", category: "Toronto" },
  // Current Affairs
  { name: "The Walrus", color: "#D4872C", tag: "Current Affairs", category: "Current Affairs" },
  // Investigative
  { name: "Canadaland", color: "#C62828", tag: "Investigative", category: "Investigative" },
  { name: "The Breach", color: "#1565C0", tag: "Investigative", category: "Investigative" },
  // Newmarket
  { name: "Newmarket Today", color: "#1A73E8", tag: "Local News", category: "Newmarket" },
  { name: "thelocal.to", color: "#3A9B7A", tag: "Local News", category: "Newmarket" },
  // Major Outlets
  { name: "CBC Toronto", color: "#E03C31", tag: "Major Outlet", category: "Major Outlets" },
  { name: "Toronto Star", color: "#003DA5", tag: "Major Outlet", category: "Major Outlets" },
  { name: "Globe & Mail", color: "#1C1C1C", tag: "Major Outlet", category: "Major Outlets" },
  { name: "Toronto Sun", color: "#DA1A32", tag: "Major Outlet", category: "Major Outlets" },
];

const SOURCE_CATEGORIES = [
  // Location-based
  { label: "Newmarket", icon: "\u{1F4CD}", sources: ["Newmarket Today", "thelocal.to"], group: "location" },
  { label: "Toronto", icon: "\u{1F3D9}", sources: ["CBC Toronto", "Toronto Star", "Toronto Sun", "Spacing Toronto"], group: "location" },
  { label: "Ontario", icon: "\u{1F341}", sources: ["The Trillium", "Globe & Mail", "The Walrus"], group: "location" },
  // Topic-based
  { label: "Environment", icon: "\u{1F33F}", sources: ["The Narwhal"], group: "topic" },
  { label: "Politics", icon: "\u{1F3DB}", sources: ["The Trillium"], group: "topic" },
  { label: "Investigative", icon: "\u{1F50D}", sources: ["The Narwhal", "The Trillium", "Canadaland", "The Breach"], group: "topic" },
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
function AboutPage({ onBack, darkMode }) {
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
      <header style={{ background: c.headerBg, borderBottom: `1px solid ${c.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onBack} style={{ background: "none", border: `1.5px solid ${dm ? "#444" : "#E0DCD7"}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontFamily: "inherit", cursor: "pointer", color: c.text, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Feed
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: "'Georgia', serif", fontSize: 22, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              About
            </h2>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "44px 24px 80px" }}>
        {/* Hero */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: "'Georgia', serif", fontSize: 34, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.5px", margin: "0 0 12px", color: c.title }}>
            All of Toronto&rsquo;s news, in one calm place.
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: c.body, margin: 0 }}>
            Debrief.TO gathers headlines from local, independent, and major publications across the GTA
            &mdash; so you can catch up on what matters without opening a dozen tabs.
          </p>
        </div>

        <Section heading="Why we built this">
          <P>
            Local news is more fragmented than ever. The stories that shape your neighbourhood &mdash;
            a new transit line, a council vote, an investigation into who really owns your street &mdash;
            are scattered across major outlets, scrappy independents, and newsletters you&rsquo;ve never heard of.
          </P>
          <P>
            Debrief.TO is the friend who reads all of it and gives you the highlights. Not a megaphone,
            not a firehose &mdash; a quick, reliable briefing you can scan in a few minutes.
          </P>
        </Section>

        <Section heading="How it works">
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              ["We aggregate, we don't rewrite.", "Every headline links straight back to the publisher who reported it. We never republish full articles or claim someone else's work."],
              ["Always fresh.", "The feed refreshes automatically throughout the day, pulling the latest from every source."],
              ["Filter to your Toronto.", "Sort by neighbourhood focus (Newmarket, Toronto, Ontario) or by beat (Environment, Politics, Investigative), and save stories to read later."],
            ].map(([h, body]) => (
              <li key={h} style={{ display: "flex", gap: 12, background: c.cardBg, border: `1px solid ${c.cardBorder}`, borderRadius: 12, padding: "16px 18px" }}>
                <span style={{ flexShrink: 0, width: 8, height: 8, borderRadius: "50%", background: c.accent, marginTop: 7 }} />
                <span>
                  <strong style={{ color: c.title, fontWeight: 700 }}>{h}</strong>{" "}
                  <span style={{ color: c.body }}>{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section heading={`Our ${RSS_SOURCES.length} sources`}>
          <P>
            We link to reporting from a mix of major outlets, independents, and investigative newsrooms:
          </P>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {RSS_SOURCES.map((s) => (
              <span key={s.name} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 500, color: c.text, background: c.cardBg, border: `1px solid ${c.cardBorder}`, borderRadius: 20, padding: "6px 13px" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        </Section>

        <Section heading="Support local journalism">
          <P>
            Debrief.TO exists to send readers <em>toward</em> the newsrooms doing the work &mdash; not away from them.
            If a story matters to you, click through, read it at the source, and consider subscribing.
            Independent local reporting only survives if people pay for it.
          </P>
        </Section>

        <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 24, marginTop: 8 }}>
          <p style={{ fontSize: 14, color: c.muted, lineHeight: 1.6, margin: 0 }}>
            Debrief.TO is an independent project and is not affiliated with any of the publications it links to.
            All articles remain the property of their original publishers. Questions or a source we&rsquo;re missing?{" "}
            <a href="mailto:hello@debrief.to" style={{ color: c.accent, fontWeight: 600, textDecoration: "none" }}>hello@debrief.to</a>
          </p>
        </div>
      </main>
    </div>
  );
}

/* ---- Bookmarks Page ---- */
function BookmarksPage({ bookmarks, onBack, onRemove, darkMode }) {
  const dm = darkMode;
  const grouped = groupByDate(bookmarks);
  return (
    <div style={{ fontFamily: "inherit", minHeight: "100vh", background: dm ? "#1A1A1A" : "#FAF8F5", color: dm ? "#E8E5E0" : "#2C2C2C" }}>
      <header style={{ background: dm ? "#222" : "#FFF", borderBottom: `1px solid ${dm ? "#333" : "#E8E5E0"}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onBack} style={{ background: "none", border: `1.5px solid ${dm ? "#444" : "#E0DCD7"}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontFamily: "inherit", cursor: "pointer", color: dm ? "#E8E5E0" : "#2C2C2C", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Feed
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: "'Georgia', serif", fontSize: 22, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#E63956" stroke="#2B2D5B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              Saved Articles
            </h2>
          </div>
          <span style={{ fontSize: 13, color: dm ? "#706B64" : "#A09B94" }}>{bookmarks.length} saved</span>
        </div>
      </header>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 64px" }}>
        {bookmarks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px", background: dm ? "#2A2A2A" : "#FFF", borderRadius: 12, border: `1px solid ${dm ? "#3A3A3A" : "#E8E5E0"}` }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={dm ? "#444" : "#D4D0CA"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            <p style={{ fontFamily: "'Georgia', serif", fontSize: 18, fontWeight: 600, marginBottom: 6 }}>No saved articles yet</p>
            <p style={{ fontSize: 14, color: dm ? "#706B64" : "#A09B94" }}>Click the bookmark icon on any article to save it for later.</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label} style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: dm ? "#706B64" : "#A09B94", marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${dm ? "#333" : "#E8E5E0"}` }}>{group.label}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {group.articles.map((article, i) => (
                  <div key={i} style={{ background: dm ? "#2A2A2A" : "#FFF", border: `1px solid ${dm ? "#3A3A3A" : "#E8E5E0"}`, borderRadius: 10, overflow: "hidden", display: "flex" }}>
                    <div style={{ width: 4, background: article.sourceColor, flexShrink: 0 }} />
                    <div style={{ padding: "14px 18px", flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: article.sourceColor, display: "inline-block" }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: article.sourceColor, textTransform: "uppercase", letterSpacing: "0.3px" }}>{article.source}</span>
                        <span style={{ fontSize: 11, color: dm ? "#706B64" : "#A09B94" }}>{"\u00B7"} {timeAgo(article.pubDate)}</span>
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
  // --- Persisted state: preferences in localStorage, bookmarks with tab tracking ---
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

  // Tab tracking: count open tabs, clear bookmarks when last tab closes
  useEffect(() => {
    // Increment tab count on mount
    const count = parseInt(localStorage.getItem("cp_tabCount") || "0", 10);
    localStorage.setItem("cp_tabCount", String(count + 1));

    const handleUnload = () => {
      const current = parseInt(localStorage.getItem("cp_tabCount") || "1", 10);
      const newCount = Math.max(0, current - 1);
      localStorage.setItem("cp_tabCount", String(newCount));
      // Last tab closing — clear bookmarks
      if (newCount === 0) {
        localStorage.removeItem("cp_bookmarks");
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  // Load articles from live RSS feeds via /api/feed
  const [feedError, setFeedError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/feed");
        if (!res.ok) throw new Error(`Feed responded ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const sorted = (data.articles || []).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        setArticles(sorted);
        if (data.errors?.length) {
          console.warn("[debrief.to] some sources failed:", data.errors);
        }
      } catch (err) {
        if (!cancelled) setFeedError(err.message);
        console.error("[debrief.to] feed load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
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

  const filtered = filterByTime(articles, timeFilter).filter((a) => {
    const matchesSource = activeCategories.length === 0 || activeSources.includes(a.source);
    const matchesSearch = !searchQuery || a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSource && matchesSearch;
  });

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
    return <BookmarksPage bookmarks={bookmarks} onBack={() => setPage("feed")} onRemove={toggleBookmark} darkMode={darkMode} />;
  }

  if (page === "about") {
    return <AboutPage onBack={() => setPage("feed")} darkMode={darkMode} />;
  }

  const dm = darkMode;
  const t = {
    bg: dm ? "#1A1A1A" : "#FAF8F5",
    headerBg: dm ? "#1E1E1E" : "#FFF",
    border: dm ? "#333" : "#8A8580",
    cardBg: dm ? "#242424" : "#FFF",
    cardBorder: dm ? "#3A3A3A" : "#E8E5E0",
    text: dm ? "#E8E5E0" : "#2C2C2C",
    textSec: dm ? "#A09B94" : "#7A756E",
    textMuted: dm ? "#9A958E" : "#7A756E",
    inputBg: dm ? "#2A2A2A" : "#FFF",
    inputBorder: dm ? "#444" : "#8A8580",
    title: dm ? "#F0EDE8" : "#1A1A1A",
    desc: dm ? "#D0CCC6" : "#000000",
    skeleton: dm ? "#333" : "#EBE8E3",
  };

  return (
    <div style={{ fontFamily: "inherit", minHeight: "100vh", background: t.bg, color: t.text }}>
      {/* ===== HEADER ===== */}
      <header style={{ background: t.headerBg, borderBottom: `1px solid ${dm ? "#2A2A2A" : "#E8E5E0"}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ padding: "20px 120px 16px" }}>

          {/* Top row */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 14 }}>
            <div style={{ flexShrink: 0 }}>
              <h1 style={{ fontFamily: "'Georgia', serif", fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1, margin: 0 }}>
                <span style={{ color: "#2D6A4F" }}>Debrief</span>
                <span style={{ color: dm ? "#E8E5E0" : "#2C2C2C" }}>.TO</span>
              </h1>
              <p style={{ fontSize: 12, color: t.desc, marginTop: 4, fontWeight: 400 }}>Toronto's local news, in one place</p>
            </div>

            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <div style={{ position: "relative", width: "100%", maxWidth: 480 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  style={{ border: `1px solid ${t.inputBorder}`, borderRadius: 24, padding: "10px 18px 10px 44px", fontSize: 14, background: t.inputBg, color: t.text, width: "100%", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setDarkMode(!dm)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s ease", background: dm ? "#2D6A4F" : "transparent", border: dm ? "1.5px solid #2D6A4F" : `1.5px solid ${t.inputBorder}`, color: dm ? "#FFF" : t.textSec }}>
                {dm ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
                {dm ? "Light" : "Dark"}
              </button>

              <button onClick={() => setPage("bookmarks")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s ease", background: "transparent", border: `1.5px solid ${dm ? "#5A3040" : "#E8D0D6"}`, color: dm ? "#E63956" : "#C0354A" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = dm ? "#E6395612" : "#E6395608"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#E63956" stroke="#2B2D5B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                Saved
                {bookmarks.length > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: "#E63956", color: "#FFF", padding: "1px 6px", borderRadius: 8, lineHeight: "16px" }}>{bookmarks.length}</span>
                )}
              </button>

              <button onClick={() => setPage("about")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s ease", background: "transparent", border: `1.5px solid ${dm ? "#2E5A47" : "#CDE3D7"}`, color: dm ? "#5FBF92" : "#2D6A4F" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = dm ? "#2D6A4F12" : "#2D6A4F08"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                About
              </button>
            </div>
          </div>

          {/* Second row: Sources + Time + Active filters */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setShowSources(!showSources)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 24, fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s ease", whiteSpace: "nowrap", background: showSources ? "#2D6A4F" : (dm ? "#333" : "#FFF"), color: showSources ? "#FFFFFF" : "#2D6A4F", border: showSources ? "1.5px solid #2D6A4F" : `1.5px solid ${t.inputBorder}`, ...(dm ? { textShadow: showSources ? "none" : "-0.5px -0.5px 0 rgba(105,255,195,0.8), 0.5px -0.5px 0 rgba(105,255,195,0.8), -0.5px 0.5px 0 rgba(105,255,195,0.8), 0.5px 0.5px 0 rgba(105,255,195,0.8)", boxShadow: "-0.5px -0.5px 0 rgba(105,255,195,0.8), 0.5px -0.5px 0 rgba(105,255,195,0.8), -0.5px 0.5px 0 rgba(105,255,195,0.8), 0.5px 0.5px 0 rgba(105,255,195,0.8)" } : {}) }}>
              Sources
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.2s ease", transform: showSources ? "rotate(180deg)" : "rotate(0deg)" }}><polyline points="6 9 12 15 18 9" /></svg>
            </button>

            <div style={{ width: 1, height: 22, background: dm ? t.desc : t.border, margin: "0 4px" }} />

            {TIME_OPTIONS.map((opt) => {
              const isActive = timeFilter === opt;
              return (
                <button key={opt} onClick={() => setTimeFilter(opt)} style={{ padding: "8px 16px", borderRadius: 24, fontSize: 15, fontWeight: isActive ? 600 : 400, fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s ease", whiteSpace: "nowrap", background: isActive ? "#2D6A4F" : "transparent", color: isActive ? "#FFF" : (dm ? t.desc : t.textSec), border: isActive ? "1.5px solid #2D6A4F" : "1.5px solid transparent", ...(dm && isActive ? { textShadow: "none", boxShadow: "-0.5px -0.5px 0 rgba(105,255,195,0.8), 0.5px -0.5px 0 rgba(105,255,195,0.8), -0.5px 0.5px 0 rgba(105,255,195,0.8), 0.5px 0.5px 0 rgba(105,255,195,0.8)" } : {}) }}>
                  {opt}
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
                    <button onClick={() => toggleCategory(cat.label)} style={{ padding: "9px 18px", borderRadius: 20, fontSize: 15, fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s ease", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, lineHeight: 1, fontWeight: isActive ? 600 : 500, ...( dm ? { background: isActive ? srcObj.color : "#333", color: isActive ? "#FFF" : "#D0CCC6", border: "1.5px solid transparent", boxShadow: (() => { const r = Math.min(255, parseInt(srcObj.color.slice(1,3),16) + 160); const g = Math.min(255, parseInt(srcObj.color.slice(3,5),16) + 160); const b = Math.min(255, parseInt(srcObj.color.slice(5,7),16) + 160); const lite = `rgba(${r},${g},${b},0.8)`; const shell = `-0.5px -0.5px 0 ${lite}, 0.5px -0.5px 0 ${lite}, -0.5px 0.5px 0 ${lite}, 0.5px 0.5px 0 ${lite}`; return isActive ? `0 0 14px ${getCatTint(srcObj.color, 0.4)}, ${shell}` : shell; })() } : { background: isActive ? getCatTint(srcObj.color, 0.12) : "#FFF", color: isActive ? srcObj.color : t.textSec, border: isActive ? `1.5px solid ${getCatTint(srcObj.color, 0.3)}` : `1.5px solid ${t.border}`, boxShadow: "none" }) }}>
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
      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 24px 64px" }}>
        <div style={{ marginBottom: 20, fontSize: 13, color: t.textSec, fontWeight: 400, letterSpacing: "0.2px", textTransform: "none" }}>
          Showing {visibleArticles.length}{hasMore ? ` of ${filtered.length}` : ""} article{filtered.length !== 1 ? "s" : ""} {"\u00B7"} {timeFilter.toLowerCase()}
          {activeCategories.length > 0 && ` \u00B7 ${activeCategories.join(", ")}`}
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
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 24px", background: t.cardBg, borderRadius: 10, border: `1px solid ${t.cardBorder}`, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <p style={{ fontSize: 18, fontFamily: "'Georgia', serif", fontWeight: 600, color: t.text }}>No articles found</p>
            <p style={{ fontSize: 14, color: t.textSec, marginTop: 6 }}>Try a different time range, search term, or filter.</p>
            {timeFilter !== "This Month" && (
              <button onClick={() => setTimeFilter("This Month")} style={{ marginTop: 18, padding: "9px 18px", borderRadius: 8, fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", background: "#2D6A4F", color: "#FFF", border: "1.5px solid #2D6A4F" }}>
                Show this month
              </button>
            )}
          </div>
        ) : (
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
                    </div>
                    <button onClick={() => toggleBookmark(article)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", flexShrink: 0, transition: "color 0.15s ease", display: "flex", alignItems: "center", color: isBookmarked(article) ? "#E63956" : t.textMuted }}>
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
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: 24,
};
