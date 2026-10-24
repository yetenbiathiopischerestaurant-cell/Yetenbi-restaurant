import "server-only";
import { cookies } from "next/headers";
import { ADMIN_LANG_COOKIE, adminDict, asAdminLang } from "@/lib/admin-i18n";

/** The team area's language from the cookie, with its texts. Reads the request, so call it inside Suspense. */
export async function adminText() {
  const lang = asAdminLang((await cookies()).get(ADMIN_LANG_COOKIE)?.value);
  return { lang, t: adminDict(lang) };
}
