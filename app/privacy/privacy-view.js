"use client";
import { useEffect, useState } from "react";
import { FEEDBACK_URL } from "../lib/links";

/* The privacy page's screen (see page.js). A client component so it follows
   the reader's Dark button, saved in this browser, like the rest of the site. */
export default function PrivacyView({ updated }) {
  const [dm, setDm] = useState(false);
  useEffect(() => {
    try { setDm(JSON.parse(localStorage.getItem("cp_darkMode")) === true); } catch {}
  }, []);

  const c = {
    bg: dm ? "#1A1A1A" : "#FAF8F5",
    title: dm ? "#F0EDE8" : "#1A1A1A",
    body: dm ? "#C8C4BE" : "#3C3A37",
    muted: dm ? "#9A958E" : "#6B665F",
    brand: dm ? "#4CAF83" : "#2D6A4F",
    link: dm ? "#7FD3A8" : "#2D6A4F",
    rule: dm ? "#2E2E2E" : "#E8E5E0",
  };
  const H2 = ({ children }) => (
    <h2 style={{ fontFamily: "'Georgia', serif", fontSize: 21, fontWeight: 700, color: c.title, margin: "34px 0 10px" }}>{children}</h2>
  );
  const P = ({ children }) => <p style={{ fontSize: 15.5, lineHeight: 1.75, color: c.body, margin: "0 0 14px" }}>{children}</p>;
  const A = ({ href, children }) => (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener" style={{ color: c.link, fontWeight: 600, textUnderlineOffset: 3 }}>{children}</a>
  );

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.title }}>
      <header style={{ borderBottom: `1px solid ${c.rule}`, padding: "20px clamp(16px, 5vw, 120px) 16px" }}>
        <a href="/" aria-label="Debrief.TO, back to the news" style={{ fontFamily: "'Georgia', serif", fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", textDecoration: "none" }}>
          <span style={{ color: c.brand }}>Debrief</span><span style={{ color: c.title }}>.TO</span>
        </a>
      </header>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "36px clamp(16px, 4vw, 24px) 80px" }}>
        <h1 style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(28px, 6vw, 34px)", fontWeight: 700, margin: "0 0 6px" }}>Privacy</h1>
        <p style={{ fontSize: 14, color: c.muted, margin: "0 0 24px" }}>Last updated: {updated}</p>

        <H2>What we collect</H2>
        <P>
          Very little. Debrief.TO has no accounts and no forms. We count visits with Vercel Web Analytics, which
          records the page you opened, the website that sent you, and your type of device (country, browser, phone or
          computer). It uses no cookies and can&apos;t tell who you are.
        </P>

        <H2>Cookies</H2>
        <P>
          None. The site saves your town, filters, saved stories and dark mode setting in your own browser so it
          remembers them. That stays on your device and is never used for tracking.
        </P>

        <H2>Third parties</H2>
        <P>
          Debrief.TO is hosted by Vercel, and story photos load straight from each newsroom&apos;s website. Like any
          website, they see basic information about the request: your internet address (IP address), your browser, and
          that you came from debrief.to. When you open a story, you&apos;re on the newsroom&apos;s own site, and its
          privacy policy applies. See <A href="https://vercel.com/legal/privacy-policy">Vercel&apos;s privacy policy</A>.
        </P>

        <H2>Contact</H2>
        <P>
          Questions or feedback can be sent to <A href="mailto:hello@debrief.to">hello@debrief.to</A> or posted as
          an <A href={FEEDBACK_URL}>issue on GitHub</A>. Posts on GitHub are public.
        </P>

        <p style={{ marginTop: 36, fontSize: 14 }}>
          <a href="/" style={{ color: c.link, fontWeight: 600 }}>← Back to the news</a>
          <span style={{ color: c.muted, margin: "0 10px" }} aria-hidden="true">·</span>
          <a href="/?view=about" style={{ color: c.link, fontWeight: 600 }}>About Debrief.TO</a>
        </p>
      </main>
    </div>
  );
}
