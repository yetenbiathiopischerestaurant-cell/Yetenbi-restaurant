"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { SLOT_KEYS } from "@/lib/photos";
import { requireOwner } from "@/lib/server/auth";
import {
  blurPreview,
  destroy,
  findResource,
  FOLDER,
  isCloudinaryConfigured,
  uploadTicket,
} from "@/lib/server/cloudinary";
import { clearPhoto, setPhoto } from "@/lib/server/photos";
import { audit } from "@/lib/server/audit";
import { adminText } from "@/lib/server/admin-lang";

type Ticket = ReturnType<typeof uploadTicket>;

/** A one-time signed upload for a slot. Only owners; the file goes straight from the browser to Cloudinary. */
export async function startUpload(slot: string): Promise<{ ticket?: Ticket; error?: string }> {
  await requireOwner();
  const { t } = await adminText();
  if (!isCloudinaryConfigured()) return { error: t.photos.errors.notConfigured };
  if (!SLOT_KEYS.has(slot)) return { error: t.photos.errors.unknownSlot };
  const publicId = `${FOLDER}/${slot.replace("/", "-")}-${randomBytes(4).toString("hex")}`;
  return { ticket: uploadTicket(publicId) };
}

/** After the upload: checks the file is in our Cloudinary folder, stores it for the slot, refreshes the website. */
export async function finishUpload(slot: string, publicId: string): Promise<{ ok?: boolean; error?: string }> {
  const me = await requireOwner();
  const { t } = await adminText();
  if (!SLOT_KEYS.has(slot) || !new RegExp(`^${FOLDER}/[a-z-]+-[0-9a-f]{8}$`).test(publicId))
    return { error: t.photos.errors.invalid };
  const res = await findResource(publicId);
  if (!res) return { error: t.photos.errors.notArrived };
  const previous = await setPhoto(slot, {
    url: res.secure_url,
    publicId: res.public_id,
    width: res.width,
    height: res.height,
    blur: await blurPreview(res.secure_url),
  });
  if (previous && previous.publicId !== res.public_id) await destroy(previous.publicId);
  await audit(me, "photos", "Foto hochgeladen", slot);
  updateTag("photos");
  revalidatePath("/admin/fotos");
  return { ok: true };
}

/** Back to the built-in picture; the uploaded file is deleted on Cloudinary. */
export async function resetPhoto(form: FormData) {
  const me = await requireOwner();
  const slot = String(form.get("slot") ?? "");
  if (!SLOT_KEYS.has(slot)) return;
  const removed = await clearPhoto(slot);
  if (removed && isCloudinaryConfigured()) await destroy(removed.publicId);
  if (removed) await audit(me, "photos", "Foto zurückgesetzt", slot);
  updateTag("photos");
  revalidatePath("/admin/fotos");
}
