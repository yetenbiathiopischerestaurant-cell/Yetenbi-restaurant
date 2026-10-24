/*
  The intro plays only on a visitor's first visit; afterwards this key in localStorage skips it.
  A plain module (no "use client") so the root layout, a Server Component, can use the real strings.
  Every storage access is guarded: in private windows or with storage blocked the intro simply plays.
*/
export const INTRO_SEEN_KEY = "yt-intro-seen";

/*
  A reload (F5 or Ctrl+F5; browsers don't tell the two apart) plays the intro again on purpose, so it can be shown
  to someone on demand. Opening the site again or moving between pages does not.
*/
const isReload = () => {
  try {
    return (
      (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type === "reload"
    );
  } catch {
    return false;
  }
};

export function introSeen() {
  if (isReload()) return false;
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberIntroSeen() {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // storage blocked: the intro plays again next time
  }
}

/*
  Runs in <head> before the first paint and marks <html> for returning visitors, so CSS hides the
  server-rendered intro overlay and they never see a black flash before React takes over.
*/
export const introSeenScript = `try{var n=performance.getEntriesByType("navigation")[0];if(!(n&&n.type==="reload")&&localStorage.getItem("${INTRO_SEEN_KEY}")==="1")document.documentElement.dataset.introSeen="1"}catch(e){}`;
