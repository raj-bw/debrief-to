import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Debrief.TO — Ontario's local news, in one place",
  description:
    "Debrief.TO gathers headlines from local and independent newsrooms across Ontario. All content belongs to the newsroom that reported it.",
  // Browser-tab icons are added in app/page.js (<SiteIcons>) so they can follow
  // the site's Dark button. This one is for iPhone/iPad "Add to Home Screen".
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Opened from the iPhone Home Screen, the site runs full-screen like an app
  // (see app/web-app-manifest/route.js), with this name under its icon.
  appleWebApp: {
    title: "Debrief.TO",
    statusBarStyle: "default",
  },
  // Used to build full links for the share preview below
  metadataBase: new URL("https://debrief.to"),
  // The one address search engines should list, whatever ?view= or ?town=
  // a link carried
  alternates: { canonical: "/" },
  // What people see when the link is shared in a text, on social media or in Slack
  openGraph: {
    type: "website",
    siteName: "Debrief.TO",
    locale: "en_CA",
    url: "https://debrief.to",
    title: "Debrief.TO — Ontario's local news, in one place",
    description:
      "Headlines from local and independent newsrooms across Ontario, free and in one feed. Every story links back to the publisher.",
    images: [{ url: "/icons/og-image.png", width: 1200, height: 630, alt: "Debrief.TO — Ontario's local news, in one place" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Debrief.TO — Ontario's local news, in one place",
    description:
      "Headlines from local and independent newsrooms across Ontario, free and in one feed.",
    images: ["/icons/og-image.png"],
  },
};

// Who and what the site is, in the vocabulary search engines read
// (schema.org), so a search for Debrief.TO can show it by name.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Debrief.TO",
  alternateName: "Debrief TO",
  url: "https://debrief.to",
  description: "A free reader for Ontario's local news: headlines from local and independent newsrooms in one place, each linking to the original story.",
  inLanguage: "en-CA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={dmSans.variable} style={{ fontFamily: "var(--font-dm-sans), -apple-system, BlinkMacSystemFont, sans-serif" }} suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, "\\u003c") }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
