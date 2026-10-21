# Yetenbi – Äthiopisches Restaurant & Café

Website for Yetenbi, an Ethiopian restaurant and café at Theaterstraße 6, 97070 Würzburg.
German first. Next.js 16, React 19, Tailwind CSS 4, Motion, Lenis, three.js (React Three Fiber).

Live: https://www.yetenbi-wu.de (every push to `main` deploys automatically on the owner's Vercel).

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in at least DATABASE_URL and ADMIN_SESSION_SECRET
npm run db:setup             # creates or updates the tables and copies the menu in once (safe to repeat)
npm run owner:create -- owner@example.com "long password" "Name"   # first /admin login
npm run dev                  # development, http://localhost:3000
npm run build && npm run start   # production build (use this to judge performance)
npm test                     # unit tests (ordering, booking, opening hours, validation)
npm run format               # format the code with Prettier
```

## Database changes

The tables are defined by numbered files in `db/migrations/` (`0001_initial.sql`, `0002_email_verification.sql`, …).
`npm run db:migrate` applies the ones a database has not had yet (each in one transaction; the table
`schema_migrations` records what ran). For a change, add the next numbered file, run it against staging first, then
against production **before** pushing the code that needs it. Never edit a migration that has already run.

## Staging

Preview deployments (every branch except `main`, and `vercel deploy` without `--prod`) use their own database,
`yetenbi_staging`, in the same Neon project, and their own session secret. They send no emails and have no Google
sign-in or Cloudinary (those variables exist for Production only), so nothing reaches real guests.

- Update the staging database: `DATABASE_URL=<staging url> npm run db:setup`
- Create the test logins there: `DATABASE_URL=<staging url> npm run test:accounts`
- Test a preview: `SITE=https://<preview-url> npm run test:devices` (with Vercel's deployment protection on, add a
  protection-bypass token or test while signed in to Vercel).

## Security headers

`next.config.ts` sends a Content-Security-Policy on every page: scripts, styles and fonts only from the site itself,
images also from Cloudinary, uploads to Cloudinary's API, and no frames at all. If you add a service
that loads anything in the browser (analytics, a booking widget, another map), add its address there or it is blocked.

## Errors

Server errors (pages, actions, API routes) and failed emails are logged and emailed to `ERROR_ALERT_EMAIL` (or the
restaurant inbox), at most once an hour per place (`src/instrumentation.ts`, `src/lib/server/alerts.ts`). The email
holds the place and the message, never guest data, tokens or cookies. Details stay in the Vercel logs.

## Reservations

- Guests book on the page; requests are stored in Neon Postgres (project **yetenbi**, Frankfurt) as *pending*.
- The team signs in at **/login** with an owner account and lands in **/admin**, where they accept or decline each request
  (optionally with a message), enter phone bookings and set closed days.
- Emails (receipt, confirmation with calendar file, decline; plus a notification to the restaurant) are sent once
  `GMAIL_USER`, `GMAIL_APP_PASSWORD` and `RESERVATION_NOTIFY_EMAIL` are set (see `.env.example`).
- Reservations older than 180 days are deleted daily (`/api/cron/cleanup`, Vercel Cron, `CRON_SECRET`).
- Without `DATABASE_URL` the form falls back to a prepared WhatsApp message.

## Online ordering

