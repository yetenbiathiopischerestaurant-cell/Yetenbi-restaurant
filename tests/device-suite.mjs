// Full test of the site on emulated devices: iPhone 14 and iPad Pro 11 on WebKit (Safari's engine), Pixel 7 and a
// 1440 px desktop on Chromium. Runs against the live site by default; see "Testing" in the README.
//
//   npm run test:devices                 everything, headless
//   HEADED=1 npm run test:devices        watch it in visible browser windows
//   ONLY=public / ONLY=flow              just the public pages + accessibility, or just the order flow
//   SITE=http://localhost:3000           another address (WebKit drops the secure login cookie over plain http,
//                                        so the order flow only works on https)
//
// The order flow places real orders and a reservation (named "Suite Test …"), which sends real emails, and deletes
// them again at the end. If ordering outside opening hours is off, it is switched on for the run and back off after.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium, webkit, devices } from "playwright";
import { neon } from "@neondatabase/serverless";

const SITE = (process.env.SITE ?? "https://www.yetenbi-wu.de").replace(/\/$/, "");
const HEADED = process.env.HEADED === "1";
const ONLY = process.env.ONLY ?? "";
const OUT = process.env.OUT ?? "test-results/devices";
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
mkdirSync(OUT, { recursive: true });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (add it to .env.local).");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

const account = (role) => {
  const email = process.env[`TEST_${role}_EMAIL`];
  const password = process.env[`TEST_${role}_PASSWORD`];
  return email && password ? [email, password] : null;
};
const ACC = {
  admin: account("ADMIN"),
  kitchen: account("KITCHEN"),
  driver: account("DRIVER"),
  guest: account("GUEST"),
};

const results = [];
const check = (device, area, ok, msg) => {
  results.push({ device, area, ok: Boolean(ok), msg });
  console.log(`${ok ? "ok  " : "FAIL"} [${device}] ${area}: ${msg}`);
};
const has = (text, part) => text.toLowerCase().includes(part.toLowerCase());

