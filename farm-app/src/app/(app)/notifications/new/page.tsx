"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listProfiles, sendPushNotification } from "@/lib/data";
import { Profile } from "@/lib/types";
import { ProfileMultiPicker } from "@/components/ProfileMultiPicker";

export default function NewNotificationPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sendToEveryone, setSendToEveryone] = useState(true);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProfiles().then(setProfiles);
  }, []);

  const canSubmit = title.trim() !== "" && body.trim() !== "" && (sendToEveryone || selectedProfileIds.length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    try {
      await sendPushNotification({
        title: title.trim(),
        body: body.trim(),
        targetProfileIds: sendToEveryone ? null : selectedProfileIds,
      });
      setSent(true);
      setTimeout(() => router.push("/"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Duyuru gönderilemedi.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Duyuru Gönder</h1>
      <p className="text-sm text-neutral-500">
        Belirli bir veya birden fazla kişiye ya da herkese anlık push bildirimi gönder. Bildirimi görebilmeleri için
        o kişinin profilinden bildirimleri açmış olması gerekir.
      </p>
      <form onSubmit={handleSubmit} className="card space-y-3">
        <FieldBlock label="Kime">
          <label className="mb-2 flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={sendToEveryone}
              onChange={(e) => {
                setSendToEveryone(e.target.checked);
                if (e.target.checked) setSelectedProfileIds([]);
              }}
            />
            Herkese gönder
          </label>
          {!sendToEveryone && (
            <ProfileMultiPicker profiles={profiles} selectedIds={selectedProfileIds} onChange={setSelectedProfileIds} />
          )}
        </FieldBlock>
        <Field label="Başlık *">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </Field>
        <Field label="Mesaj *">
          <textarea required value={body} onChange={(e) => setBody(e.target.value)} className="input" rows={3} />
        </Field>
        <button type="submit" disabled={sending || !canSubmit} className="btn-primary">
          {sending ? "Gönderiliyor..." : "Gönder"}
        </button>
        {sent && <p className="text-sm text-green-700">Gönderildi.</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </div>
  );
}
