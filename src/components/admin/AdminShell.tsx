"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LalibelaCross } from "@/components/heritage/Ornaments";
import { logout } from "@/app/account-actions";
import { useAccount } from "@/lib/account-client";
import { ONLINE_ORDERING } from "@/lib/features";
import type { AdminDict } from "@/lib/admin-i18n";
import { AdminLanguageToggle, useAdminText } from "./AdminLang";
import LiveAlerts, { type Pulse } from "./LiveAlerts";

/*
  The admin's frame: a sidebar grouped by task (on phones a top bar with a menu), live counters on
  "Bestellungen" and "Reservierungen", who is signed in and the way out. Pages bring only their own content.
*/

type Item = { href: string; label: string; badge?: (counts: Pulse) => number; external?: boolean };
type Group = { title: string; items: Item[] };

function navFor(t: AdminDict): Group[] {
  const { groups, items } = t.shell;
  return [
    { title: groups.today, items: [{ href: "/admin", label: items.overview }] },
    {
      title: groups.operations,
      items: [
        // online orders (delivery and pickup) only while online ordering is switched on
        ...(ONLINE_ORDERING
          ? [{ href: "/admin/bestellungen", label: items.orders, badge: (counts: Pulse) => counts.newOrders }]
          : []),
        { href: "/admin/reservierungen", label: items.reservations, badge: (counts) => counts.pendingReservations },
        { href: "/admin/service", label: items.service },
        { href: "/kueche", label: items.kitchen, external: true },
        ...(ONLINE_ORDERING ? [{ href: "/lieferung", label: items.deliveries, external: true }] : []),
      ],
    },
    {
      title: groups.menuWebsite,
      items: [
        { href: "/admin/speisekarte", label: items.menu },
        { href: "/admin/fotos", label: items.photos },
        { href: "/", label: items.website, external: true },
      ],
    },
    {
      title: groups.analysis,
      items: [
        { href: "/admin/berichte", label: items.reports },
        { href: "/admin/kunden", label: items.customers },
        { href: "/admin/protokoll", label: items.log },
      ],
    },
    {
      title: groups.settings,
      items: [
        { href: "/admin/einstellungen", label: items.business },
        { href: "/admin/team", label: items.team },
      ],
    },
  ];
}

const isActive = (path: string, href: string) =>
  href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`);

function Nav({ path, pulse, onNavigate }: { path: string; pulse: Pulse | null; onNavigate?: () => void }) {
  const { t } = useAdminText();
  return (
    <nav aria-label={t.shell.navLabel} className="space-y-6">
      {navFor(t).map((group) => (
        <div key={group.title}>
          <p className="px-3 text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-cream/40">{group.title}</p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => {
              const on = isActive(path, item.href);
              const count = pulse && item.badge ? item.badge(pulse) : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={on ? "page" : undefined}
                    className={`flex items-center justify-between rounded-md px-3 py-2 text-[0.92rem] transition-colors ${
                      on
                        ? "bg-gold/15 font-semibold text-gold-soft"
                        : "text-cream/75 hover:bg-cream/[0.05] hover:text-cream"
                    }`}
                  >
                    <span>
                      {item.label}
                      {item.external && <span className="ml-1.5 text-xs text-cream/35">↗</span>}
                    </span>
                    {count > 0 && (
                      <span className="min-w-6 rounded-full bg-gold px-1.5 text-center text-xs font-semibold tabular-nums text-ink">
                        {count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** The nav with the current page marked. Reading the address is runtime data, so it sits inside Suspense. */
function CurrentNav({ pulse, onNavigate }: { pulse: Pulse | null; onNavigate?: () => void }) {
  const path = usePathname();
  return <Nav path={path} pulse={pulse} onNavigate={onNavigate} />;
}

/** Closes the phone menu whenever the page changes. */
function CloseOnNavigate({ onChange }: { onChange: () => void }) {
  const path = usePathname();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => onChange(), [path]);
  return null;
}

function Account() {
  const me = useAccount();
  const { t } = useAdminText();
  return (
    <div className="space-y-3 border-t border-cream/10 pt-4 text-sm">
      {me && (
        <p className="px-3 text-cream/60">
          {t.common.signedInAs} <span className="text-cream">{me.name}</span>
        </p>
      )}
      <div className="flex items-center gap-4 px-3">
        <Link href="/" className="text-cream/60 underline underline-offset-4 hover:text-cream">
          {t.common.toWebsite}
        </Link>
        <form action={logout}>
          <button className="text-cream/60 underline underline-offset-4 hover:text-cream">{t.common.signOut}</button>
        </form>
      </div>
      <AdminLanguageToggle className="mx-3" />
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [open, setOpen] = useState(false);
  const { t } = useAdminText();

  const brand = (
    <Link href="/admin" className="flex items-center gap-3 px-3">
      <LalibelaCross className="h-7 w-7 text-gold" />
      <span>
        <span className="block font-display text-xl font-semibold leading-none text-cream">Yetenbi</span>
        <span className="text-[0.6rem] uppercase tracking-[0.3em] text-gold">{t.shell.brand}</span>
      </span>
    </Link>
  );

  return (
    <div data-admin-shell className="min-h-[100dvh] w-full bg-[#16110d] lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-[100dvh] flex-col justify-between overflow-y-auto border-r border-cream/10 bg-[#120e0b] px-3 py-6 lg:flex">
        <div className="space-y-8">
          {brand}
          <Suspense fallback={<Nav path="" pulse={pulse} />}>
            <CurrentNav pulse={pulse} />
          </Suspense>
        </div>
        <Account />
      </aside>

      {/* phone / tablet top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-cream/10 bg-[#120e0b]/95 px-2 py-3 backdrop-blur lg:hidden">
        {brand}
        <button
          type="button"
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          aria-expanded={open}
          aria-controls="admin-menu"
          className="mr-2 flex items-center gap-2 rounded-full border border-cream/20 px-4 py-2 text-sm font-semibold text-cream"
        >
          {t.shell.menu}
          {pulse && pulse.newOrders + pulse.pendingReservations > 0 && (
            <span className="rounded-full bg-gold px-1.5 text-xs text-ink">
              {pulse.newOrders + pulse.pendingReservations}
            </span>
          )}
        </button>
      </header>
      {open && (
        <div
          id="admin-menu"
          className="fixed inset-x-0 bottom-0 top-[61px] z-40 overflow-y-auto bg-[#120e0b] px-3 pb-28 pt-6 lg:hidden"
        >
          <Suspense fallback={<Nav path="" pulse={pulse} onNavigate={() => setOpen(false)} />}>
            <CurrentNav pulse={pulse} onNavigate={() => setOpen(false)} />
          </Suspense>
          <div className="mt-8">
            <Account />
          </div>
        </div>
      )}

      <Suspense>
        <CloseOnNavigate onChange={() => setOpen(false)} />
      </Suspense>
      <div className="min-w-0">{children}</div>
      <LiveAlerts mode="owner" onPulse={setPulse} />
    </div>
  );
}