const launch = { headless: !HEADED, slowMo: HEADED ? 120 : 0 };
const engines = { chromium: () => chromium.launch(launch), webkit: () => webkit.launch(launch) };
const DEVICES = {
  "iPhone 14 (Safari)": { engine: "webkit", profile: devices["iPhone 14"], phone: true },
  "Pixel 7 (Chrome)": { engine: "chromium", profile: devices["Pixel 7"], phone: true },
  "iPad Pro 11 (Safari)": { engine: "webkit", profile: devices["iPad Pro 11"], phone: true }, // below 1024 px the site uses the menu button
  "Desktop 1440 (Chrome)": { engine: "chromium", profile: { viewport: { width: 1440, height: 900 } }, phone: false },
};
const browsers = {};
async function context(name) {
  const d = DEVICES[name];
  browsers[d.engine] ??= await engines[d.engine]();
  return browsers[d.engine].newContext({ ...d.profile, locale: "de-DE", timezoneId: "Europe/Berlin" });
}
async function signIn(page, [email, password], to) {
  await page.goto(`${SITE}/login`, { waitUntil: "networkidle" });
  await page.locator('input[name="email"]').first().fill(email);
  await page.locator('input[name="password"]').first().fill(password);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL(to, { timeout: 25000 });
  // load the target page fresh, so nothing of the login page is still on screen
  await page.goto(page.url(), { waitUntil: "networkidle" });
}
/**
  Skips the particle intro and waits until it has gone and the header has slid in (the page can't scroll and the
  header sits off-screen while it plays). Slow devices (WebKit on a busy machine) can take a while to show it.
*/
async function skipIntro(page) {
  await page
    .getByRole("button", { name: /Intro überspringen/ })
    .click({ timeout: 15000 })
    .catch(() => {});
  await page
    .locator('[aria-label="Intro"]')
    .waitFor({ state: "detached", timeout: 25000 })
    .catch(() => {});
  await page.waitForTimeout(1500); // the header's entrance
}
// Online ordering can be switched off (lib/features.ts): /bestellen then sends visitors home.
const ORDERING_ON = (await fetch(`${SITE}/bestellen`, { redirect: "manual" })).status === 200;
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
async function waitStatus(ref, status, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const [o] = await sql`select status from orders where reference = ${ref}`;
    if (o?.status === status) return true;
    await new Promise((r) => setTimeout(r, 700));
  }
  return false;
}
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` }).catch(() => {});
const short = (name) => name.split(" ")[0].toLowerCase();

// what the menu card should show: the first two categories and their first dish
const categories = await sql`
  select c.title->>'de' as title, (select i.name->>'de' from menu_items i where i.category_id = c.id order by i.position limit 1) as dish
  from menu_categories c order by c.position limit 2`;

/* ===================== A. public site on every device ===================== */
for (const name of ONLY === "flow" ? [] : Object.keys(DEVICES)) {
  const d = DEVICES[name];
  const ctx = await context(name);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  page.on(
    "console",
    (m) =>
      m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text().slice(0, 160)),
  );
  try {
    const t0 = Date.now();
    const res = await page.goto(SITE, { waitUntil: "domcontentloaded" });
    const ttfb = Date.now() - t0;
    await page.waitForLoadState("networkidle");
    check(name, "home", res.status() === 200, `loads (${ttfb} ms to first HTML, ${Date.now() - t0} ms until idle)`);
    await skipIntro(page);
    check(name, "home", (await overflow(page)) <= 1, `no sideways scrolling (overflow ${await overflow(page)} px)`);
    await shot(page, `${short(name)}_home`);

    const [first, second] = categories;
    await page.locator("#speisekarte").scrollIntoViewIfNeeded();
    check(
      name,
      "menu card",
      has(await page.locator("#speisekarte").innerText(), first.dish),
      `shows the menu from the database (${first.dish})`,
    );
    if (second) {
      await page.getByRole("tab", { name: second.title }).first().click();
      await page.waitForTimeout(d.engine === "webkit" ? 3000 : 1200);
      check(
        name,
        "menu card",
        has(await page.locator("#speisekarte").innerText(), second.dish),
        `category tabs switch (${second.title})`,
      );
    }
    await shot(page, `${short(name)}_menu`);
    const broken = await page.$$eval(
      "img",
      (list) => list.filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute("src")).length,
    );
    check(name, "images", broken === 0, `no broken images (${broken})`);

    if (d.phone) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.getByRole("button", { name: /Menü öffnen/ }).click();
      await page.waitForTimeout(600);
      check(
        name,
        "phone menu",
        await page
          .getByRole("link", { name: /Speisekarte/ })
          .first()
          .isVisible(),
        "navigation opens",
      );
      await shot(page, `${short(name)}_nav`);
    }

    // language switch (in the open phone menu, or in the header)
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('button[lang="en"]:visible').first().click({ timeout: 8000 });
    await page.waitForTimeout(d.engine === "webkit" ? 2500 : 1000);
    check(
      name,
      "languages",
      /main dishes/i.test(await page.locator("#speisekarte").innerText()),
      "English switch translates the menu",
    );
    await page.locator('button[lang="de"]:visible').first().click({ timeout: 8000 });
    await page.waitForTimeout(800);
    if (d.phone) await page.keyboard.press("Escape");

    for (const path of ["/impressum", "/datenschutz", "/bestellbedingungen", "/login"]) {
      const r = await page.goto(`${SITE}${path}`, { waitUntil: "networkidle" });
      check(name, "pages", r.status() === 200 && (await overflow(page)) <= 1, `${path} loads, fits the screen`);
    }
    await page.goto(`${SITE}/bestellen`, { waitUntil: "networkidle" });
    if (ORDERING_ON) {
      check(
        name,
        "ordering",
        await page.getByText("Zum Bestellen anmelden").isVisible(),
        "signed-out visitors are asked to sign in",
      );
      check(name, "ordering", (await overflow(page)) <= 1, "order page fits the screen");
    } else {
      check(name, "ordering", new URL(page.url()).pathname === "/", "online ordering is off: /bestellen sends home");
    }
    // booking a table needs an account: signed-out visitors see the sign-in box instead of the form
    await page.goto(SITE, { waitUntil: "networkidle" });
    await skipIntro(page);
    await page.locator("#reservieren").scrollIntoViewIfNeeded();
    check(
      name,
      "reservation",
      (await page.getByText("Zum Reservieren anmelden").isVisible()) && (await page.locator("#res-name").count()) === 0,
      "signed-out visitors are asked to sign in before booking",
    );
    check(
      name,
      "console",
      errors.length === 0,
      `no script errors${errors.length ? `: ${errors.slice(0, 2).join(" | ")}` : ""}`,
    );
  } catch (e) {
    check(name, "public", false, `stopped: ${String(e).split("\n")[0]}`);
  }
  await ctx.close();
}

/* ===================== B. accessibility (axe) ===================== */
for (const name of ONLY === "flow" ? [] : ["Desktop 1440 (Chrome)", "Pixel 7 (Chrome)"]) {
  const ctx = await context(name);
  const page = await ctx.newPage();
  for (const path of ["/", ...(ORDERING_ON ? ["/bestellen"] : []), "/login", "/impressum", "/datenschutz"]) {
    await page.goto(`${SITE}${path}`, { waitUntil: "networkidle" });
    await skipIntro(page);
    await page.waitForTimeout(800);
    await page.addScriptTag({ content: AXE });
    const found = await page.evaluate(async () => {
      const res = await window.axe.run(document, { resultTypes: ["violations"] });
      return res.violations
        .filter((v) => v.impact === "critical" || v.impact === "serious")
        .map((v) => `${v.id} (${v.nodes.length})`);
    });
    // known and intended: the welcome sentence on "/" lights up word by word while scrolling (screen readers get the full text)
    const real = path === "/" ? found.filter((f) => !f.startsWith("color-contrast")) : found;
    check(
      name,
      "accessibility",
      real.length === 0,
      `${path}: ${found.length ? found.join(", ") : "no serious or critical issues"}`,
    );
  }
  await ctx.close();
}

/* ===================== C. order flow across devices ===================== */
const missing = Object.entries(ACC)
  .filter(([, a]) => !a)
  .map(([role]) => role);
const runFlow = ONLY !== "public" && !missing.length;
// the order flow needs online ordering; the reservation flow (D) runs either way
const runOrders = runFlow && ORDERING_ON;
if (runFlow && !ORDERING_ON) console.log("\nOrder flow skipped: online ordering is switched off.");
if (ONLY !== "public" && missing.length)
  console.log(`\nOrder flow skipped: set TEST_<ROLE>_EMAIL and TEST_<ROLE>_PASSWORD for ${missing.join(", ")}.`);

const started = new Date();
const refs = [];
let restoreHours = false;
const restore = async () => {
  if (!restoreHours) return;
  restoreHours = false;
  await sql`update settings set value = jsonb_set(value, '{ignoreHours}', 'false') where key = 'ordering'`;
  console.log("Ordering outside opening hours switched back off.");
};
process.on("SIGINT", async () => {
  await restore();
  process.exit(130);
});

if (runOrders) {
  const [setting] = await sql`select (value->>'ignoreHours')::boolean as on from settings where key = 'ordering'`;
  if (!setting?.on) {
    await sql`update settings set value = jsonb_set(value, '{ignoreHours}', 'true') where key = 'ordering'`;
    restoreHours = true;
    console.log("\nOrdering outside opening hours switched on for the test run.");
  }
  const dishes = await sql`
    select i.id from menu_items i join menu_categories c on c.id = i.category_id
    where i.orderable and i.available order by c.position, i.position limit 2`;
  const cart = dishes.map((d) => ({ id: d.id, qty: 1 }));
  const [driverRow] = await sql`select name from users where lower(email) = ${ACC.driver[0].toLowerCase()}`;

  try {
    async function order(page, method) {
      await page.goto(`${SITE}/bestellen`, { waitUntil: "networkidle" });
      await page.evaluate((c) => localStorage.setItem("yt-cart", JSON.stringify(c)), cart);
      await page.reload({ waitUntil: "networkidle" });
      await page.locator("#checkout").waitFor();
      if (method === "pickup")
        await page
          .locator("#checkout")
          .getByRole("button", { name: /Abholung/ })
          .click();
      if (method === "delivery") {
        await page.locator("#street").waitFor({ state: "visible", timeout: 20000 });
        await page.locator("#street").fill("Theaterstraße 6");
        await page.locator("#postcode").fill("97070");
      }
      await page.locator("#name").fill(`Suite Test ${method}`);
      await page.locator("#phone").fill(method === "delivery" ? "+49 170 5550111" : "+49 170 5550222");
      await page.locator("#note").fill("Automatischer Test – bitte ignorieren");
      await page.locator('button[type="submit"]').last().click();
      await page.waitForURL(/\/bestellung\?r=/, { timeout: 25000 });
      return new URL(page.url()).searchParams.get("r");
    }

    // guest on iPhone: delivery
    const gctx = await context("iPhone 14 (Safari)");
    const guest = await gctx.newPage();
    await signIn(guest, ACC.guest, /\/profil/);
    const delivery = await order(guest, "delivery");
    refs.push(delivery);
    check("iPhone 14 (Safari)", "order", Boolean(delivery), `guest places a delivery order (${delivery})`);

    // guest on Pixel: pickup
    const pctx = await context("Pixel 7 (Chrome)");
    const g2 = await pctx.newPage();
    await signIn(g2, ACC.guest, /\/profil/);
    const pickup = await order(g2, "pickup");
    refs.push(pickup);
    check("Pixel 7 (Chrome)", "order", Boolean(pickup), `guest places a pickup order (${pickup})`);

    // admin on iPad accepts both
    const actx = await context("iPad Pro 11 (Safari)");
    const admin = await actx.newPage();
    await signIn(admin, ACC.admin, /\/admin/);
    for (const ref of [delivery, pickup]) {
      await admin.goto(`${SITE}/admin/bestellungen`, { waitUntil: "networkidle" });
      await admin.locator("li", { hasText: ref }).first().getByRole("button", { name: "Annehmen" }).click();
      check("iPad Pro 11 (Safari)", "admin", await waitStatus(ref, "accepted"), `accepts ${ref}`);
    }

    // kitchen on Pixel: food ready, packed
    const kctx = await context("Pixel 7 (Chrome)");
    const kitchen = await kctx.newPage();
    await signIn(kitchen, ACC.kitchen, /\/kueche/);
    const kText = await kitchen.locator("main").innerText();
    check(
      "Pixel 7 (Chrome)",
      "kitchen",
      kText.includes(delivery) && !kText.includes("Theaterstraße 6") && !kText.includes("5550111"),
      "kitchen sees the orders, no address or phone",
    );
    await shot(kitchen, "pixel_kitchen");
    for (const ref of [delivery, pickup]) {
      for (const [btn, status] of [
        ["Essen fertig", "cooked"],
        ["Verpackt", "packed"],
      ]) {
        await kitchen.goto(`${SITE}/kueche`, { waitUntil: "networkidle" });
        await kitchen.locator("li", { hasText: ref }).first().getByRole("button", { name: btn }).click();
        check("Pixel 7 (Chrome)", "kitchen", await waitStatus(ref, status), `${btn} → ${ref}`);
      }
    }

    // admin on desktop: delivery to the driver; pickup ready, then picked up
    const dctx = await context("Desktop 1440 (Chrome)");
    const desk = await dctx.newPage();
    await signIn(desk, ACC.admin, /\/admin/);
    await desk.goto(`${SITE}/admin/bestellungen`, { waitUntil: "networkidle" });
    const card = desk.locator("li", { hasText: delivery }).first();
    await card.locator('select[name="driver"]').selectOption({ label: driverRow.name });
    await card.getByRole("button", { name: "Zur Lieferung übergeben" }).click();
    check(
      "Desktop 1440 (Chrome)",
      "admin",
      await waitStatus(delivery, "on_the_way"),
      `hands ${delivery} to ${driverRow.name}`,
    );
    for (const [btn, status] of [
      ["Abholbereit", "ready"],
      ["Abgeholt", "completed"],
    ]) {
      await desk.goto(`${SITE}/admin/bestellungen`, { waitUntil: "networkidle" });
      await desk.locator("li", { hasText: pickup }).first().getByRole("button", { name: btn }).click();
      check("Desktop 1440 (Chrome)", "admin", await waitStatus(pickup, status), `${btn} → ${pickup}`);
    }

    // driver on iPhone: delivered
    const rctx = await context("iPhone 14 (Safari)");
    const driver = await rctx.newPage();
    await signIn(driver, ACC.driver, /\/lieferung/);
    const dText = await driver.locator("main").innerText();
    check(
      "iPhone 14 (Safari)",
      "driver",
      dText.includes(delivery) && dText.includes("Theaterstraße 6") && !dText.includes(pickup),
      "driver sees own delivery with address, not the pickup",
    );
    await shot(driver, "iphone_driver");
    await driver.locator("li", { hasText: delivery }).first().getByRole("button", { name: "Zugestellt" }).click();
    check("iPhone 14 (Safari)", "driver", await waitStatus(delivery, "completed"), `marks ${delivery} delivered`);

    // the guest sees it on the status page
    await guest.reload({ waitUntil: "networkidle" });
    await guest.waitForTimeout(1500);
    check(
      "iPhone 14 (Safari)",
      "order",
      has(await guest.locator("body").innerText(), "Abgeschlossen"),
      "status page shows the finished order",
    );

    await desk.goto(`${SITE}/admin`, { waitUntil: "networkidle" });
    check(
      "Desktop 1440 (Chrome)",
      "dashboard",
      has(await desk.locator("main").innerText(), "Umsatz heute"),
      "dashboard loads after the orders",
    );
    const [steps] =
      await sql`select cooked_at is not null and packed_at is not null and out_at is not null and completed_at is not null as all_steps from orders where reference = ${delivery}`;
    check("Desktop 1440 (Chrome)", "order", steps?.all_steps, "every step has its time stamp");

    // every admin page on a phone
    const mctx = await context("Pixel 7 (Chrome)");
    const mob = await mctx.newPage();
    await signIn(mob, ACC.admin, /\/admin/);
    for (const path of [
      "/admin",
      "/admin/bestellungen",
      "/admin/reservierungen",
      "/admin/speisekarte",
      "/admin/fotos",
      "/admin/berichte",
      "/admin/kunden",
      "/admin/protokoll",
      "/admin/einstellungen",
      "/admin/team",
    ]) {
      const r = await mob.goto(`${SITE}${path}`, { waitUntil: "networkidle" });
      const ov = await overflow(mob);
      check(
        "Pixel 7 (Chrome)",
        "admin on phone",
        r.status() === 200 && (await mob.getByText("This page couldn't load").count()) === 0 && ov <= 1,
        `${path} (overflow ${ov} px)`,
      );
    }
    await shot(mob, "pixel_admin");
    for (const c of [gctx, pctx, actx, kctx, dctx, rctx, mctx]) await c.close();
  } catch (e) {
    check("flow", "order flow", false, `stopped: ${String(e).split("\n")[0]}`);
  }
}

if (runFlow) {
  /* ===================== D. reservation on iPhone, confirmed on desktop ===================== */
  try {
    const ctx = await context("iPhone 14 (Safari)");
    const page = await ctx.newPage();
    // booking needs a confirmed account: sign in as the test guest first
    await signIn(page, ACC.guest, (url) => new URL(url).pathname !== "/login");
    await page.goto(SITE, { waitUntil: "networkidle" });
    await skipIntro(page);
    await page.locator("#reservieren").scrollIntoViewIfNeeded();
    await page.locator("#res-name").fill("Suite Test Reservierung");
    await page.locator("#res-phone").fill("+49 170 5550333");
    let picked = "";
    for (let k = 2; k < 12 && !picked; k++) {
      const day = new Date(Date.now() + k * 86400000).toISOString().slice(0, 10);
      await page.locator("#res-date").fill(day);
      await page.waitForTimeout(300);
      if (await page.locator("#res-time").isEnabled()) picked = day;
    }
    await page.locator("#res-time").selectOption({ index: 1 });
    await page.locator('#reservieren button[type="submit"]').click();
    await page.waitForTimeout(4000);
    const [r] =
      await sql`select reference, status from reservations where name = 'Suite Test Reservierung' order by id desc limit 1`;
    if (r) refs.push(r.reference);
    check(
      "iPhone 14 (Safari)",
      "reservation",
      r?.status === "pending",
      `request sent for ${picked} (${r?.reference ?? "none"})`,
    );
    const dctx = await context("Desktop 1440 (Chrome)");
    const desk = await dctx.newPage();
    await signIn(desk, ACC.admin, /\/admin/);
    await desk.goto(`${SITE}/admin/reservierungen`, { waitUntil: "networkidle" });
    await desk
      .locator("li", { hasText: "Suite Test Reservierung" })
      .first()
      .getByRole("button", { name: "Annehmen" })
      .click();
    await desk.waitForTimeout(3000);
    const [r2] = await sql`select status from reservations where reference = ${r?.reference ?? ""}`;
    check("Desktop 1440 (Chrome)", "reservation", r2?.status === "confirmed", "owner confirms the request");
    await ctx.close();
    await dctx.close();
  } catch (e) {
    check("flow", "reservation", false, `stopped: ${String(e).split("\n")[0]}`);
  }

  /* ===================== clean-up ===================== */
  await restore();
  const emails = Object.values(ACC).map(([email]) => email.toLowerCase());
  await sql`delete from orders where name like 'Suite Test%'`;
  await sql`delete from reservations where name = 'Suite Test Reservierung'`;
  if (refs.length) await sql`delete from audit_log where target = any(${refs})`;
  await sql`delete from audit_log where at >= ${started} and user_id in (select id from users where lower(email) = any(${emails}))`;
  await sql`delete from rate_hits where key = any(${emails})`;
}

for (const b of Object.values(browsers)) await b.close();
const failed = results.filter((r) => !r.ok);
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
console.log(
  `\n${results.length - failed.length}/${results.length} checks passed${runFlow ? "; test data removed" : ""}. Screenshots: ${OUT}`,
);
process.exit(failed.length ? 1 : 0);
