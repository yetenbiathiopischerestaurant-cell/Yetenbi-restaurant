import "server-only";
import { db, hasDatabase } from "./db";

/*
  Published versions of the service app (scripts/release-app.mjs adds them, /admin/service switches them on and
  off). Phones and tablets ask /api/app/version on start and every half hour and install the newest one.
*/

type AppRelease = {
  id: number;
  versionCode: number;
  versionName: string;
  url: string;
  sha256: string;
  sizeBytes: number;
  notes: string;
  notesEn: string;
  mandatory: boolean;
  published: boolean;
  createdAt: string;
};

const toRelease = (row: Record<string, unknown>): AppRelease => ({
  id: Number(row.id),
  versionCode: Number(row.version_code),
  versionName: String(row.version_name),
  url: String(row.url),
  sha256: String(row.sha256),
  sizeBytes: Number(row.size_bytes),
  notes: String(row.notes ?? ""),
  notesEn: String(row.notes_en ?? ""),
  mandatory: Boolean(row.mandatory),
  published: Boolean(row.published),
  createdAt: new Date(String(row.created_at)).toISOString(),
});

export async function listReleases(): Promise<AppRelease[]> {
  if (!hasDatabase()) return [];
  const rows = (await db()`select * from app_releases order by version_code desc limit 50`) as Record<
    string,
    unknown
  >[];
  return rows.map(toRelease);
}

export async function latestRelease() {
  return (await listReleases()).find((release) => release.published) ?? null;
}

/**
  What a device on `current` should do: the newest published version (if newer), and whether it must update now
  because a newer mandatory version exists.
*/
export async function updateInfo(current: number) {
  const releases = (await listReleases()).filter((release) => release.published);
  const latest = releases[0] ?? null;
  const minSupported = releases.filter((r) => r.mandatory).reduce((min, r) => Math.max(min, r.versionCode), 0);
  return {
    latest: latest && latest.versionCode > current ? latest : null,
    minSupportedVersionCode: minSupported,
    mustUpdate: latest !== null && current < minSupported,
  };
}

export async function setReleaseFlags(id: number, flags: { published?: boolean; mandatory?: boolean }) {
  if (flags.published !== undefined)
    await db()`update app_releases set published = ${flags.published} where id = ${id}`;
  if (flags.mandatory !== undefined)
    await db()`update app_releases set mandatory = ${flags.mandatory} where id = ${id}`;
}
