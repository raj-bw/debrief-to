import PrivacyView from "./privacy-view";

/* ---- Privacy ----
   What the site collects, stores and shares, in plain terms. Its own page
   (debrief.to/privacy) rather than a section of About, so it can be linked
   to directly and kept up to date in one place. When anything here changes,
   change UPDATED too. */
export const UPDATED = "November 18, 2026";

const description = "Debrief.TO doesn't ask who you are, doesn't use cookies and doesn't track what you read. Here's what we do see, in plain English.";

export const metadata = {
  title: "Privacy — Debrief.TO",
  description,
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "website",
    siteName: "Debrief.TO",
    locale: "en_CA",
    url: "https://debrief.to/privacy",
    title: "Privacy — Debrief.TO",
    description,
    images: [{ url: "/icons/og-image.png", width: 1200, height: 630, alt: "Debrief.TO — Ontario's local news, in one place" }],
  },
};

export default function Privacy() {
  return <PrivacyView updated={UPDATED} />;
}
