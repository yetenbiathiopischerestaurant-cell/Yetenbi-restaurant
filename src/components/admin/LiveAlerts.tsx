"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminText } from "@/components/admin/AdminLang";
import { ONLINE_ORDERING } from "@/lib/features";

/*
  Live alerts for the team: checks every 10 seconds; on a new order or reservation request (owner) or a newly
  accepted order (kitchen) it plays a chime, shows a browser notification, refreshes the page and puts the count
  in the tab title. Sound needs one click per browser (autoplay rules); the choice is remembered on this device.
  While online ordering is off, only reservations (owner) and table orders (kitchen) count.
*/

export type Pulse = {
  newOrders: number;
  lastOrderId: number;
  pendingReservations: number;
  lastReservationId: number;
  kitchenQueue: number;
  lastAccepted: number;
  tableQueue: number;
  lastTableItem: number;
};

const SOUND_KEY = "yt-alert-sound";
const read = (k: string) => {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    window.localStorage.setItem(k, v);
  } catch {
    // storage blocked: the choice lasts for this visit
  }
};

/** "(2) Bestellungen | Yetenbi" while something is waiting; only writes when the text actually changes. */
function applyTitle(n: number) {
  const base = document.title.replace(/^\(\d+\)\s*/, "");
  const next = n > 0 ? `(${n}) ${base}` : base;
  if (document.title !== next) document.title = next;
}

/** Two soft bell tones, made in the browser (no sound file). */
function chime(ctx: AudioContext) {
  const now = ctx.currentTime;
  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * 0.22);
    gain.gain.exponentialRampToValueAtTime(0.35, now + i * 0.22 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.22 + 0.9);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.22);
    osc.stop(now + i * 0.22 + 1);
  });
}

export default function LiveAlerts({
  mode,
  onPulse,
}: {
  mode: "owner" | "kitchen";
  onPulse?: (latest: Pulse) => void;
}) {
  const router = useRouter();
  const { t } = useAdminText();
  const [allowed, setAllowed] = useState(true);
  const [sound, setSound] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [latest, setLatest] = useState<string | null>(null);
  const prev = useRef<Pulse | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const count = useRef(0);

  const audio = useCallback(() => {
    ctx.current ??= new AudioContext();
    if (ctx.current.state === "suspended") void ctx.current.resume();
    return ctx.current;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSound(read(SOUND_KEY) === "on");
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    // browsers start audio only after a click; any click on the page unlocks it
    const unlock = () => read(SOUND_KEY) === "on" && audio();
    document.addEventListener("pointerdown", unlock, { once: true });
    return () => document.removeEventListener("pointerdown", unlock);
  }, [audio]);

  const alert = useCallback(
    (title: string, body: string) => {
      setLatest(`${title}: ${body}`);
      if (read(SOUND_KEY) === "on") {
        try {
          chime(audio());
        } catch {
          // audio unavailable
        }
      }
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(title, { body, tag: "yetenbi", icon: "/icon.svg" });
      }
    },
    [audio],
  );

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch("/api/admin/pulse", { cache: "no-store" });
        if (res.status === 401 || res.status === 403) {
          setAllowed(false);
          return;
        }
        const latest = (await res.json()) as Pulse;
        if (stop) return;
        const was = prev.current;
        if (was) {
          let changed = false;
          if (ONLINE_ORDERING && mode === "owner" && latest.lastOrderId > was.lastOrderId && latest.newOrders > 0) {
            alert(t.alerts.newOrder, t.alerts.waitingOrders(latest.newOrders));
            changed = true;
          }
          if (
            mode === "owner" &&
            latest.lastReservationId > was.lastReservationId &&
            latest.pendingReservations > was.pendingReservations
          ) {
            alert(t.alerts.newReservation, t.alerts.open(latest.pendingReservations));
            changed = true;
          }
          if (ONLINE_ORDERING && mode === "kitchen" && latest.lastAccepted > was.lastAccepted) {
            alert(t.alerts.kitchenOrder, t.alerts.inProgress(latest.kitchenQueue));
            changed = true;
          }
          if (mode === "kitchen" && latest.lastTableItem > was.lastTableItem) {
            alert(t.alerts.tableOrder, t.alerts.tableTickets(latest.tableQueue));
            changed = true;
          }
          if (changed) router.refresh();
        }
        prev.current = latest;
        onPulse?.(latest);
        const orders = ONLINE_ORDERING ? (mode === "owner" ? latest.newOrders : latest.kitchenQueue) : 0;
        count.current = orders + (mode === "owner" ? latest.pendingReservations : latest.tableQueue);
        applyTitle(count.current);
      } catch {
        // offline for a moment: try again on the next tick
      }
      timer = setTimeout(tick, 10_000);
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [mode, alert, router, onPulse, t]);

  // Next.js sets the page title again on every navigation or refresh; put the count back in front each time.
  useEffect(() => {
    const observer = new MutationObserver(() => applyTitle(count.current));
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  if (!allowed) return null;

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    write(SOUND_KEY, next ? "on" : "off");
    if (next) chime(audio()); // also a test, and unlocks audio
  };
  const askNotifications = async () => setPerm(await Notification.requestPermission());

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2">
      {latest && (
        <button
          type="button"
          onClick={() => setLatest(null)}
          role="status"
          className="rounded border border-gold bg-coal px-4 py-2.5 text-left text-sm text-cream shadow-xl"
        >
          {latest}
        </button>
      )}
      <div className="flex items-center gap-2 rounded-full border border-gold/30 bg-coal/95 px-2 py-1.5 text-xs shadow-lg backdrop-blur">
        <span className="pl-1 text-cream/55">{t.alerts.live}</span>
        <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-[#7fcf9c]" />
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={sound}
          className={`rounded-full px-3 py-1 font-semibold ${sound ? "bg-gold text-ink" : "border border-cream/25 text-cream/80"}`}
        >
          {sound ? t.alerts.soundOn : t.alerts.soundOff}
        </button>
        {perm === "default" && (
          <button
            type="button"
            onClick={askNotifications}
            className="rounded-full border border-cream/25 px-3 py-1 font-semibold text-cream/80"
          >
            {t.alerts.allowNotifications}
          </button>
        )}
      </div>
    </div>
  );
}
