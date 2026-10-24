import { Suspense } from "react";
import { connection } from "next/server";
import LiveRefresh from "@/components/LiveRefresh";
import { todayISO } from "@/lib/booking";
import { formatEuro } from "@/lib/ordering";
import { checkTotal, kitchenCounts, type Check } from "@/lib/service";
import { listCrashes, listFeedback, type Crash, type Feedback } from "@/lib/server/app-feedback";
import { listReleases } from "@/lib/server/app-releases";
import { requireOwner } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { daySummary, listClosedChecks, listOpenChecks, listTables } from "@/lib/server/service";
import AdminHeader from "../AdminHeader";
import { feedbackDone, releaseFlag } from "./actions";
import PlanForm from "./PlanForm";

const euro = (amount: number) => formatEuro(amount, "de-DE");
const PAID_BY = { cash: "bar", card: "Karte", mixed: "bar + Karte" } as const;
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

function Figure({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-gold/20 bg-ink/40 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cream/55">{label}</p>
      <p className="mt-2 font-display text-3xl text-cream">{value}</p>
      {sub && <p className="mt-1 text-xs text-cream/55">{sub}</p>}
    </div>
  );
}

function OpenCheck({ check }: { check: Check }) {
  const { cooking, ready } = kitchenCounts(check.items);
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-3 py-3">
      <p className="text-cream">
        <strong className="font-display text-2xl">Tisch {check.tableLabel}</strong>{" "}
        <span className="text-cream/60">
          · {check.guests} Gäste · seit {time(check.openedAt)} · {check.openedBy}
        </span>
      </p>
      <p className="text-sm text-cream/70">
        {cooking > 0 && <span className="mr-3 text-gold-soft">{cooking} in der Küche</span>}
        {ready > 0 && <span className="mr-3 text-[#7fcf9c]">{ready} am Pass</span>}
        <span className="font-semibold text-cream">{euro(checkTotal(check.items))}</span>
        {check.payments.length > 0 && <span className="ml-2 text-cream/60">(offen {euro(check.due)})</span>}
      </p>
    </li>
  );
}

