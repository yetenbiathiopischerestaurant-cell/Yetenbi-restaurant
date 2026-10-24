import { Suspense } from "react";
import { connection } from "next/server";
import LiveRefresh from "@/components/LiveRefresh";
import { todayISO } from "@/lib/booking";
import type { AdminDict } from "@/lib/admin-i18n";
import { formatEuro } from "@/lib/ordering";
import { checkTotal, kitchenCounts, type Check } from "@/lib/service";
import { listCrashes, listFeedback, type Crash, type Feedback } from "@/lib/server/app-feedback";
import { listReleases } from "@/lib/server/app-releases";
import { adminText } from "@/lib/server/admin-lang";
import { requireOwner } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { daySummary, listClosedChecks, listOpenChecks, listTables } from "@/lib/server/service";
import AdminHeader from "../AdminHeader";
import { feedbackDone, releaseFlag } from "./actions";
import PlanForm from "./PlanForm";

const time = (iso: string, intl: string) =>
  new Date(iso).toLocaleTimeString(intl, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

function Figure({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-gold/20 bg-ink/40 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cream/55">{label}</p>
      <p className="mt-2 font-display text-3xl text-cream">{value}</p>
      {sub && <p className="mt-1 text-xs text-cream/55">{sub}</p>}
    </div>
  );
}

function OpenCheck({ check, t }: { check: Check; t: AdminDict }) {
  const text = t.service;
  const euro = (amount: number) => formatEuro(amount, t.intl);
  const { cooking, ready } = kitchenCounts(check.items);
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-3 py-3">
      <p className="text-cream">
        <strong className="font-display text-2xl">{text.table(check.tableLabel)}</strong>{" "}
        <span className="text-cream/60">
          {text.openSince(check.guests, time(check.openedAt, t.intl), check.openedBy)}
        </span>
      </p>
      <p className="text-sm text-cream/70">
        {cooking > 0 && <span className="mr-3 text-gold-soft">{text.inKitchen(cooking)}</span>}
        {ready > 0 && <span className="mr-3 text-[#7fcf9c]">{text.atPass(ready)}</span>}
        <span className="font-semibold text-cream">{euro(checkTotal(check.items))}</span>
        {check.payments.length > 0 && <span className="ml-2 text-cream/60">{text.due(euro(check.due))}</span>}
      </p>
    </li>
  );
}

