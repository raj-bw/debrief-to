/* The site in a real browser, on a phone-sized and a computer-sized screen,
   against a local build with made-up stories (see seed.mjs). Every request
   outside the site is blocked or answered here, so these checks never reach
   a newsroom or a council calendar, and never count as a visit.

   BASE=http://localhost:3000 node tests/browser.mjs    (exits 1 on any failure) */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3000";
const PHOTO = readFileSync(new URL("../public/icons/apple-touch-icon.png", import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const storySel = 'button[aria-label^="Save \\""], button[aria-label^="Remove \\""]';
const failures = [];
let screen = "";

async function check(name, fn) {
  try {
    const problem = await fn();
    if (problem) throw new Error(problem);
    console.log(`PASS [${screen}] ${name}`);
  } catch (err) {
    failures.push(`[${screen}] ${name}`);
    console.log(`FAIL [${screen}] ${name} — ${String(err.message || err).split("\n")[0].slice(0, 300)}`);
  }
}

const sideways = (page) => page.evaluate(() => {
  const w = document.documentElement.clientWidth, sw = document.documentElement.scrollWidth;
  return sw > w + 1 ? `page is ${sw}px wide on a ${w}px screen` : null;
});

async function run({ name, width, height, phone }) {
  screen = name;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width, height }, ...(phone ? { isMobile: true, hasTouch: true } : {}) });
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.host === "images.test") return route.fulfill({ contentType: "image/png", body: PHOTO });
    if (url.pathname.startsWith("/api/council")) {
      return route.fulfill({ json: { town: "Newmarket", available: true, portal: "https://example.test/council", meetings: [], checkedAt: new Date().toISOString() } });
    }
    if (url.pathname.startsWith("/_vercel/")) return route.abort();
    if (`${url.protocol}//${url.host}` !== new URL(BASE).origin) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  const jsErrors = [], consoleErrors = [], badResponses = [];
  page.on("pageerror", (e) => jsErrors.push(e.message));
  page.on("console", (m) => {
    // The 404 check's own page logs its 404; blocked outside requests log ERR_FAILED
    if (m.type() === "error" && !/ERR_FAILED|_vercel/.test(m.text()) && !(m.location()?.url || "").includes("/no-such-page")) consoleErrors.push(m.text());
  });
  page.on("response", (r) => { if (r.url().startsWith(BASE) && r.status() >= 400 && !r.url().includes("/no-such-page")) badResponses.push(`${r.status()} ${r.url()}`); });

  await page.goto(BASE + "/", { waitUntil: "load" });
  const picker = page.getByRole("dialog", { name: "Choose your town" });

  await check("a first visit asks for a town, and picking Newmarket shows its stories", async () => {
    await picker.waitFor({ state: "visible", timeout: 15000 });
    await page.getByLabel("Search for your town").fill("newm");
    await picker.getByRole("button", { name: /^Newmarket/ }).first().click();
    await picker.waitFor({ state: "hidden", timeout: 5000 });
    await page.locator(storySel).first().waitFor({ timeout: 20000 });
    const n = await page.locator(storySel).count();
    if (n < 10) return `only ${n} stories shown`;
  });

  await check("story links open the publisher's page in a new tab, with rel=noopener", async () => {
    const links = await page.$$eval('main a[target="_blank"]', (as) => as.slice(0, 20).map((a) => ({ href: a.href, rel: a.rel })));
    if (!links.length) return "no story links";
    const bad = links.find((l) => new URL(l.href).origin === new URL(BASE).origin || !/noopener/.test(l.rel));
    if (bad) return `bad link: ${bad.href} rel=${bad.rel}`;
  });

  await check(`the first row's photos are fetched first (${phone ? "one" : "three"})`, async () => {
    const imgs = await page.$$eval("main img", (els) => els.slice(0, 5).map((i) => [i.getAttribute("loading"), i.getAttribute("fetchpriority")]));
    const early = imgs.filter(([l, f]) => l === "eager" && f === "high").length;
    if (early !== (phone ? 1 : 3)) return `early photos: ${early} (${JSON.stringify(imgs)})`;
  });

  await check("no sideways scrolling", async () => sideways(page));

  // The date and place filters live in the Sources panel, closed at first on a phone
  const sources = page.getByRole("button", { name: /^Sources/ });
  if ((await sources.getAttribute("aria-expanded")) !== "true") await sources.click();

  await check("Today, This Week and This Month all switch", async () => {
    for (const label of [/^Today$/, /^(This )?Week$/, /^(This )?Month$/]) {
      await page.getByRole("button", { name: label }).first().click();
      await sleep(400);
      const shown = await page.locator(storySel).count();
      if (!shown && !(await page.getByText(/No articles found|Nothing new/).count())) return `${label} shows nothing and says nothing`;
    }
  });

  await check("search narrows the stories, and says so when nothing matches", async () => {
    const before = await page.locator(storySel).count();
    await page.getByLabel("Search articles").fill("Library");
    await sleep(600);
    const after = await page.locator(storySel).count();
    if (!(after > 0 && after < before)) return `${before} stories before, ${after} after`;
    await page.getByLabel("Search articles").fill("zzqxjvplm");
    await page.getByText(/No articles found/).waitFor({ timeout: 3000 });
    await page.getByLabel("Search articles").fill("");
    await sleep(400);
  });

  await check("a saved story is listed under Saved, and still there after a reload", async () => {
    const save = page.locator('button[aria-label^="Save \\""]').first();
    const title = ((await save.getAttribute("aria-label")) || "").replace(/^Save "/, "").replace(/" to read later$/, "");
    await save.click();
    await page.reload({ waitUntil: "load" });
    await page.locator(storySel).first().waitFor({ timeout: 20000 });
    await page.getByRole("button", { name: "Open saved articles" }).click();
    await page.waitForURL(/view=saved/, { timeout: 5000 });
    await page.getByText(title.slice(0, 30)).first().waitFor({ timeout: 5000 });
    await page.goBack();
    await page.getByLabel("Search articles").waitFor({ timeout: 5000 });
  });

  await check("About lists the newsrooms", async () => {
    await page.getByRole("button", { name: "Open About" }).click();
    await page.waitForURL(/view=about/);
    const n = await page.locator('a[target="_blank"]').count();
    if (n < 100) return `only ${n} newsroom links`;
    await page.goBack();
    await page.getByLabel("Search articles").waitFor({ timeout: 5000 });
  });

  await check("Editor's Picks opens", async () => {
    await page.getByRole("button", { name: /Editor's Picks/ }).click();
    await page.waitForURL(/view=picks/);
    // Picks come and go with the calendar; either some, or the empty message
    await page.locator(`${storySel}, :text("No picks right now")`).first().waitFor({ timeout: 5000 });
    await page.goBack();
  });

  await check("dark mode switches and survives a reload", async () => {
    await page.getByRole("button", { name: /^Dark$/ }).click();
    await page.reload({ waitUntil: "load" });
    await page.getByRole("button", { name: /^Light$/ }).waitFor({ timeout: 5000 });
  });

  if (phone) {
    await check("no sideways scrolling on a 320px screen", async () => {
      await page.setViewportSize({ width: 320, height: 640 });
      await sleep(300);
      return sideways(page);
    });
  }

  await check("a missing page answers 404 with a way back", async () => {
    const res = await page.goto(BASE + "/no-such-page", { waitUntil: "load" });
    if (res.status() !== 404) return `status ${res.status()}`;
    await page.getByRole("link", { name: /Go to the news/ }).waitFor({ timeout: 5000 });
  });

  await check("the app manifest is valid JSON", async () => {
    const res = await page.request.get(BASE + "/web-app-manifest");
    const m = await res.json();
    if (!m.name || !m.icons?.length) return "manifest without a name or icons";
  });

  await check("no JavaScript errors", async () => (jsErrors.length ? jsErrors.slice(0, 3).join(" | ") : null));
  await check("no console errors", async () => (consoleErrors.length ? consoleErrors.slice(0, 3).join(" | ") : null));
  await check("no failed requests to the site", async () => (badResponses.length ? badResponses.slice(0, 3).join(" | ") : null));
  await browser.close();
}

await run({ name: "phone", width: 390, height: 844, phone: true });
await run({ name: "computer", width: 1366, height: 900, phone: false });
console.log(failures.length ? `\n${failures.length} failed:\n${failures.join("\n")}` : "\nAll browser checks passed.");
process.exit(failures.length ? 1 : 0);
