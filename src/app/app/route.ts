import { latestRelease } from "@/lib/server/app-releases";
import { siteUrl } from "@/lib/site-url";

/*
  GET /app – the one link to share for the service app (e.g. www.yetenbi-wu.de/app). Opened on an Android
  phone or tablet it downloads the newest published version straight away; it always follows the latest release, so
  the link never changes. Without a published version it goes to /service, which explains.
*/
export async function GET() {
  const release = await latestRelease().catch(() => null);
  if (!release || !release.url.startsWith("https://")) return Response.redirect(`${siteUrl()}/service`, 302);
  return new Response(null, {
    status: 302,
    headers: { Location: release.url, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
