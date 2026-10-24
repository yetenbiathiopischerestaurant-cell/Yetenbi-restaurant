import type { Metadata } from "next";
import { Suspense } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminLangProvider } from "@/components/admin/AdminLang";
import { adminText } from "@/lib/server/admin-lang";

export const metadata: Metadata = { title: "Verwaltung", robots: { index: false, follow: false } };

/** The admin's language (cookie) for every page and client component below it. */
async function WithLanguage({ children }: { children: React.ReactNode }) {
  const { lang } = await adminText();
  return (
    <AdminLangProvider lang={lang}>
      <AdminShell>{children}</AdminShell>
    </AdminLangProvider>
  );
}

/** Every /admin page sits in the shell: sidebar by task, live counters and alerts, account, language. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#16110d]" />}>
      <WithLanguage>{children}</WithLanguage>
    </Suspense>
  );
}
