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
  "Feedback" button in the service app (with a screenshot of the screen), for the client's test. What testers send
  appears in /admin/service. Set to false and deploy to hide the button; no app update needed.
*/
export const APP_FEEDBACK = true;
