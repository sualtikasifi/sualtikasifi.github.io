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

function tenureText(startDate: string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
  const years = Math.floor(days / 365);
  const remainingDays = days % 365;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yıl`);
  parts.push(`${remainingDays} gün`);
  return `${days} gündür bu çiftlikte çalışıyor (${parts.join(", ")})`;
}

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [title, setTitle] = useState(profile?.title ?? "");
  const [startDate, setStartDate] = useState(profile?.start_date ?? "");
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
    await updateProfile(profile.id, {
      full_name: fullName.trim(),
      title: title.trim() || null,
      start_date: startDate || null,
    });
    await refreshProfile();
    setSaving(false);
    setSaved(true);
  }

  if (!profile) return <p className="text-sm text-neutral-500">Yükleniyor...</p>;

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Profilim</h1>
      <form onSubmit={handleSubmit} className="card space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-700">Unvan</span>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSaved(false);
            }}
            placeholder="örn. Veteriner"
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-700">Unvan + Ad Soyad</span>
          <input
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setSaved(false);
            }}
            placeholder="örn. Dr. Ayşe Kaya (Veteriner)"
            className="input"
          />
        </label>
        <p className="text-xs text-neutral-400">
          Bu isim görevlerde, mastitis kayıtlarında ve diğer kayıtlarda &quot;kim yaptı&quot; bilgisi olarak
          gösterilir. E-posta yerine unvan + ad soyad şeklinde girmeniz önerilir.
        </p>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-700">İşe başlama tarihi</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setSaved(false);
            }}
            className="input"
          />
        </label>
        {startDate && <p className="text-xs text-neutral-500">{tenureText(startDate)}</p>}
        <button type="submit" disabled={saving || !fullName.trim()} className="btn-primary">
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
        {saved && <p className="text-sm text-green-700">Kaydedildi.</p>}
      </form>

      <div className="card">
        <h2 className="mb-2 text-sm font-semibold text-neutral-800">Son 1 Ayda Tamamladığım Görevler</h2>
        {loadingTasks ? (
          <p className="text-sm text-neutral-500">Yükleniyor...</p>
        ) : completedTasks.length === 0 ? (
          <p className="text-sm text-neutral-400">Son 1 ayda tamamlanan görev yok.</p>
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
