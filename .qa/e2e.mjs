// End-to-end checks of the live site in one browser engine, on a phone-sized
// and a desktop-sized screen. Prints PASS / FAIL lines and a summary.
// ENGINE=chromium|firefox|webkit  BASE=https://debrief.to  AXE=1 (chromium)
import { chromium, firefox, webkit } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE || "https://debrief.to";
const ENGINE = process.env.ENGINE || "chromium";
const RUN_AXE = process.env.AXE === "1";
const engine = { chromium, firefox, webkit }[ENGINE];

const results = [];
let vp = "";
const log = (ok, name, detail = "") => {
  results.push({ ok, vp, name, detail });
  console.log(`${ok ? "PASS" : "FAIL"} [${ENGINE} ${vp}] ${name}${detail ? " — " + detail : ""}`);
};
const note = (name, detail) => console.log(`NOTE [${ENGINE} ${vp}] ${name}: ${detail}`);
async function check(name, fn) {
  try { const r = await fn(); if (r === false) log(false, name); else if (typeof r === "string") log(false, name, r); else log(true, name); }
  catch (e) { log(false, name, String(e.message || e).split("\n")[0].slice(0, 300)); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const articleSel = 'button[aria-label^="Save \\""], button[aria-label^="Remove \\""]';
const overflow = (page) => page.evaluate(() => {
  const w = document.documentElement.clientWidth;
  const sw = document.documentElement.scrollWidth;
  if (sw <= w + 1) return null;
  const wide = [...document.querySelectorAll("body *")].filter((el) => { const r = el.getBoundingClientRect(); return r.right > w + 1 && r.width > 0; })
    .slice(0, 4).map((el) => `${el.tagName.toLowerCase()}${el.getAttribute("aria-label") ? `[${el.getAttribute("aria-label").slice(0, 40)}]` : ""} "${(el.textContent || "").trim().slice(0, 30)}" right=${Math.round(el.getBoundingClientRect().right)}`);
  return `page is ${sw}px wide in a ${w}px screen; ${wide.join(" | ")}`;
});

const axeResults = [];
async function axe(page, state) {
  if (!RUN_AXE) return;
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await sleep(400); // let colour transitions finish
  try {
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    axeResults.push({ state: `${vp} ${state}`, violations: r.violations, incomplete: r.incomplete.map((i) => ({ id: i.id, nodes: i.nodes.length })) });
  } catch (e) { console.log(`axe failed on ${state}: ${e.message}`); }
}

async function scenario(viewport) {
  vp = viewport.name;
  const browser = await engine.launch();
  const ctxOpts = { viewport: { width: viewport.width, height: viewport.height } };
  if (viewport.mobile && ENGINE !== "firefox") Object.assign(ctxOpts, { isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const context = await browser.newContext(ctxOpts);
  // Keep test visits out of the site's visitor stats
  await context.route("**/_vercel/insights/**", (r) => r.abort());
  // Anything the Content-Security-Policy blocks shows up as a console error
  await context.addInitScript(() => document.addEventListener("securitypolicyviolation", (e) => console.error(`CSP blocked ${e.blockedURI || "inline"} (${e.violatedDirective})`)));
  const page = await context.newPage();
  const consoleErrors = [], pageErrors = [], badResponses = [], failedRequests = [];
  page.on("console", (m) => { if (m.type() === "error" && !/_vercel\/insights|ERR_FAILED/.test(m.text() + (m.location()?.url || ""))) consoleErrors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => pageErrors.push(String(e.message).slice(0, 200)));
  page.on("response", (r) => { if (r.status() >= 400 && !r.url().includes("/_vercel/insights/")) badResponses.push(`${r.status()} ${r.url().slice(0, 140)}`); });
  page.on("requestfailed", (r) => r.url().includes("/_vercel/insights/") || failedRequests.push(`${r.failure()?.errorText} ${r.url().slice(0, 140)}`));

  const t0 = Date.now();
  await page.goto(BASE + "/", { waitUntil: "load", timeout: 45000 });
  note("load event", `${Date.now() - t0} ms`);

  // --- First visit: the town picker ---
  const picker = page.getByRole("dialog", { name: "Choose your town" });
  await check("town picker opens on a first visit", async () => { await picker.waitFor({ state: "visible", timeout: 15000 }); });
  await check("town picker puts focus in its search box", async () => {
    await sleep(300);
    const label = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    if (label !== "Search for your town") return `focus is on ${label || (await page.evaluate(() => document.activeElement?.tagName))}`;
  });
  await axe(page, "town picker");
  await check("Shift+Tab stays inside the town picker (focus trap)", async () => {
    await page.getByLabel("Search for your town").focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press("Shift+Tab");
    const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
    if (!inside) return `focus moved behind the dialog to: ${await page.evaluate(() => (document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent || document.activeElement?.tagName || "").trim().slice(0, 40))}`;
  });
  await check("Escape closes the town picker", async () => {
    await page.getByLabel("Search for your town").focus();
    await page.keyboard.press("Escape");
    await sleep(300);
    if (await picker.isVisible()) return "still open after Escape";
  });
  if (!(await picker.isVisible())) {
    // Escape worked; open it again to pick a town
    await page.reload({ waitUntil: "load" });
    await page.evaluate(() => { localStorage.removeItem("cp_townAsked"); localStorage.removeItem("cp_town"); });
    await page.reload({ waitUntil: "load" });
    await picker.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  }
  await check("searching the picker finds Newmarket, and picking it closes the picker", async () => {
    await page.getByLabel("Search for your town").fill("newm");
    const btn = picker.getByRole("button", { name: /^Newmarket/ });
    await btn.first().click({ timeout: 5000 });
    await picker.waitFor({ state: "hidden", timeout: 5000 });
  });

  // --- The feed ---
  await check("stories load", async () => {
    await page.locator(articleSel).first().waitFor({ timeout: 30000 });
    note("stories shown at first", String(await page.locator(articleSel).count()));
    if (ENGINE === "chromium" && !viewport.mobile) writeFileSync("rendered-feed.html", await page.content());
  });
  await check("story links go to the publisher, in a new tab, with rel=noopener", async () => {
    const links = await page.$$eval('main a[target="_blank"]', (as) => as.slice(0, 30).map((a) => ({ href: a.href, rel: a.rel })));
    const bad = links.filter((l) => /debrief\.to/.test(new URL(l.href).host) || !/noopener/.test(l.rel));
    if (!links.length) return "no story links found";
    if (bad.length) return `${bad.length} bad: ${bad[0].href}`;
  });
  await check("the Newmarket tab is selected after picking Newmarket", async () => {
    // The active-filter pill in the filter row, visible whether or not Sources is open
    if (!(await page.getByRole("button", { name: "Remove the Newmarket filter" }).count())) return "no active Newmarket filter";
  });
  await check(`Sources panel starts ${viewport.mobile ? "closed on a phone" : "open on a computer"}`, async () => {
    const exp = await page.getByRole("button", { name: /^Sources/ }).getAttribute("aria-expanded");
    if (exp !== (viewport.mobile ? "false" : "true")) return `aria-expanded=${exp}`;
  });
  await check("no sideways scrolling on the feed", async () => { const o = await overflow(page); if (o) return o; });
  await axe(page, "feed (light)");

  // --- Filters ---
  const sourcesBtn = page.getByRole("button", { name: /^Sources/ });
  if ((await sourcesBtn.getAttribute("aria-expanded")) !== "true") await sourcesBtn.click();
  await axe(page, "sources open");
  await check("one filter shows a 'Clear' pill", async () => {
    const n = await page.locator('button[aria-pressed="true"]').filter({ hasText: /Newmarket/ }).count();
    if (!n) await page.getByRole("button", { name: /Newmarket/ }).first().click();
    const pill = page.getByRole("button", { name: /^Clear the .* filter$/ });
    await pill.waitFor({ timeout: 3000 });
    const text = (await pill.textContent()).trim();
    if (text !== "Clear") return `label is "${text}"`;
  });
  await check("two filters show 'Clear all', which clears both", async () => {
    await page.locator('button[aria-pressed="false"]').filter({ hasText: "Investigative" }).first().click();
    const pill = page.getByRole("button", { name: "Clear all filters" });
    await pill.waitFor({ timeout: 3000 });
    if ((await pill.textContent()).trim() !== "Clear all") return `label is "${(await pill.textContent()).trim()}"`;
    await pill.click();
    await sleep(300);
    const still = await page.locator('button[aria-pressed="true"]').filter({ hasNotText: /Saved|About|Editor/ }).count();
    if (still) return `${still} chips still selected`;
  });
  await check("each place and topic chip can be toggled without errors", async () => {
    const chips = page.locator('button[aria-pressed]').filter({ hasNotText: /Saved|About|Editor/ });
    const n = await chips.count();
    const empties = [];
    for (let i = 0; i < n; i++) {
      const chip = chips.nth(i);
      const label = (await chip.textContent()).replace("×", "").trim();
      await chip.click();
      await sleep(700);
      const stories = await page.locator(articleSel).count();
      const empty = await page.getByText(/No articles found|Nothing new/).count();
      if (!stories && !empty) empties.push(`${label}: neither stories nor an empty message`);
      else if (!stories) empties.push(`${label}: empty`);
      await chip.click();
      await sleep(200);
    }
    note("chips checked", String(n));
    const broken = empties.filter((e) => e.includes("neither"));
    if (empties.length) note("chips with no stories this month/week", empties.join("; "));
    if (broken.length) return broken.join("; ");
  });
  await check("time filters switch (Today / Week / Month)", async () => {
    for (const label of [/^Today$/, /^(This )?Week$/, /^(This )?Month$/]) {
      await page.getByRole("button", { name: label }).first().click();
      await sleep(500);
      const s = await page.locator(articleSel).count();
      const empty = await page.getByText(/No articles found|Nothing new/).count();
      if (!s && !empty) return `${label} shows nothing and no message`;
    }
  });

  // --- Search ---
  await check("search narrows to matching stories", async () => {
    const title = (await page.locator("main h3").first().textContent()) || "";
    const word = title.split(/[^A-Za-z]+/).filter((w) => w.length >= 6).sort((a, b) => b.length - a.length)[0];
    if (!word) return "no word to search for";
    await page.getByLabel("Search articles").fill(word);
    await sleep(600);
    const n = await page.locator(articleSel).count();
    if (!n) return `searching "${word}" found nothing although it is in a headline`;
  });
  await check("search with no match says so", async () => {
    await page.getByLabel("Search articles").fill("zzqxjvplm");
    await sleep(600);
    const n = await page.locator(articleSel).count();
    const msg = await page.getByText(/No articles found/).count();
    if (n) return `${n} stories shown for nonsense`;
    if (!msg) return "no empty-state message";
  });
  await page.getByLabel("Search articles").fill("");
  await sleep(500);

  // --- Saving a story ---
  let savedTitle = "";
  await check("saving a story updates the Saved count", async () => {
    const btn = page.locator('button[aria-label^="Save \\""]').first();
    savedTitle = ((await btn.getAttribute("aria-label")) || "").replace(/^Save "/, "").replace(/" to read later$/, "");
    await btn.click();
    await sleep(300);
    const badge = await page.getByRole("button", { name: "Open saved articles" }).textContent();
    if (!/1/.test(badge)) return `Saved button reads "${badge.trim()}"`;
  });
  await check("Saved page lists the story, and Back returns to the feed", async () => {
    await page.getByRole("button", { name: "Open saved articles" }).click();
    await page.waitForURL(/view=saved/, { timeout: 5000 });
    if (!(await page.getByText(savedTitle.slice(0, 40), { exact: false }).count())) return "story not on the Saved page";
    await axe(page, "saved");
    await page.goBack();
    await page.getByLabel("Search articles").waitFor({ timeout: 5000 });
  });
  await check("saved story survives a reload", async () => {
    await page.reload({ waitUntil: "load" });
    await page.locator(articleSel).first().waitFor({ timeout: 30000 });
    const badge = await page.getByRole("button", { name: "Open saved articles" }).textContent();
    if (!/1/.test(badge)) return `Saved button reads "${badge.trim()}" after reload`;
  });

  // --- About ---
  await check("About opens at ?view=about, lists newsrooms, and Back returns", async () => {
    await page.getByRole("button", { name: "Open About" }).click();
    await page.waitForURL(/view=about/, { timeout: 5000 });
    await page.locator("#publications").waitFor({ timeout: 5000 });
    const links = await page.$$eval('main a[href^="http"]', (as) => [...new Set(as.map((a) => a.href))]);
    note("outbound links on About", String(links.length));
    if (ENGINE === "chromium" && !viewport.mobile) writeFileSync("about-links.json", JSON.stringify(links, null, 1));
    // Open every region so axe and the overflow check see all of it
    await page.$$eval("details.newsroom-group", (ds) => ds.forEach((d) => (d.open = true)));
    const o = await overflow(page);
    if (o) return `sideways scrolling on About: ${o}`;
  });
  await axe(page, "about");
  if (ENGINE === "chromium" && !viewport.mobile) writeFileSync("rendered-about.html", await page.content());
  await page.goBack();
  await page.getByLabel("Search articles").waitFor({ timeout: 5000 }).catch(() => {});

  // --- Editor's Picks ---
  await check("Editor's Picks shows picks and dims the date filter", async () => {
    await page.getByRole("button", { name: /Editor's Picks/ }).click();
    await page.waitForURL(/view=picks/, { timeout: 5000 });
    await sleep(800);
    const n = await page.locator(articleSel).count();
    if (!n) return "no picks shown";
    note("picks shown", String(n));
    const disabled = await page.getByRole("button", { name: /^Today$/ }).isDisabled();
    if (!disabled) return "date buttons still active";
  });
  await axe(page, "picks");
  await check("Back from Editor's Picks returns to the feed", async () => {
    await page.goBack();
    await sleep(500);
    if (/view=picks/.test(page.url())) return `still at ${page.url()}`;
    const pressed = await page.getByRole("button", { name: /Editor's Picks/ }).getAttribute("aria-pressed");
    if (pressed === "true") return "Editor's Picks still selected";
  });

  // --- Change town, picker empty state, Escape ---
  await check("Change your town reopens the picker; a nonsense search says so", async () => {
    const sb = page.getByRole("button", { name: /^Sources/ });
    if ((await sb.getAttribute("aria-expanded")) !== "true") await sb.click();
    await page.getByRole("button", { name: /Change your town|Set your town/ }).first().click();
    await picker.waitFor({ timeout: 5000 });
    await page.getByLabel("Search for your town").fill("zzqx");
    if (!(await page.getByText(/Nothing matches that/).count())) return "no message";
    await page.getByRole("button", { name: "Skip" }).click();
    await picker.waitFor({ state: "hidden", timeout: 3000 });
  });

  // --- Keyboard focus visibility (WCAG 2.4.7) ---
  if (!viewport.mobile) {
    await check("every control shows where keyboard focus is (first 40 Tab stops)", async () => {
      await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement?.blur(); });
      await page.mouse.click(2, 2);
      const invisible = new Set();
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press("Tab");
        const r = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          const ring = cs.outlineStyle === "auto" || (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== "none");
          const name = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
          return { ring, name: `${el.tagName.toLowerCase()} "${name}"` };
        });
        if (r && !r.ring) invisible.add(r.name);
      }
      if (invisible.size) return `no focus ring on: ${[...invisible].join(", ")}`;
    });
  }

  // --- Images ---
  await check("story images load (after scrolling the feed)", async () => {
    for (let i = 0; i < 8; i++) { await page.evaluate(() => window.scrollBy(0, 2500)); await sleep(400); }
    await sleep(1500);
    const broken = await page.$$eval("main img", (imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute("src")).map((i) => i.src));
    const total = await page.locator("main img").count();
    note("images", `${total} in the feed, ${broken.length} broken`);
    if (broken.length) return `${broken.length} broken, e.g. ${[...new Set(broken.map((s) => new URL(s).host))].slice(0, 5).join(", ")}`;
  });
  await check("infinite scroll loads more than the first 21 stories, or says all caught up", async () => {
    const n = await page.locator(articleSel).count();
    const caught = await page.getByText(/all caught up/).count();
    if (n <= 21 && !caught) return `${n} stories after scrolling`;
  });

  // --- Dark mode ---
  await page.evaluate(() => window.scrollTo(0, 0));
  await check("Dark mode switches and survives a reload", async () => {
    await page.getByRole("button", { name: /^Dark$/ }).click();
    await sleep(300);
    await page.reload({ waitUntil: "load" });
    await page.locator(articleSel).first().waitFor({ timeout: 30000 });
    const btn = await page.getByRole("button", { name: /^Light$/ }).count();
    if (!btn) return "not dark after reload";
  });
  await axe(page, "feed (dark)");
  await check("Editor's Picks in dark mode", async () => {
    await page.getByRole("button", { name: /Editor's Picks/ }).click();
    await sleep(800);
  });
  await axe(page, "picks (dark)");
  await page.getByRole("button", { name: "Open About" }).click().catch(() => {});
  await sleep(500);
  await axe(page, "about (dark)");
  await page.goBack().catch(() => {});

  // --- Reflow at 320px (WCAG 1.4.10) ---
  const narrow = await context.newPage();
  narrow.on("pageerror", (e) => pageErrors.push(String(e.message).slice(0, 200)));
  await narrow.setViewportSize({ width: 320, height: 700 });
  await check("no sideways scrolling at 320px wide (feed)", async () => {
    const page = narrow;
    await page.goto(BASE + "/", { waitUntil: "load" });
    await page.locator(articleSel).first().waitFor({ timeout: 30000 });
    const sb = page.getByRole("button", { name: /^Sources/ });
    if ((await sb.getAttribute("aria-expanded")) !== "true") await sb.click();
    await sleep(300);
    const o = await overflow(page); if (o) return o;
  });
  await check("no sideways scrolling at 320px wide (About)", async () => {
    const page = narrow;
    await page.goto(BASE + "/?view=about", { waitUntil: "load" });
    await page.locator("#publications").waitFor({ timeout: 10000 });
    const o = await overflow(page); if (o) return o;
  });

  await narrow.close();

  // --- Text spacing (WCAG 1.4.12) ---
  await check("text still fits with WCAG text-spacing overrides", async () => {
    await page.goto(BASE + "/", { waitUntil: "load" });
    await page.locator(articleSel).first().waitFor({ timeout: 30000 });
    await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }" });
    await sleep(300);
    const clipped = await page.evaluate(() => [...document.querySelectorAll("button, h3")].filter((el) => el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== "visible").slice(0, 5).map((el) => (el.textContent || "").trim().slice(0, 30)));
    const o = await overflow(page);
    if (clipped.length || o) return [clipped.length ? `clipped: ${clipped.join(", ")}` : "", o || ""].filter(Boolean).join("; ");
  });

  // --- Deep links ---
  for (const view of ["about", "saved", "picks"]) {
    await check(`opening /?view=${view} directly works`, async () => {
      const p2 = await context.newPage();
      const errs = [];
      p2.on("pageerror", (e) => errs.push(e.message));
      await p2.goto(`${BASE}/?view=${view}`, { waitUntil: "load" });
      await sleep(1500);
      const ok = view === "about" ? await p2.locator("#publications").count()
        : view === "saved" ? await p2.getByRole("button", { name: /Close saved articles/ }).count()
        : await p2.getByRole("button", { name: /Editor's Picks/, pressed: true }).count();
      await p2.close();
      if (errs.length) return `page error: ${errs[0]}`;
      if (!ok) return "view didn't open";
    });
  }

  // --- QR link --- (local only: on the live site every visit counts as a scan)
  if (process.env.TEST_GO === "1") await check("/go/f lands on Newmarket without the picker", async () => {
    const c2 = await browser.newContext(ctxOpts);
    await c2.route("**/_vercel/insights/**", (r) => r.abort());
    const p2 = await c2.newPage();
    await p2.goto(`${BASE}/go/f`, { waitUntil: "load" });
    await sleep(1500);
    const url = p2.url();
    const pickerOpen = await p2.getByRole("dialog", { name: "Choose your town" }).count();
    const town = await p2.evaluate(() => localStorage.getItem("cp_town"));
    await c2.close();
    if (pickerOpen) return `picker opened (url ${url})`;
    if (town !== "newmarket") return `town is ${town}, url ${url}`;
    if (/town=/.test(url)) return `address still shows ${url}`;
  });

  // --- Errors seen along the way ---
  const uniq = (a) => [...new Set(a)];
  await check("no JavaScript errors", async () => { if (pageErrors.length) return uniq(pageErrors).slice(0, 5).join(" | "); });
  await check("no console errors", async () => { if (consoleErrors.length) return uniq(consoleErrors).slice(0, 6).join(" | "); });
  const ownBad = uniq(badResponses).filter((r) => /debrief\.to/.test(r));
  const thirdBad = uniq(badResponses).filter((r) => !/debrief\.to/.test(r));
  await check("no failed responses from debrief.to", async () => { if (ownBad.length) return ownBad.slice(0, 6).join(" | "); });
  if (thirdBad.length) note("failed third-party responses (publisher images etc.)", `${thirdBad.length}: ${thirdBad.slice(0, 6).join(" | ")}`);
  const failed = uniq(failedRequests).filter((f) => !/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(f));
  if (failed.length) note("failed requests", `${failed.length}: ${failed.slice(0, 6).join(" | ")}`);

  await browser.close();
}

const viewports = [
  { name: "phone 390", width: 390, height: 844, mobile: true },
  { name: "desktop 1366", width: 1366, height: 900, mobile: false },
];
for (const v of viewports) {
  try { await scenario(v); } catch (e) { log(false, "scenario crashed", e.message.split("\n")[0]); }
}

if (RUN_AXE) {
  const byRule = new Map();
  for (const { state, violations } of axeResults) {
    for (const v of violations) {
      const r = byRule.get(v.id) || { id: v.id, impact: v.impact, help: v.help, tags: v.tags.filter((t) => /wcag\d|best/.test(t)).join(","), states: [], nodes: [] };
      r.states.push(`${state} (${v.nodes.length})`);
      for (const n of v.nodes.slice(0, 3)) r.nodes.push({ target: n.target.join(" "), html: n.html.slice(0, 160), why: (n.failureSummary || "").replace(/\s+/g, " ").slice(0, 260) });
      byRule.set(v.id, r);
    }
  }
  console.log("\n===== AXE (WCAG 2.2 A/AA + best practice) =====");
  console.log(`states scanned: ${axeResults.map((a) => a.state).join("; ")}`);
  const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  for (const r of [...byRule.values()].sort((a, b) => order[a.impact] - order[b.impact])) {
    console.log(`\n[${r.impact}] ${r.id} — ${r.help} (${r.tags})`);
    console.log(`  states: ${r.states.join("; ")}`);
    const seen = new Set();
    for (const n of r.nodes) { if (seen.has(n.html) || seen.size >= 4) continue; seen.add(n.html); console.log(`  • ${n.target}\n    ${n.html}\n    ${n.why}`); }
  }
  const inc = new Map();
  for (const a of axeResults) for (const i of a.incomplete) inc.set(i.id, (inc.get(i.id) || 0) + i.nodes);
  console.log(`\nneeds-review (axe 'incomplete'): ${[...inc].map(([k, v]) => `${k}×${v}`).join(", ")}`);
}

const fails = results.filter((r) => !r.ok);
console.log(`\n===== ${ENGINE}: ${results.length - fails.length} passed, ${fails.length} failed =====`);
for (const f of fails) console.log(`FAIL [${f.vp}] ${f.name}${f.detail ? " — " + f.detail : ""}`);
process.exit(0);
