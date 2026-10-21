/*
  Publishes a new version of the service app. Every phone and tablet sees it within 30 minutes (or right away on
  start), shows "Update available" in the notification bar and installs it with one tap.

    npm run app:release -- --notes "Neu: …" [--notes-en "New: …"] [--name 1.2.0] [--mandatory]
    npm run app:release -- --dry-run      builds and checks, uploads nothing

  Steps: picks the next version number, builds the signed release APK (android/, key from ~/.android-yetenbi),
  attaches it to a GitHub release "app-<version>" on the site's repo and records it in the database.
  (Cloudinary, which holds the photos, refuses app files.) Reads DATABASE_URL and optionally GITHUB_TOKEN from
  .env.local; without the token it uses the GitHub login git pushes with. Switch versions on or off in /admin/service.
*/
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const root = path.resolve(import.meta.dirname, "..");
const android = path.join(root, "android");
const fail = (message) => {
  console.error(`✘ ${message}`);
  process.exit(1);
};

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) fail("DATABASE_URL is missing (add it to .env.local).");

// The repo from the git remote, e.g. https://github.com/owner/name.git -> owner/name.
const remote = execSync("git remote get-url origin", { cwd: root, encoding: "utf8" }).trim();
const remoteRepo = remote.match(/github\.com[/:]([^/]+\/[^/]+?)(\.git)?$/)?.[1];
if (!remoteRepo) fail(`The git remote isn't on GitHub: ${remote}`);
// GITHUB_TOKEN from .env.local, otherwise the login git already uses to push.
const token =
  process.env.GITHUB_TOKEN ||
  (flag("dry-run")
    ? ""
    : (execSync("git credential fill", {
        cwd: root,
        input: "protocol=https\nhost=github.com\n\n",
        encoding: "utf8",
      }).match(/^password=(.*)$/m)?.[1] ?? ""));
if (!token && !flag("dry-run")) fail("No GitHub login: set GITHUB_TOKEN in .env.local or sign in to git once.");
const home = process.env.USERPROFILE ?? process.env.HOME ?? "";
if (!existsSync(path.join(home, ".android-yetenbi", "keystore.properties")))
  fail("Release key not found in ~/.android-yetenbi. Without it the devices can't install updates.");

const notes = option("notes") ?? "";
if (!notes && !flag("dry-run")) fail('Describe what changed: --notes "…"');
const sql = neon(DATABASE_URL);

// Next version: build number +1, the name bumps its last part unless given.
const [last] = await sql`select version_code, version_name from app_releases order by version_code desc limit 1`;
const versionCode = (last?.version_code ?? 0) + 1;
const versionName =
  option("name") ?? (last ? last.version_name.replace(/(\d+)$/, (n) => String(Number(n) + 1)) : "1.0.0");
if (!/^\d+\.\d+\.\d+$/.test(versionName)) fail(`Version name must look like 1.2.0, got ${versionName}`);
console.log(`→ Building ${versionName} (build ${versionCode}) …`);

// Full path: Windows may not run programs from the current folder.
const gradlew = path.join(android, process.platform === "win32" ? "gradlew.bat" : "gradlew");
execSync(`"${gradlew}" assembleRelease -PversionCode=${versionCode} -PversionName=${versionName} --console=plain -q`, {
  cwd: android,
  stdio: "inherit",
});

const apk = path.join(android, "app", "build", "outputs", "apk", "release", "app-release.apk");
const size = statSync(apk).size;
const bytes = readFileSync(apk);
const sha256 = createHash("sha256").update(bytes).digest("hex");
console.log(`✔ Built ${(size / 1024 / 1024).toFixed(1)} MB, SHA-256 ${sha256}`);
// Cloudinary's free plan takes "raw" files up to 10 MB.
if (size > 10 * 1024 * 1024) console.warn("! Larger than 10 MB: the upload fails on Cloudinary's free plan.");

if (flag("dry-run")) {
  console.log("Dry run: nothing uploaded or published.");
  process.exit(0);
}

console.log("→ Uploading to GitHub Releases …");
const gh = async (url, init = {}) => {
  const res = await fetch(url.startsWith("https://") ? url : `https://api.github.com${url}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) fail(`GitHub: ${body?.message ?? res.status} (${url})`);
  return body;
};
// The repo's current name (it may have moved since the remote was set up).
const { full_name: repo } = await gh(`/repos/${remoteRepo}`);
const tag = `app-${versionName}`;
const release = await gh(`/repos/${repo}/releases`, {
  method: "POST",
  body: JSON.stringify({
    tag_name: tag,
    name: `Service-App ${versionName}`,
    body: [notes, option("notes-en")].filter(Boolean).join("\n\n"),
    make_latest: "false", // "latest" stays free for the website itself
  }),
});
const upload = await gh(
  `https://uploads.github.com/repos/${repo}/releases/${release.id}/assets?name=yetenbi-service-${versionName}.apk`,
  { method: "POST", body: bytes, headers: { "Content-Type": "application/vnd.android.package-archive" } },
);

// OLD_DATABASE_URL (optional): a database an older site still reads, so phones still pointed there see the update too.
for (const target of [sql, ...(process.env.OLD_DATABASE_URL ? [neon(process.env.OLD_DATABASE_URL)] : [])]) {
  await target`
    insert into app_releases (version_code, version_name, url, sha256, size_bytes, notes, notes_en, mandatory)
    values (${versionCode}, ${versionName}, ${upload.browser_download_url}, ${sha256}, ${size}, ${notes}, ${option("notes-en") ?? ""}, ${flag("mandatory")})
  `;
}
console.log(`✔ Published ${versionName} (build ${versionCode})${flag("mandatory") ? " as a mandatory update" : ""}`);
console.log(`  ${upload.browser_download_url}`);
