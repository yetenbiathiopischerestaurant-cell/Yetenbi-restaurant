import { ONLINE_ORDERING } from "@/lib/features";
import { adminText } from "@/lib/server/admin-lang";
import type { AdminDict } from "@/lib/admin-i18n";

/** The heading of an admin page: what it is and what you do there, in one line. Navigation lives in the sidebar. */

type AdminPage = keyof AdminDict["pages"];

export default async function AdminHeader({ active, children }: { active: AdminPage; children?: React.ReactNode }) {
  const { t } = await adminText();
  const page: { title: string; lead: string; leadNoOrders?: string } = t.pages[active];
  const lead = !ONLINE_ORDERING && page.leadNoOrders ? page.leadNoOrders : page.lead;
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-cream/10 pb-6">
      <div>
        <h1 className="font-display text-4xl font-semibold text-cream md:text-5xl">{page.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream/60">{lead}</p>
      </div>
      {children}
    </div>
  );
}