async function Service() {
  await connection();
  await requireOwner();
  const { t } = await adminText();
  const text = t.service;
  const euro = (amount: number) => formatEuro(amount, t.intl);
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">{t.common.noDatabase}</p>;
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
          label={text.revenueToday}
          value={euro(summary.total)}
          sub={text.revenueSub(summary.paid, summary.guests)}
        />
        <Figure label={text.cash} value={euro(summary.cash)} />
        <Figure label={text.card} value={euro(summary.card)} />
        <Figure
          label={text.tips}
          value={euro(summary.tips)}
          sub={summary.voided ? text.voided(summary.voided) : undefined}
        />
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-gold-soft">
          {text.openTables} <span className="text-cream/50">({open.length})</span>
        </h2>
        {open.length === 0 ? (
          <p className="mt-4 text-cream/55">{text.allFree}</p>
        ) : (
          <ul className="mt-4 divide-y divide-gold/10 border-y border-gold/10">
            {open.map((check) => (
              <OpenCheck key={check.id} check={check} t={t} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-gold-soft">{text.closedToday}</h2>
        {closed.length === 0 ? (
          <p className="mt-4 text-cream/55">{text.noBill}</p>
        ) : (
          <ul className="mt-4 divide-y divide-gold/10 border-y border-gold/10 text-sm">
            {closed.map((check) => (
              <li key={check.id} className="flex flex-wrap justify-between gap-3 py-3">
                <span className="text-cream">
                  {text.billLine(time(check.closedAt!, t.intl), check.tableLabel, check.number)}
                  <span className="text-cream/55"> · {check.closedBy}</span>
                </span>
                <span className={check.status === "void" ? "text-[#f0a080]" : "text-cream"}>
                  {check.status === "void"
                    ? text.voidedWord
                    : `${euro(check.total)} ${text.paidBy[check.payment ?? "card"]}${check.payments.length > 1 ? ` ${text.parts(check.payments.length)}` : ""}${check.tip ? ` ${text.tip(euro(check.tip))}` : ""}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FeedbackList feedback={feedback} t={t} />

      <section className="mt-12 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-semibold text-gold-soft">{text.plan}</h2>
          <p className="mt-1 text-sm text-cream/60">{text.planLead}</p>
          <PlanForm plan={plan} />
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold text-gold-soft">{text.app}</h2>
          <p className="mt-1 text-sm text-cream/60">
            {text.appLead} <span className="font-mono">npm run app:release</span>.
          </p>
          {latest ? (
            <>
              <p className="mt-5 text-sm text-cream/70">{text.newDevice}</p>
              <a
                href={latest.url}
                className="mt-3 inline-block rounded-full bg-gold px-6 py-2.5 font-semibold text-ink"
              >
                {text.download(latest.versionName)}
              </a>
            </>
          ) : (
            <p className="mt-5 text-cream/55">{text.noVersion}</p>
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
                        {new Date(release.createdAt).toLocaleDateString(t.intl, { timeZone: "Europe/Berlin" })}
                      </span>
                    </p>
                    <form action={releaseFlag}>
                      <input type="hidden" name="id" value={release.id} />
                      <input type="hidden" name="name" value={release.versionName} />
                      <input type="hidden" name="flag" value="published" />
                      <input type="hidden" name="value" value={release.published ? "0" : "1"} />
                      <button className="rounded-full border border-cream/30 px-3 py-1 text-xs font-semibold text-cream hover:border-gold">
                        {release.published ? text.withdraw : text.release}
                      </button>
                    </form>
                  </div>
                  {release.notes && <p className="mt-1 text-cream/65">{release.notes}</p>}
                  <p className="mt-1 text-xs text-cream/50">
                    {release.published ? text.released : text.withdrawn}
                    {release.mandatory && text.mandatory}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Crashes crashes={crashes} t={t} />
        </div>
      </section>
    </>
  );
}

/* What testers sent with "Feedback" in the app, newest first, open ones on top. */
function FeedbackList({ feedback, t }: { feedback: Feedback[]; t: AdminDict }) {
  const text = t.service;
  const open = feedback.filter((entry) => !entry.done).length;
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-semibold text-gold-soft">
        {text.feedback} <span className="text-cream/50">{text.openCount(open)}</span>
      </h2>
      <p className="mt-1 text-sm text-cream/60">{text.feedbackLead}</p>
      {feedback.length === 0 ? (
        <p className="mt-4 text-cream/55">{text.noFeedback}</p>
      ) : (
        <ul className="mt-4 divide-y divide-gold/10 border-y border-gold/10">
          {feedback.map((entry) => (
            <li key={entry.id} className={`flex flex-wrap gap-5 py-4 ${entry.done ? "opacity-55" : ""}`}>
              {entry.hasScreenshot && (
                <a href={`/admin/service/feedback/${entry.id}`} target="_blank" rel="noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- private, owner-only image */}
                  <img
                    src={`/admin/service/feedback/${entry.id}`}
                    alt={text.screenshot}
                    loading="lazy"
                    className="h-40 w-auto border border-gold/20"
                  />
                </a>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-cream/55">
                  {new Date(entry.createdAt).toLocaleString(t.intl, {
                    dateStyle: "short",
                    timeStyle: "short",
                    timeZone: "Europe/Berlin",
                  })}{" "}
                  · {entry.userName || "?"} · {entry.screen} · App {entry.appVersion} · {entry.device}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-cream">{entry.message || text.onlyScreenshot}</p>
                <form action={feedbackDone} className="mt-2">
                  <input type="hidden" name="id" value={entry.id} />
                  <input type="hidden" name="done" value={entry.done ? "0" : "1"} />
                  <button className="rounded-full border border-cream/30 px-3 py-1 text-xs font-semibold text-cream hover:border-gold">
                    {entry.done ? text.reopen : text.done}
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
function Crashes({ crashes, t }: { crashes: Crash[]; t: AdminDict }) {
  if (crashes.length === 0) return null;
  return (
    <details className="mt-8 text-sm">
      <summary className="cursor-pointer text-cream/70">{t.service.crashes(crashes.length)}</summary>
      <ul className="mt-3 space-y-3">
        {crashes.map((crash) => (
          <li key={crash.id} className="border border-gold/15 p-3">
            <p className="text-xs text-cream/55">
              {new Date(crash.createdAt).toLocaleString(t.intl, { timeZone: "Europe/Berlin" })} · App {crash.appVersion}{" "}
              · {crash.device} · Android {crash.android}
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

export default async function ServiceAdminPage() {
  const { t } = await adminText();
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <AdminHeader active="service" />
      <Suspense fallback={<p className="mt-12 text-cream/60">{t.common.loading}</p>}>
        <Service />
      </Suspense>
    </main>
  );
}
