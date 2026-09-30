import { countScan } from "../../lib/archive";

/* ---- Printed QR codes ----
   Flyers and stickers point here, at a short address on the site's own
   domain: debrief.to/go/f. Nobody else can repoint it, there is no
   third-party QR service in the middle to expire or be bought, and the
   short address makes a small, easy-to-scan code.

   Each visit adds one to that code's count for the day (a number, nothing
   about the person scanning), then sends them on to the site — to the town
   the code was printed for, for someone who hasn't picked a town yet. A code
   that isn't in the list still lands on the site, and is counted as "other".

   The counts appear in /api/health under archive.qrScans. */

const CODES = {
  f: { label: "Flyer", town: "newmarket" },
  s: { label: "Sticker", town: "newmarket" },
};

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { code } = await params;
  const key = String(code || "").toLowerCase();
  const known = Object.hasOwn(CODES, key) ? CODES[key] : null;
  // A count that fails never stops the visit.
  await countScan(known ? key : "other").catch(() => {});
  const to = new URL(known?.town ? `/?town=${known.town}` : "/", request.url);
  return new Response(null, {
    status: 302,
    headers: { Location: to.toString(), "Cache-Control": "no-store" },
  });
}
