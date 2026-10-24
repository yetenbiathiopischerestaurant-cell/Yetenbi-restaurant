"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAdminText } from "@/components/admin/AdminLang";
import { finishUpload, startUpload } from "./actions";

const MAX_MB = 20;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"];

/** Picks a photo and uploads it straight to Cloudinary with a signature from the server, then saves it for the slot. */
export default function Uploader({ slot, replace }: { slot: string; replace: boolean }) {
  const router = useRouter();
  const { t } = useAdminText();
  const text = t.photos;
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ busy?: string; error?: string; ok?: boolean }>({});

  const upload = async (file: File) => {
    if (!TYPES.includes(file.type) && !/\.(heic|heif)$/i.test(file.name)) return setState({ error: text.wrongType });
    if (file.size > MAX_MB * 1024 * 1024) return setState({ error: text.tooBig(MAX_MB) });
    setState({ busy: text.uploading });
    try {
      const { ticket, error } = await startUpload(slot);
      if (!ticket) return setState({ error });
      const body = new FormData();
      body.append("file", file);
      body.append("api_key", ticket.apiKey);
      body.append("timestamp", String(ticket.timestamp));
      body.append("public_id", ticket.public_id);
      body.append("allowed_formats", ticket.allowed_formats);
      body.append("signature", ticket.signature);
      const res = await fetch(ticket.url, { method: "POST", body });
      if (!res.ok) {
        const msg = ((await res.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message;
        return setState({ error: text.rejected(msg ?? "") });
      }
      setState({ busy: t.common.saving });
      const done = await finishUpload(slot, ticket.public_id);
      if (done.error) return setState({ error: done.error });
      setState({ ok: true });
      router.refresh();
    } catch {
      setState({ error: text.failed });
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif"
        className="sr-only"
        id={`file-${slot}`}
        onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])}
        disabled={Boolean(state.busy)}
      />
      <label
        htmlFor={`file-${slot}`}
        className={`cursor-pointer rounded-full px-5 py-2 text-sm font-semibold ${state.busy ? "pointer-events-none bg-gold/50 text-ink" : "bg-gold text-ink"}`}
      >
        {state.busy ?? (replace ? text.replace : text.upload)}
      </label>
      {state.ok && (
        <span role="status" className="text-sm text-[#9fe0b6]">
          {text.saved}
        </span>
      )}
      {state.error && (
        <span role="alert" className="text-sm text-[#f0a080]">
          {state.error}
        </span>
      )}
    </div>
  );
}
