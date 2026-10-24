import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { listStaff, requireOwner } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import AdminHeader from "../AdminHeader";
import { changeRole } from "./actions";
import { AddStaffForm, PinForm, ResetPasswordForm } from "./TeamForms";

const WHAT: Record<Exclude<Role, "guest">, string> = {
  owner: "Reservierungen, Bestellungen, Einstellungen und Team.",
  kitchen: "Nur /kueche: angenommene Bestellungen ohne Preise und Gästedaten; drückt „Essen fertig“ und „Verpackt“.",
  driver: "Nur /lieferung: die eigenen Lieferungen mit Adresse und Betrag; drückt „Zugestellt“.",
  service:
    "Nur die Service-App auf Handy oder Tablet: Tische öffnen, Bestellungen an die Küche, kassieren. Anmeldung mit diesem Konto; auf der Website nur das eigene Profil.",
};

async function Team() {
  await connection();
  const me = await requireOwner();
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">Keine Datenbank verbunden.</p>;
  const staff = await listStaff();
  return (
    <>
      <section className="mt-10 border border-gold/20 bg-ink/40 p-6 md:p-8">
        <h2 className="font-display text-2xl font-semibold text-gold-soft">Konto anlegen</h2>
        <p className="mb-6 mt-2 text-sm text-cream/65">
          Jede Person meldet sich unter <span className="text-cream">/login</span> mit ihrer E-Mail an und landet direkt
          auf ihrem Bildschirm. Das Passwort kann sie danach im Profil ändern; vergessen geht über „Passwort vergessen“
          oder hier. Gebt neuen Teammitgliedern die{" "}
          <Link href="/datenschutz/team" className="text-gold-soft underline underline-offset-4">
            Datenschutzhinweise für das Team
          </Link>
          .
        </p>
        <AddStaffForm />
      </section>

      {(["owner", "service", "kitchen", "driver"] as const).map((role) => {
        const people = staff.filter((member) => member.role === role);
        return (
          <section key={role} className="mt-12">
            <h2 className="font-display text-2xl font-semibold text-gold-soft">
              {ROLE_LABEL[role]} <span className="text-cream/50">({people.length})</span>
            </h2>
            <p className="mt-1 text-sm text-cream/60">{WHAT[role]}</p>
            {people.length === 0 ? (
              <p className="mt-4 text-cream/55">Noch niemand.</p>
            ) : (
              <ul className="mt-4 divide-y divide-gold/10 border-y border-gold/10">
                {people.map((person) => (
                  <li key={person.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-cream">
                        <strong className="font-semibold">{person.name}</strong>{" "}
                        <span className="text-cream/60">· {person.email}</span>
                        {person.phone && <span className="text-cream/60"> · {person.phone}</span>}
                        {person.id === me.id && (
                          <span className="ml-2 text-xs uppercase tracking-[0.2em] text-gold">Du</span>
                        )}
                      </p>
                      {person.id !== me.id && (
                        <form action={changeRole} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="id" value={person.id} />
                          {(["owner", "service", "kitchen", "driver"] as const)
                            .filter((option) => option !== role)
                            .map((option) => (
                              <button
                                key={option}
                                name="role"
                                value={option}
                                className="rounded-full border border-cream/30 px-3 py-1 text-xs font-semibold text-cream hover:border-gold"
                              >
                                → {ROLE_LABEL[option]}
                              </button>
                            ))}
                          <button
                            name="role"
                            value="guest"
                            className="rounded-full border border-[#f0a080]/60 px-3 py-1 text-xs font-semibold text-[#f0a080] hover:bg-[#f0a080] hover:text-ink"
                          >
                            Aus dem Team entfernen
                          </button>
                        </form>
                      )}
                    </div>
                    {(role === "service" || role === "owner") && (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-cream/55 hover:text-cream">
                          App-PIN {person.hasPin ? "· gesetzt" : "· keine"}
                        </summary>
                        <p className="mt-2 max-w-xl text-xs text-cream/55">
                          Auf einem geteilten Handy oder Tablet: „Wer bedient?“ antippen, Namen wählen, PIN eingeben.
                          Bestellungen und Zahlungen laufen dann unter diesem Namen.
                        </p>
                        <PinForm id={person.id} hasPin={person.hasPin} />
                      </details>
                    )}
                    {person.id !== me.id && (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-cream/55 hover:text-cream">Passwort neu setzen</summary>
                        <ResetPasswordForm id={person.id} />
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      <p className="mt-10 text-sm text-cream/55">
        Eine Rollenänderung meldet die Person überall ab. Entfernte Personen behalten ein normales Gast-Konto.
      </p>
    </>
  );
}

export default function TeamPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <AdminHeader active="team" />
      <Suspense fallback={<p className="mt-12 text-cream/60">Lade Team …</p>}>
        <Team />
      </Suspense>
    </main>
  );
}
