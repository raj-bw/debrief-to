/* ---- Security headers ----
   The standard set (OWASP Secure Headers Project; the Next.js security
   guide), sent with every response:

   - Content-Security-Policy: scripts, styles, fonts and requests only from
     debrief.to itself. Story images come from each newsroom's own servers,
     so images may come from any https address. Inline scripts and styles are
     allowed because Next.js and the page's inline styling rely on them.
     upgrade-insecure-requests turns the odd http:// story image into https.
   - frame-ancestors / X-Frame-Options: no other site can show Debrief.TO
     inside a frame (clickjacking).
   - X-Content-Type-Options: files are only ever read as the type they say.
   - Referrer-Policy: a newsroom sees that a reader came from debrief.to,
     never which page or search.
   - Permissions-Policy: the site never uses the camera, microphone or
     location, so it can't be made to ask.
   - Cross-Origin-Opener-Policy: a story opened in a new tab can't reach back
     into this one.

   Vercel's preview toolbar loads from vercel.live, so previews allow that
   too; the live site doesn't. ---- */
const preview = process.env.VERCEL_ENV === "preview";
const isDev = process.env.NODE_ENV === "development";
const live = preview ? " https://vercel.live" : "";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${live}`,
  `style-src 'self' 'unsafe-inline'${live}`,
  "img-src 'self' https: data: blob:",
  `font-src 'self'${live}`,
  `connect-src 'self'${live}${preview ? " wss://ws-us3.pusher.com" : ""}`,
  `frame-src${preview ? live : " 'none'"}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
