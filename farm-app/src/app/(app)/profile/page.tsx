"use client";

import { useEffect, useState } from "react";
import { listTasks, updateProfile } from "@/lib/data";
import { Task } from "@/lib/types";
import { useAuth } from "@/lib/auth";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    listTasks().then((tasks) => {
      const mine = tasks
        .filter(
          (t) =>
            t.completed_by === profile.id &&
            t.completed_at &&
            new Date(t.completed_at).getTime() >= thirtyDaysAgo
        )
        .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
      setCompletedTasks(mine);
      setLoadingTasks(false);
    });
  }, [profile]);

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

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-800">Son 1 Ayda Tamamladigim Gorevler</h2>
        {loadingTasks ? (
          <p className="text-sm text-neutral-500">Yukleniyor...</p>
        ) : completedTasks.length === 0 ? (
          <p className="text-sm text-neutral-400">Son 1 ayda tamamlanan gorev yok.</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {completedTasks.map((t) => (
              <div key={t.id} className="py-2 text-sm">
                <p className="font-medium text-neutral-900">{t.title}</p>
                <p className="text-xs text-neutral-400">{t.completed_at && formatDateTime(t.completed_at)}</p>
                {t.completion_note && <p className="text-xs text-neutral-500">Not: {t.completion_note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
