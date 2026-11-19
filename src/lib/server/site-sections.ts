import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { DEFAULT_SECTIONS, type SiteSections } from "@/lib/site-sections";
import { db, hasDatabase } from "./db";

/** Which home page sections are switched on, cached until the owner changes them ("sections" tag). */
export async function getSiteSections(): Promise<SiteSections> {
  "use cache";
  cacheTag("sections");
  cacheLife("max");
  if (!hasDatabase()) return DEFAULT_SECTIONS;
  try {
    const sections = { ...(await readSiteSections()) };
    // Local preview only: PREVIEW_MENU=1 / PREVIEW_RESERVATIONS=1 in .env.local show these sections on
    // `npm run dev` even while the owner has them switched off on the live site. Ignored in production builds.
    if (process.env.NODE_ENV === "development") {
      if (process.env.PREVIEW_MENU === "1") sections.menu = true;
      if (process.env.PREVIEW_RESERVATIONS === "1") sections.reservations = true;
    }
    return sections;
  } catch (error) {
    console.error("Could not load site sections", error);
    return DEFAULT_SECTIONS;
  }
}

export async function readSiteSections(): Promise<SiteSections> {
  const [row] = (await db()`select value from settings where key = 'sections'`) as { value: Partial<SiteSections> }[];
  return { ...DEFAULT_SECTIONS, ...(row?.value ?? {}) };
}

export async function saveSiteSections(sections: SiteSections) {
  await db()`
    insert into settings (key, value, updated_at) values ('sections', ${JSON.stringify(sections)}::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
}
