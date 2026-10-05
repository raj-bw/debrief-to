import NotFoundView from "./not-found-view";

/* ---- Page not found ----
   Shown for any address the site doesn't have: an old shared link, a typo,
   a page that never existed. Next.js still answers 404 and tells search
   engines not to index it; this only replaces its plain default screen
   with one that looks like Debrief.TO and offers a way back. */
export const metadata = { title: "Page not found — Debrief.TO" };

export default function NotFound() {
  return <NotFoundView />;
}
