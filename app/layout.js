import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Debrief.TO — Toronto's local news, in one place",
  description:
    "Debrief.TO aggregates headlines from independent and major Toronto publishers. All content belongs to its original source.",
  // Browser-tab icons are added in app/page.js (<SiteIcons>) so they can follow
  // the site's Dark button. This one is for iPhone/iPad "Add to Home Screen".
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={dmSans.variable} style={{ fontFamily: "var(--font-dm-sans), -apple-system, BlinkMacSystemFont, sans-serif" }} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
