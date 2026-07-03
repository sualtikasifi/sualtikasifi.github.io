"use client";

import { useState } from "react";
import { updateProfile } from "@/lib/data";
import { useAuth } from "@/lib/auth";

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !fullName.trim()) return;
    setSaving(true);
    await updateProfile(profile.id, { full_name: fullName.trim() });
    await refreshProfile();
    setSaving(false);
    setSaved(true);
  }

  if (!profile) return <p className="text-sm text-neutral-500">Yukleniyor...</p>;

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Profilim</h1>
      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-700">Unvan + Ad Soyad</span>
          <input
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setSaved(false);
            }}
            placeholder="orn. Dr. Ayse Kaya (Veteriner)"
            className="input"
          />
        </label>
        <p className="text-xs text-neutral-400">
          Bu isim gorevlerde, mastitis kayitlarinda ve diger kayitlarda &quot;kim yapti&quot; bilgisi olarak
          gosterilir. E-posta yerine unvan + ad soyad seklinde girmeniz onerilir.
        </p>
        <button
          type="submit"
          disabled={saving || !fullName.trim()}
          className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
        {saved && <p className="text-sm text-green-700">Kaydedildi.</p>}
      </form>
    </div>
  );
}
