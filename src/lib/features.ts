/*
  Site-wide switches. Online ordering is off until the restaurant is ready for delivery: the links to /bestellen
  are hidden, the page sends visitors home and the order API refuses new orders. Set to true to bring it all back.
*/
export const ONLINE_ORDERING = false;

/*
  Sign-in for the service app. Off while the client tries the app: it opens straight to the tables as a shared
  "Demo" service account (the app asks /api/app/login/demo). Set to true and deploy: the app shows its login screen
  again (Google + email), no app update needed.
*/
export const APP_LOGIN = true;

/*
  Payments in the service app. Off: the app is no till. The waiter closes a table with "Tisch schließen" and no
  payment, tip or receipt is recorded; payment is taken outside the app (open cash box with a daily count, card
  terminal). That keeps the app outside the KassenSichV (no TSE needed). The admin shows tables and order value, not
  takings. Turning it back on needs a certified TSE first.
*/
export const APP_PAYMENTS = false;

/*
  "Feedback" button in the service app (with a screenshot of the screen), for the client's test. What testers send
  appears in /admin/service. Set to false and deploy to hide the button; no app update needed.
*/
export const APP_FEEDBACK = true;