async function Service() {
  await connection();
  await requireOwner();
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">Keine Datenbank verbunden.</p>;
  const today = todayISO();
  const [open, closed, summary, tables, releases, feedback, crashes] = await Promise.all([
    listOpenChecks(),
    listClosedChecks(today),
    daySummary(today),
    listTables(),
    listReleases(),
    listFeedback(),
    listCrashes(),
  ]);
  const latest = releases.find((release) => release.published);
  const plan = tables
    .map((table) =>
      table.area
        ? `${table.label} | ${table.seats} | ${table.area}`
        : table.seats === 4
          ? table.label
          : `${table.label} | ${table.seats}`,
    )
    .join("\n");

  return (
    <>
      <LiveRefresh seconds={20} />
      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Figure
          label="Umsatz heute"
          value={euro(summary.total)}
          sub={`${summary.paid} Rechnungen · ${summary.guests} Gäste`}
        />
        <Figure label="Bar" value={euro(summary.cash)} />
        <Figure label="Karte" value={euro(summary.card)} />
        <Figure
          label="Trinkgeld"
          value={euro(summary.tips)}
          sub={summary.voided ? `${summary.voided} storniert` : undefined}
        />
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-gold-soft">
          Offene Tische <span className="text-cream/50">({open.length})</span>
        </h2>
        {open.length === 0 ? (
          <p className="mt-4 text-cream/55">Alle Tische sind frei.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gold/10 border-y border-gold/10">
            {open.map((check) => (
              <OpenCheck key={check.id} check={check} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-gold-soft">Heute abgerechnet</h2>
        {closed.length === 0 ? (
          <p className="mt-4 text-cream/55">Noch keine Rechnung.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gold/10 border-y border-gold/10 text-sm">
            {closed.map((check) => (
              <li key={check.id} className="flex flex-wrap justify-between gap-3 py-3">
                <span className="text-cream">
                  {time(check.closedAt!)} · Tisch {check.tableLabel} · Nr. {check.number}
                  <span className="text-cream/55"> · {check.closedBy}</span>
                </span>
                <span className={check.status === "void" ? "text-[#f0a080]" : "text-cream"}>
                  {check.status === "void"
                    ? "storniert"
                    : `${euro(check.total)} ${PAID_BY[check.payment ?? "card"]}${check.payments.length > 1 ? ` (${check.payments.length} Teile)` : ""}${check.tip ? ` + ${euro(check.tip)} Trinkgeld` : ""}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FeedbackList feedback={feedback} />

      <section className="mt-12 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-semibold text-gold-soft">Tischplan</h2>
          <p className="mt-1 text-sm text-cream/60">So erscheinen die Tische in der App, in dieser Reihenfolge.</p>
          <PlanForm plan={plan} />
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold text-gold-soft">App</h2>
          <p className="mt-1 text-sm text-cream/60">
            Neue Versionen erscheinen auf allen Handys und Tablets mit einer Benachrichtigung „Update verfügbar“ und
            werden mit einem Tipp installiert. Veröffentlichen: <span className="font-mono">npm run app:release</span>.
          </p>
          {latest ? (
            <>
              <p className="mt-5 text-sm text-cream/70">
                Für ein neues Handy oder Tablet: diese Seite dort öffnen und herunterladen. Die App ist ein internes
                Werkzeug; auf der Website gibt es keinen Link zu ihr.
              </p>
              <a
                href={latest.url}
                className="mt-3 inline-block rounded-full bg-gold px-6 py-2.5 font-semibold text-ink"
              >
                Version {latest.versionName} herunterladen
              </a>
            </>
          ) : (
            <p className="mt-5 text-cream/55">Noch keine Version veröffentlicht.</p>
          )}
          {releases.length > 0 && (
            <ul className="mt-6 divide-y divide-gold/10 border-y border-gold/10 text-sm">
              {releases.map((release) => (
                <li key={release.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-cream">
                      <strong>{release.versionName}</strong>{" "}
                      <span className="text-cream/55">
                        · Build {release.versionCode} · {(release.sizeBytes / 1024 / 1024).toFixed(1)} MB ·{" "}
                        {new Date(release.createdAt).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}
                      </span>
                    </p>
                    <form action={releaseFlag}>
                      <input type="hidden" name="id" value={release.id} />
                      <input type="hidden" name="name" value={release.versionName} />
                      <input type="hidden" name="flag" value="published" />
                      <input type="hidden" name="value" value={release.published ? "0" : "1"} />
                      <button className="rounded-full border border-cream/30 px-3 py-1 text-xs font-semibold text-cream hover:border-gold">
                        {release.published ? "Zurückziehen" : "Freigeben"}
                      </button>
                    </form>
                  </div>
                  {release.notes && <p className="mt-1 text-cream/65">{release.notes}</p>}
                  <p className="mt-1 text-xs text-cream/50">
                    {release.published ? "Freigegeben" : "Zurückgezogen"}
                    {release.mandatory && " · verpflichtend"}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Crashes crashes={crashes} />
        </div>
      </section>
    </>
  );
}

/* What testers sent with "Feedback" in the app, newest first, open ones on top. */
function FeedbackList({ feedback }: { feedback: Feedback[] }) {
  const open = feedback.filter((entry) => !entry.done).length;
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-semibold text-gold-soft">
        Feedback aus der App <span className="text-cream/50">({open} offen)</span>
      </h2>
      <p className="mt-1 text-sm text-cream/60">
        Was Testerinnen und Tester mit „Feedback“ in der App schicken, mit einem Bildschirmfoto der Seite, auf der sie
        waren.
      </p>
      {feedback.length === 0 ? (
        <p className="mt-4 text-cream/55">Noch kein Feedback.</p>
      ) : (
        <ul className="mt-4 divide-y divide-gold/10 border-y border-gold/10">
          {feedback.map((entry) => (
            <li key={entry.id} className={`flex flex-wrap gap-5 py-4 ${entry.done ? "opacity-55" : ""}`}>
              {entry.hasScreenshot && (
                <a href={`/admin/service/feedback/${entry.id}`} target="_blank" rel="noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- private, owner-only image */}
                  <img
                    src={`/admin/service/feedback/${entry.id}`}
                    alt="Bildschirmfoto"
                    loading="lazy"
                    className="h-40 w-auto border border-gold/20"
                  />
                </a>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-cream/55">
                  {new Date(entry.createdAt).toLocaleString("de-DE", {
                    dateStyle: "short",
                    timeStyle: "short",
                    timeZone: "Europe/Berlin",
                  })}{" "}
                  · {entry.userName || "?"} · {entry.screen} · App {entry.appVersion} · {entry.device}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-cream">{entry.message || "(nur Bildschirmfoto)"}</p>
                <form action={feedbackDone} className="mt-2">
                  <input type="hidden" name="id" value={entry.id} />
                  <input type="hidden" name="done" value={entry.done ? "0" : "1"} />
                  <button className="rounded-full border border-cream/30 px-3 py-1 text-xs font-semibold text-cream hover:border-gold">
                    {entry.done ? "Wieder offen" : "Erledigt"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* The app's latest crashes (also emailed like website errors). */
function Crashes({ crashes }: { crashes: Crash[] }) {
  if (crashes.length === 0) return null;
  return (
    <details className="mt-8 text-sm">
      <summary className="cursor-pointer text-cream/70">App-Abstürze ({crashes.length})</summary>
      <ul className="mt-3 space-y-3">
        {crashes.map((crash) => (
          <li key={crash.id} className="border border-gold/15 p-3">
            <p className="text-xs text-cream/55">
              {new Date(crash.createdAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })} · App{" "}
              {crash.appVersion} · {crash.device} · Android {crash.android}
            </p>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-cream/80">
              {crash.trace.slice(0, 2000)}
            </pre>
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function ServiceAdminPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <AdminHeader active="service" />
      <Suspense fallback={<p className="mt-12 text-cream/60">Lade Service …</p>}>
        <Service />
      </Suspense>
    </main>
  );
}
