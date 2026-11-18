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
          <strong style={{ color: c.title }}>The short version:</strong> Debrief.TO doesn&apos;t ask who you are,
          doesn&apos;t use cookies and doesn&apos;t keep track of the stories you read.
        </P>

        <H2>What we know about your visit</H2>
        <P>
          We count how many people visit. For each visit we see which page was opened, which website sent you here, and
          the general type of device: the country, the browser (like Safari or Chrome), and whether it&apos;s a phone or
          a computer.
        </P>
        <P>
          We can&apos;t tell who you are. The tool that does the counting, Vercel Web Analytics, doesn&apos;t use cookies
          and forgets you after a day. It can&apos;t recognize you next time or follow you to other websites.
        </P>
        <P>
          Our printed flyers and stickers have QR codes. When someone scans one, we add one to that day&apos;s count.
          That&apos;s all we record.
        </P>

        <H2>Cookies</H2>
        <P>We don&apos;t use any.</P>

        <H2>What&apos;s saved on your phone or computer</H2>
        <P>
          To remember your choices, the site saves a few things in your browser. They stay on your device and are
          never sent to us:
        </P>
        <ul style={{ margin: "0 0 14px", paddingLeft: 20, fontSize: 15.5, lineHeight: 1.75, color: c.body }}>
          <li style={li}>your town and the filters you picked</li>
          <li style={li}>stories you saved for later</li>
          <li style={li}>whether you turned on dark mode</li>
          <li style={li}>
            how many times you&apos;ve visited, and whether you said &ldquo;Not now&rdquo; to adding the site to your home
            screen (we only use this to decide when to ask again)
          </li>
        </ul>
        <P>To erase them, clear your browser&apos;s data for debrief.to.</P>

        <H2>Who else can see your visit</H2>
        <P>
          <strong style={{ color: c.title }}>The company that runs our website.</strong> Debrief.TO runs on Vercel. Like
          any website host, Vercel needs a few basic details to show you the page, such as your internet address (called
          an IP address) and the browser you use. It also uses them to block attacks on the site.{" "}
          <A href="https://vercel.com/legal/privacy-policy">Vercel&apos;s privacy policy</A> explains more.
        </P>
        <P>
          <strong style={{ color: c.title }}>The newsrooms.</strong> The photos on story cards come straight from each
          newsroom&apos;s website. So the newsroom can see your internet address, and that you came from debrief.to. It
          can&apos;t see which page you were on.
        </P>
        <P>
          When you tap a story, you leave Debrief.TO and go to the newsroom&apos;s website. Their privacy policy applies
          there.
        </P>
        <P>Nothing else comes from other companies. Even the fonts come from Debrief.TO.</P>

        <H2>Questions</H2>
        <P>
          Email us at <A href="mailto:hello@debrief.to">hello@debrief.to</A>. You can also post on{" "}
          <A href={FEEDBACK_URL}>GitHub</A>, but anything you write there is public and shows your GitHub username. Use
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
