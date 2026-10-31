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
    return await readSiteSections();
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
