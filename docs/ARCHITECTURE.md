# Architecture

How the Yetenbi website and the service app fit together, and the rules the code follows. For setup, commands and
the to-do list see the [README](../README.md).

## The pieces

```
 Guests (browser)        Team (browser)              Waiters (Android app)
   /  /login /profil       /admin /kueche /lieferung    tables, rounds, bills
        │                        │                            │
        │ cookie session         │ cookie session             │ bearer token
        ▼                        ▼                            ▼
 ┌───────────────────────── Next.js 16 on Vercel (functions in Frankfurt, fra1) ─────────────────────────┐
 │ pages (React Server Components)  ·  server actions (forms)  ·  route handlers (/api/…, /api/app/…)    │
 │ src/lib/server/*  ← every database query, email and external call lives here ("server-only")         │
 └──────────────┬──────────────────────┬───────────────────────┬───────────────────────┬────────────────┘
                ▼                      ▼                       ▼                       ▼
        Neon Postgres           Gmail (SMTP)            Cloudinary              Google OAuth
        (Frankfurt)             outgoing email          owner's photos,          "Sign in with Google"
                                                        proxied via /foto
```

- **One Next.js app** serves the public site, the team screens and the JSON API the Android app uses. There is no
  separate backend.
- **The Android app** (`android/`, Kotlin) only talks to `/api/app/*`. Releases are APKs on GitHub Releases; the app
  learns about them from `/api/app/version` (`scripts/release-app.mjs` builds, uploads and records a release).
- **Vercel Cron** calls `/api/cron/cleanup` every night at 04:00 for the retention rules (see "Data lifetime").

## Code layout rules

| Layer | Where | Rule |
| --- | --- | --- |
| Pure rules | `src/lib/*.ts` (`booking.ts`, `ordering.ts`, `hours.ts`, `service.ts`, `validate.ts`) | No I/O. Shared by browser and server, covered by the unit tests. |
| Server logic | `src/lib/server/*.ts` | Starts with `import "server-only"`. The only place that touches the database, email, Cloudinary or Google. |
| Entry points | `src/app/**/route.ts`, `"use server"` files, `page.tsx` | Check who is calling **first**, then call `lib/server`. Keep them thin. |
| UI | `src/components/*`, `src/app/**/*View.tsx` | Client components get data as props or from `/api/me`; they never hold secrets. |

SQL is always written with Neon's tagged template (`` db()`… ${value}` ``), which sends values as parameters, so there
is no string-built SQL anywhere. Keep it that way.

## Who may do what

Roles (`src/lib/roles.ts`): `guest`, `owner`, `kitchen`, `driver`, `service`.

| Entry point | Check | Helper |
| --- | --- | --- |
| Owner pages and actions (`/admin/*`) | owner only | `requireOwner()` |
| Kitchen (`/kueche`), deliveries (`/lieferung`) | their role or owner | `requireRole([...])` |
| Guest actions (profile, cancel own booking) | signed in, own records only (`where user_id = me.id`) | `requireUser()` |
| Book a table, place an order | signed in **and** email confirmed | `getCurrentUser()` + `emailVerified` in the route |
| App API (`/api/app/*`) | bearer token of a `service` or `owner` account | `appRoute()` |
| Cron | `Authorization: Bearer $CRON_SECRET`, compared in constant time | in the route |
| Links from emails (cancel, order status, QR bill) | an unguessable token or an HMAC signature in the link | `cancel-token.ts`, `findOrder`, `checkByReceipt` |

Order steps are checked once more in `canMove()` (`src/lib/ordering.ts`); drivers can only complete their own deliveries.

## Sign-in and sessions

- **Website:** a random 32-byte token in the `yt_session` cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, 30 days). Only
  its SHA-256 is stored (`sessions`, kind `web`). Password change, reset, role change and account deletion end all
  sessions.
- **Passwords:** scrypt with a random salt. Unknown emails take the same time to check (dummy hash).
- **Google:** OAuth with `state` and PKCE in a 10-minute cookie. An existing account with the same address is linked only
  through Google's verified email; if that account had never confirmed its address, its password and sessions are
  removed first (stops "pre-hijacking").
- **App:** bearer token `ytapp_…` (kind `app`, 30 days, hash only). Google in the app uses a one-time code bound to a
  PKCE challenge. Staff switch on a shared phone with a 4–6 digit PIN (scrypt hash), limited to 5 wrong tries per 15
  minutes and 10 per day per person.
- **Attempt limits** (`rate-limit.ts`) count per email and per keyed hash of the IP (`x-real-ip`, set by Vercel). Rows
  live one day.

## Browser security

- `next.config.ts` sets the Content-Security-Policy and the other security headers for every page. Scripts, styles,
  fonts and images come from the site itself only; nothing may frame the site.
- Owner photos are served through `/foto/<cloud>/…`, a rewrite to Cloudinary limited to the configured account, so
  visitors' browsers never contact Cloudinary.
- No analytics, ads or third-party scripts. Fonts and map tiles are self-hosted.
- Server actions are protected against cross-site posts by Next.js (origin check); the JSON routes rely on the
  `SameSite=Lax` cookie.
- Text exported to Excel is neutralised against formulas (`csvCell` in `reports.ts`).

## Caching

Next.js 16 with `cacheComponents`. Data that rarely changes (menu, business settings, photos) is cached with
`"use cache"` and a tag, and the admin actions call `updateTag`/`revalidateTag` after saving. Anything that reads the
session cookie renders per request. Signed-out visitors of team pages get the page shell and an immediate redirect to
`/login`; the shell holds no data.

## Data lifetime

Nightly cleanup (`/api/cron/cleanup`):

| Data | Deleted after |
| --- | --- |
| Reservations, online orders | 180 days |
| App feedback, crash reports | 90 days |
| Paid or voided table bills (with items and payments) | 10 years (§ 147 AO) |
| Team log | 1 year |
| Order blocks | 1 year |
| IP hash on orders | 30 days |
| Attempt counters | 1 day |
| Expired sessions, reset and confirmation links | when they expire |

The privacy texts (`/datenschutz`, `/datenschutz/team`) and `docs/verarbeitungsverzeichnis.md` must match this table.
Change all three together.

## Feature switches

`src/lib/features.ts`: `ONLINE_ORDERING` (off: `/bestellen` redirects home, `/api/order` refuses), `APP_LOGIN` (off:
the app signs in as a shared demo account), `APP_FEEDBACK`. Change the switch and deploy; the app needs no update.

## Environments

| | Production | Preview / staging | Your computer |
| --- | --- | --- | --- |
| Database | owner's Neon (Frankfurt) | `yetenbi_staging` | **whatever `.env.local` says** |
| Emails, Google, Cloudinary | on | off | as configured |

Warning: if `.env.local` holds the production `DATABASE_URL`, `npm run dev`, `test:devices` and the scripts change live
data. For development and experiments, point `DATABASE_URL` at the staging database.

## Checks before merging

`.github/workflows/checks.yml` runs on every push: types, lint, formatting and the unit tests. Locally the same:
`npm run typecheck && npm run lint && npm run format:check && npm test`. For UI changes, also run
`ONLY=public npm run test:devices` (read-only) and look at the screenshots in `test-results/devices/`.