- **/bestellen**: signed-in guests order for delivery or pickup (ordering needs an account; the basket is kept while
  they sign in or register, and all order emails go to the account's address), as soon as possible or for a later time today; payment in cash
  or by card on handover. The server re-prices every order from the menu.
- Orders are taken while the restaurant is open, until 30 minutes before closing, and not on closed days – unless the
  temporary setting *Bestellungen auch außerhalb der Öffnungszeiten* is on (then at any time, until 23:45).
- Order flow (each step is emailed to the guest, in their language):

  | Step | Who | Where |
  | --- | --- | --- |
  | Accept with ETA, or reject | owner | /admin/bestellungen |
  | *Essen fertig*, then *Verpackt* | kitchen | **/kueche** (food only, no prices or guest details) |
  | *Zur Lieferung übergeben* (choose the driver) or *Abholbereit* | owner | /admin/bestellungen |
  | *Zugestellt* | driver (own deliveries only) | **/lieferung** (address, map link, phone, amount to collect) |
  | *Abgeholt* (pickup) | owner | /admin/bestellungen |

  The team is emailed too: kitchen accounts when an order is accepted, the driver when an order is handed to them,
  and the restaurant (`RESERVATION_NOTIFY_EMAIL`) when the kitchen has packed an order and when a driver has delivered it.
  Owners can press every step themselves (e.g. on days without kitchen or driver accounts). Each button only works
  for the status it was shown for, so two people pressing at once change nothing twice.
  Under *Einstellungen* there: pause ordering, minimum order, delivery fee, free delivery from, delivery postcodes, times.
- Protection against prank and flood orders (`src/lib/server/order-guard.ts`): at most 3 orders per hour per phone
  number (however it is typed) and per device (IP address, stored only as a keyed hash for 30 days), at most 8
  unconfirmed orders at once, and first orders over 150 € only by phone. The board labels first-time and previously
  rejected guests, and *Gast sperren* blocks a guest's phone, email and device (list and unblock at the bottom).
- Guests follow their order live at **/bestellung**; signed-in guests see their orders in the profile.

## Service app (Android, phones and tablets)

Waiters take table orders in the **Yetenbi Service** app (`android/`, Kotlin + Jetpack Compose, German and English).
Phones show one screen at a time; tablets show the bill and the menu side by side.

- Sign-in with a **Service** (or owner) account from /admin/team. On the website, service staff land on **/service**,
  where they download the app.
- **Tische**: the tables drawn from above (chairs, plates for seated guests, the number), free / taken / food ready.
  Tap a free table, choose the number of guests, add dishes (long-press for a wish such as "extra scharf"), *An die
  Küche*. Food appears on **/kueche** as a ticket per table and course; *Fertig* there makes every waiter's phone ring
  ("Tisch 2: Essen fertig"). Drinks go straight onto the bill. *Kassieren*: card or cash (with change), optional tip.
- **Heute**: the day's revenue, cash, card and tips and every bill; owners can reopen a bill paid by mistake.
- The table plan (default: tables 1–4), today's tables and the app versions are in **/admin/service**. The server
  re-prices every dish from the menu; sold-out dishes are greyed out in the app within 30 seconds.
- API: `/api/app/*` with a bearer token (sessions table, kind `app`, 30 days). Tables: `dining_tables`,
  `table_checks`, `table_check_items`, `app_releases` (migration `0003_service_app.sql`).

**Online updates.** `npm run app:release -- --notes "Neu: …"` builds the signed APK, uploads it to Cloudinary and
publishes it. Devices check on start and every 30 minutes, show *Update verfügbar* in the notification bar and install
with one tap (`--mandatory` locks older versions until they update). The signing key is in `~/.android-yetenbi`
(outside the repo): **back it up** – without it, installed apps can't be updated.

Build locally (JDK 17+ and the Android SDK): `cd android && ./gradlew assembleDebug`; against a local server:
`./gradlew installDebug -PapiUrl=http://10.0.2.2:3000`.

## Accounts

- Guests can create an account (email + password; the address must be confirmed with a link before they can order, or **Sign in with Google** once `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET` are set). The profile shows bookings and orders, lets them cancel, change details,
  export their data and delete the account. Password reset works by email.
- **Speisekarte** (/admin/speisekarte): the whole menu lives in the database (tables `menu_categories`, `menu_items`).
  Owners add, edit, reorder and delete categories and dishes (names and descriptions in three languages, price,
  tags, "online orderable", "sold out" switch), plus allergens (A–N), additives, drink volume and deposit, and the
  gluten wording. Every change shows on the website at once (cached menu, refreshed on save). The menu card, the
  order page, the order API and the search-engine data all read it (`src/lib/menu.ts`, `src/lib/server/menu.ts`).
  `npm run db:setup` copies the original menu (`db/menu-seed.mts`) in once, when the tables are empty.
- **Fotos** (/admin/fotos): owners replace any picture on the website with their own photo. The browser uploads it
  straight to Cloudinary with a one-time signature from the server (so big phone photos work), the server checks it
  arrived in the `yetenbi/` folder and the home page refreshes. Needs `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET`; without them the built-in pictures stay.
- **Team** (/admin/team): owners create logins for service staff, kitchen staff, drivers and other owners (email + starting password),
  change roles, set a new password or remove someone (they keep a plain guest account). After signing in at /login,
  everyone lands on their own screen: owners /admin, service /service (the app download), kitchen /kueche, drivers /lieferung.
- Limits against abuse (`src/lib/server/rate-limit.ts`): 10 wrong passwords per account or 30 per connection in
  15 minutes, then a 15-minute pause; 3 reset emails per address and hour; 5 sign-ups and 6 reservations per
  connection and hour. Signing in with Google takes over an account with the same email only if that account never
  proved its address (otherwise someone could pre-register a guest's email); its old password is then removed.
- Booking emails contain a signed cancel link (**/stornieren**), so guests can cancel without an account.

Languages: German, English and Amharic (switch in the navigation); text lives in `src/lib/i18n/` (`de.ts`, `en.ts`, `am.ts`; German defines the keys); the menu (three languages) is edited in /admin → Speisekarte.

## What's on the page

| Section | What it is |
| --- | --- |
| Intro | Automatic three.js particle story: coffee galaxy → bean → jebena → YETENBI → burst (skippable). |
| Hero | Photo with a field of Aksum stelae drawn in line art, windows lit one storey at a time. |
| Willkommen | One sentence that lights up word by word, with photos set into the type. |
| Die Platte | Pinned section: an injera platter on a woven mesob rim turns as you scroll and presents each dish. |
| Speisekarte | The full menu as an illuminated-manuscript card (harag head, tibeb hem, Aksumite frame). |
| Drei Runden | Coffee ceremony in its three rounds (Abol, Tona, Baraka); a sini cup fills once per round. |
| Sprichwort / Gut zu wissen / Amharisch | Proverb band, practical facts, a few Amharic phrases with a live fidel chart. |
| Anfahrt | Address, map, and today's date and hour in Addis Ababa (Ethiopian calendar and clock). |
| Reservierung | Request form with a live ticket; stored in the database and handled by the team in /admin. |
| Speisekarte → Online bestellen | Links to /bestellen (also in the navigation). |

Background: a fixed lattice after Ethiopian cross-stitch, with clay oil lamps (three.js flames) in a
diagonal rhythm. A small Aksum stela on the right edge lights up as you move down the page.

## Where things live

- `src/lib/data.ts` – restaurant details (address, phone, map).
- `src/lib/menu.ts` / `src/lib/server/menu.ts` – the menu from the database, allergens and additives, editing.
- `src/lib/hours.ts` – opening hours (used everywhere, incl. search-engine data).
- `src/lib/booking.ts` – booking rules shared by form, API and admin.
- `src/lib/ordering.ts` – ordering rules, default order settings (the owner overrides them in /admin) and who may make which step (`canMove`).
- `src/lib/server/order-flow.ts` – moves an order one step and sends the emails; used by /admin, /kueche and /lieferung.
- `src/lib/server/` – database, reservations, orders, accounts and sessions, Google sign-in.
- `src/lib/server/email/` – every email the site sends: `send.ts` (mail server), `html.ts` (layout and building
  blocks), `texts.ts` (guest wording in three languages), `reservation-emails.ts`, `order-emails.ts`.
- `src/lib/ethiopic.ts` – Ethiopian calendar, Addis clock and Ge'ez numerals.
- `src/components/heritage/` – Aksum stela, Lalibela cross, Aksumite frame, tibeb/harag bands.
- `src/components/three/` – intro particles, 3D jebena, background clay lamps.
- `src/components/sections/` – the page sections.
- `public/map-tiles/` – the map in "Anfahrt", served from our own server (no consent needed). The area is in
  `src/lib/map-area.mjs`; `node scripts/build-map.mjs` downloads the tiles from OpenStreetMap again after a change.
- `public/img/` – photos; `ambient/` and `dish/` are small pre-blurred / pre-cropped copies.

## Testing

`npm test` runs the unit tests in `tests/unit/` (Vitest): order prices and time windows, which role may move an order
which step, booking slots and validation, opening hours, email and redirect checks. They need no database.

Every push runs types, lint, formatting and the unit tests on GitHub (`.github/workflows/checks.yml`).

`npm audit` shows one known warning ("high", counted five times): `braces` via Next's ESLint plugin
(`eslint-config-next` → `fast-glob` → `micromatch` → `braces`). No fixed version exists yet; it only affects lint runs on
our own config, never the website (`npm audit --omit=dev` is clean). It goes away when Next updates its plugin.


`npm run test:devices` tests the live site on emulated devices: iPhone 14 and iPad Pro 11 on WebKit (Safari's engine),
Pixel 7 and a 1440 px desktop on Chromium. It checks the public pages, the menu card, languages, accessibility (axe),
then runs a whole order through every role (guest → admin → kitchen → driver) and a reservation.

- One-time setup: `npx playwright install chromium webkit`, and the `TEST_*` logins in `.env.local` (see `.env.example`).
- `HEADED=1` shows the browser windows; `ONLY=public` or `ONLY=flow` runs one part; `SITE=…` tests another address.
- The order flow places real test orders named "Suite Test …", so their emails arrive. It deletes them at the end, and
  if ordering outside opening hours is off, it switches it on for the run and back off afterwards.
- Results and screenshots go to `test-results/devices/`.

## Deploying

The GitHub repository is connected to Vercel: every push to `main` goes live automatically. `vercel --prod` still works
for a manual deploy.

## Still to do

- Create the team's logins in /admin → Team (kitchen staff and drivers), then run one test order through every step
  (accept → Küche: Essen fertig, Verpackt → hand to a driver → Lieferung: Zugestellt) and check the emails arrive.
- Google sign-in: if the OAuth consent screen in Google Cloud is still in "Testing", publish it so every guest can use it.
- Impressum and Datenschutz: fill in the owner's name, a contact email (required in the Impressum) and the VAT ID,
  if any – marked `[Name wird ergänzt]` / `[wird ergänzt]`.
- **Allergens (LMIV/LMIDV):** enter the 14 allergens and the additives for every dish in /admin → Speisekarte (needs the
  kitchen's recipes, including sauces, spice mixes and injera); then update section 7 of /bestellbedingungen.
- In the same place: drink volumes and deposit (Pfand) for bottles and cans, and the gluten wording per dish
  ("glutenfrei" only below 20 mg/kg including traces).
- Pick the reusable-packaging notice in /admin → Bestellungen → Einstellungen (VerpackG §§ 33, 34) and register
  in the LUCID packaging register before handing out takeaway packaging.
- Online orders are deleted after 180 days. Make sure every order is booked in the till (KassenSichV), which keeps
  the records for the tax office; otherwise keep them longer (§ 147 AO).
- Have the legal pages (Impressum, Datenschutz, Bestellbedingungen) checked by a lawyer or a service such as the
  IHK / Händlerbund before relying on them.
- Confirm the ordering settings (minimum order, delivery fee, postcodes, times) in /admin → Bestellungen → Einstellungen.
- **Datenschutz (DSGVO):**
  - Move email off the personal `@gmail.com` account (no data processing agreement is possible for it): Google
    Workspace, or an EU provider via `SMTP_HOST`/`SMTP_PORT`, plus `MAIL_PROVIDER` (the provider's name, which
    /datenschutz then shows instead of Gmail; redeploy afterwards).
  - Sign the data processing agreements (AVV) with Vercel, Neon and Cloudinary. Check that Vercel and Google are still
    listed at dataprivacyframework.gov, as the policy says.
  - The policy promises that order and booking emails are deleted from the team's mailboxes (restaurant, kitchen,
    drivers) within 180 days. Set up a routine for that and tell the team.
  - Complete and keep up to date the record of processing activities (Art. 30), drafted in
    `docs/verarbeitungsverzeichnis.md` (fill in the marked places). Give new staff the notice at /datenschutz/team.
  - Fill in the owner's name and contact email in /admin; the privacy policy shows them too.
- Photos are Unsplash stock: set the Cloudinary variables in Vercel, then upload Yetenbi's own in /admin → Fotos.
- Amharic text should be checked by a native speaker (including the new order-step emails and status labels).
