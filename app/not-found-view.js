"use client";
import { useEffect, useState } from "react";

/* The page-not-found screen (see app/not-found.js). A client component so
   it can follow the reader's Dark button, saved in this browser, the same
   way the rest of the site does. */
export default function NotFoundView() {
  const [dm, setDm] = useState(false);
  useEffect(() => {
    try { setDm(JSON.parse(localStorage.getItem("cp_darkMode")) === true); } catch {}
  }, []);

  const c = {
    bg: dm ? "#1A1A1A" : "#FAF8F5",
    text: dm ? "#F0EDE8" : "#1A1A1A",
    body: dm ? "#C8C4BE" : "#3C3A37",
    brand: dm ? "#4CAF83" : "#2D6A4F",
    link: dm ? "#7FD3A8" : "#2D6A4F",
  };

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
      <main style={{ maxWidth: 520, textAlign: "center" }}>
        <p style={{ fontFamily: "'Georgia', serif", fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 28px" }}>
          <span style={{ color: c.brand }}>Debrief</span>
          <span style={{ color: c.text }}>.TO</span>
        </p>
        <h1 style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(24px, 5vw, 30px)", fontWeight: 700, lineHeight: 1.25, margin: "0 0 14px" }}>
          This page isn&apos;t here
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.65, color: c.body, margin: "0 0 28px" }}>
          The link may be old or mistyped. Stories open on each newsroom&apos;s own site, so a story you&apos;re looking for will be there, or in the feed.
        </p>
        <a href="/" style={{ display: "inline-block", padding: "12px 22px", borderRadius: 24, background: "#2D6A4F", color: "#FFF", fontWeight: 600, fontSize: 15, textDecoration: "none" }}>
          Go to the news
        </a>
        <p style={{ marginTop: 18, fontSize: 14 }}>
          <a href="/?view=about" style={{ color: c.link, fontWeight: 600 }}>About Debrief.TO</a>
        </p>
      </main>
    </div>
  );
}
