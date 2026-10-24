import Image from "next/image";
import { Suspense } from "react";
import { connection } from "next/server";
import { cloudinaryUrl, PHOTO_SLOTS } from "@/lib/photos";
import { requireOwner } from "@/lib/server/auth";
import { isCloudinaryConfigured } from "@/lib/server/cloudinary";
import { hasDatabase } from "@/lib/server/db";
import { listPhotos } from "@/lib/server/photos";
import { adminText } from "@/lib/server/admin-lang";
import AdminHeader from "../AdminHeader";
import { resetPhoto } from "./actions";
import Uploader from "./Uploader";

async function Gallery() {
  await connection();
  await requireOwner();
  const { t } = await adminText();
  const text = t.photos;
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">{t.common.noDatabase}</p>;
  const ready = isCloudinaryConfigured();
  const photos = await listPhotos();
  return (
    <>
      <p className="mt-8 max-w-3xl text-sm leading-relaxed text-cream/70">{text.lead(20)}</p>
      {!ready && (
        <p className="mt-4 border-l-2 border-[#f0a080] pl-4 text-sm text-[#f0a080]">{text.cloudinaryMissing}</p>
      )}
      <ul className="mt-10 grid gap-6 sm:grid-cols-2">
        {PHOTO_SLOTS.map((slot) => {
          const up = photos[slot.key];
          const name = text.slots[slot.key] ?? slot;
          return (
            <li key={slot.key} className="border border-gold/25 bg-ink/50">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-coal">
                {up ? (
                  <Image
                    src={cloudinaryUrl(up.url, "w_800,c_limit,f_auto,q_auto")}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <Image
                    src={`/img/${slot.key}.jpg`}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 40vw, 90vw"
                    className="object-cover opacity-80"
                  />
                )}
                <span
                  className={`absolute left-3 top-3 rounded-full px-3 py-0.5 text-xs font-semibold ${up ? "bg-[#7fcf9c] text-ink" : "bg-ink/80 text-cream/80"}`}
                >
                  {up ? text.own : text.original}
                </span>
              </div>
              <div className="space-y-3 p-5">
                <p className="font-display text-xl text-cream">{name.label}</p>
                <p className="text-xs text-cream/55">{name.where}</p>
                {ready && <Uploader slot={slot.key} replace={Boolean(up)} />}
                {up && (
                  <form action={resetPhoto}>
                    <input type="hidden" name="slot" value={slot.key} />
                    <button className="text-xs text-cream/55 underline underline-offset-4 hover:text-[#f0a080]">
                      {text.reset}
                    </button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default async function PhotosPage() {
  const { t } = await adminText();
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <AdminHeader active="photos" />
      <Suspense fallback={<p className="mt-12 text-cream/60">{t.common.loading}</p>}>
        <Gallery />
      </Suspense>
    </main>
  );
}
