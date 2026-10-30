import Home from "../page";
import { townOptions, resolveTown } from "../lib/towns";

/* ---- A page for each town ----
   debrief.to/kingston, debrief.to/greater-napanee: the same site, opened on
   that town's news, with its own title and share preview, so a search for a
   town's news can find it and a link to it can be texted or posted. Every
   municipality the town picker offers has one, made when the site is built;
   any other address is the "page not found" page. */

export const dynamicParams = false;

export function generateStaticParams() {
  return townOptions().map((t) => ({ town: t.slug }));
}

// "A, B and C", the newsrooms a town's page reads, without the publisher
// that some names carry in brackets
function newsroomList(feeds) {
  const names = [...new Set(feeds.map((f) => f.name.replace(/\s*\([^)]*\)$/, "")))];
  if (names.length <= 1) return names[0] || "";
  const shown = names.slice(0, 3);
  const more = names.length > 3 ? " and more" : "";
  return more ? `${shown.join(", ")}${more}` : `${shown.slice(0, -1).join(", ")} and ${shown.at(-1)}`;
}

function townDescription(slug) {
  const town = resolveTown(slug);
  const from = newsroomList(town.feeds);
  const where = town.usingRegion ? `newsrooms covering ${town.regionName}` : "local newsrooms";
  return `Local news for ${town.townName}, Ontario: headlines from ${where}${from ? ` (${from})` : ""}, free and in one place. Every story links back to the newsroom that reported it.`;
}

export async function generateMetadata({ params }) {
  const { town: slug } = await params;
  const town = resolveTown(slug);
  const title = `${town.townName} news — Debrief.TO`;
  const description = townDescription(slug);
  return {
    title,
    description,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      type: "website",
      siteName: "Debrief.TO",
      locale: "en_CA",
      url: `https://debrief.to/${slug}`,
      title,
      description,
      images: [{ url: "/icons/og-image.png", width: 1200, height: 630, alt: "Debrief.TO — Ontario's local news, in one place" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/icons/og-image.png"] },
  };
}

export default async function TownPage({ params }) {
  const { town } = await params;
  return <Home pageTown={town} />;
}
