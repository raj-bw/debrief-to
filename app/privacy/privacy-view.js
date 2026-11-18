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
  const li = { marginBottom: 6 };

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.title }}>
      <header style={{ borderBottom: `1px solid ${c.rule}`, padding: "20px clamp(16px, 5vw, 120px) 16px" }}>
        <a href="/" aria-label="Debrief.TO, back to the news" style={{ fontFamily: "'Georgia', serif", fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", textDecoration: "none" }}>
          <span style={{ color: c.brand }}>Debrief</span><span style={{ color: c.title }}>.TO</span>
        </a>
      </header>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "36px clamp(16px, 4vw, 24px) 80px" }}>
        <h1 style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(28px, 6vw, 34px)", fontWeight: 700, margin: "0 0 6px" }}>Privacy</h1>
        <p style={{ fontSize: 14, color: c.muted, margin: "0 0 24px" }}>Last updated {updated}</p>

        <P>
          Debrief.TO has no accounts, no ads and no cookies. We don&apos;t know who you are, and we don&apos;t track
          which stories you read.
        </P>

        <H2>What we collect</H2>
        <P>
          We count visits with Vercel Web Analytics, which records the page viewed, the site that sent you, and general
          information about your device: country, browser, operating system and device type. It uses no cookies and
          doesn&apos;t follow you from one day to the next or across other websites.
        </P>
        <P>
          When someone scans one of our printed QR codes, we add one to that code&apos;s count for the day. Nothing
          about the person scanning is recorded.
        </P>

        <H2>Cookies</H2>
        <P>None. Debrief.TO sets no cookies.</P>

        <H2>Stored in your browser</H2>
        <P>
          So the site remembers your choices, a few settings are saved in your own browser&apos;s storage. They never
          leave your device:
        </P>
        <ul style={{ margin: "0 0 14px", paddingLeft: 20, fontSize: 15.5, lineHeight: 1.75, color: c.body }}>
          <li style={li}>your town, filters and date range</li>
          <li style={li}>the stories you save</li>
          <li style={li}>dark mode</li>
          <li style={li}>
            how many times you&apos;ve visited, and whether you closed the &ldquo;Add to Home Screen&rdquo; suggestion,
            which is only used to decide when to show it
          </li>
        </ul>
        <P>Clearing your browser&apos;s data for debrief.to removes all of it.</P>

        <H2>Third parties</H2>
        <P>
          <strong style={{ color: c.title }}>Hosting.</strong> Debrief.TO is hosted by Vercel. Like any web host, it
          handles standard request information (your IP address, browser and the page requested) to deliver the site
          and protect it from attacks. <A href="https://vercel.com/legal/privacy-policy">Vercel&apos;s privacy policy</A> applies.
        </P>
        <P>
          <strong style={{ color: c.title }}>Story photos.</strong> Photos on story cards load directly from each
          newsroom&apos;s servers, so the newsroom sees a standard request from your browser, including your IP address.
          It can see that you came from debrief.to, but not which page.
        </P>
        <P>
          <strong style={{ color: c.title }}>Stories.</strong> When you open a story, you are on the newsroom&apos;s own
          website, and its privacy policy applies.
        </P>
        <P>Everything else, including fonts, is served by Debrief.TO itself.</P>

        <H2>Contact</H2>
        <P>
          Questions or feedback can be sent to <A href="mailto:hello@debrief.to">hello@debrief.to</A> or posted as
          an <A href={FEEDBACK_URL}>issue on GitHub</A>. Posts on GitHub are public and show your GitHub username, so use
          email for anything private.
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
