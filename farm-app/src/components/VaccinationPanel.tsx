"use client";

import { useEffect, useState } from "react";
import {
  createVaccinationPlan,
  deleteVaccinationPlan,
  listVaccinationPlans,
  setVaccinationPlanDone,
} from "@/lib/data";
import { VaccinationPlan } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    weekday: "short",
  });
}

// Bir sonraki persembe (bugun persembeyse bugun).
function nextThursdayIso(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Pazar ... 4=Persembe
  const diff = (4 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Persembe asi gunleri icin kontrol listesi: yapilacak asilar eklenir,
// yapilinca tik atilir (kim/ne zaman kaydi tutulur).
export function VaccinationPanel() {
  const { profile } = useAuth();
  const canManage = hasPermission(profile, "can_manage_calves");
  const [plans, setPlans] = useState<VaccinationPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState(nextThursdayIso());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showOld, setShowOld] = useState(false);

  useEffect(() => {
    listVaccinationPlans().then((p) => {
      setPlans(p);
      setLoading(false);
    });
  }, []);

  async function refresh() {
    setPlans(await listVaccinationPlans());
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await createVaccinationPlan({
      vaccine_name: name.trim(),
      target: target.trim() || null,
      planned_date: date,
      notes: notes.trim() || null,
      created_by: profile?.id ?? null,
    });
    setName("");
    setTarget("");
    setNotes("");
    setSaving(false);
    setShowForm(false);
    await refresh();
  }

  async function toggleDone(plan: VaccinationPlan) {
    await setVaccinationPlanDone(plan.id, !plan.done, profile?.id ?? null);
    await refresh();
  }

  async function handleDelete(id: string) {
    await deleteVaccinationPlan(id);
    await refresh();
  }

  const pending = plans.filter((p) => !p.done).sort((a, b) => a.planned_date.localeCompare(b.planned_date));
  const done = plans.filter((p) => p.done).sort((a, b) => b.planned_date.localeCompare(a.planned_date));

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800">Aşı Takvimi (Perşembe)</h2>
        {canManage && (
          <button type="button" onClick={() => setShowForm((v) => !v)} className="text-xs font-medium text-green-700 hover:underline">
            {showForm ? "Vazgeç" : "Aşı Ekle"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-2 rounded-md border border-neutral-200 p-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Aşı adı</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="örn. Şap" className="input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Tarih</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Hangi hayvanlara (opsiyonel)</span>
            <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="örn. 2 aylık buzağılar / 31-55 arası" className="input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Not (opsiyonel)</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="input" />
          </label>
          <button type="submit" disabled={saving || !name.trim()} className="btn-primary">
            {saving ? "Ekleniyor..." : "Ekle"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-neutral-400">Yükleniyor...</p>
      ) : pending.length === 0 && done.length === 0 ? (
        <p className="text-xs text-neutral-400">Planlanmış aşı yok.</p>
      ) : (
        <div className="space-y-1.5">
          {pending.map((p) => (
            <div key={p.id} className="flex items-start gap-2 rounded-md border border-neutral-200 px-2 py-1.5">
              {canManage && (
                <input type="checkbox" checked={false} onChange={() => toggleDone(p)} className="mt-0.5 h-4 w-4 accent-green-700" />
              )}
              <div className="flex-1">
                <p className="text-xs font-semibold text-neutral-800">
                  {p.vaccine_name}
                  <span className="ml-2 font-normal text-neutral-500">{formatDate(p.planned_date)}</span>
                </p>
                {p.target && <p className="text-[11px] text-neutral-500">{p.target}</p>}
                {p.notes && <p className="text-[11px] italic text-neutral-400">{p.notes}</p>}
              </div>
              {canManage && (
                <button type="button" onClick={() => handleDelete(p.id)} className="text-[11px] text-red-500 hover:underline">
                  Sil
                </button>
              )}
            </div>
          ))}

          {done.length > 0 && (
            <button type="button" onClick={() => setShowOld((v) => !v)} className="text-[11px] text-neutral-500 underline hover:no-underline">
              {showOld ? "Yapılanları gizle" : `Yapılanlar (${done.length})`}
            </button>
          )}
          {showOld &&
            done.map((p) => (
              <div key={p.id} className="flex items-start gap-2 rounded-md border border-green-100 bg-green-50/60 px-2 py-1.5 opacity-80">
                {canManage && (
                  <input type="checkbox" checked onChange={() => toggleDone(p)} className="mt-0.5 h-4 w-4 accent-green-700" />
                )}
                <div className="flex-1">
                  <p className="text-xs font-medium text-neutral-700 line-through">
                    {p.vaccine_name}
                    <span className="ml-2 font-normal text-neutral-500 no-underline">{formatDate(p.planned_date)}</span>
                  </p>
                  {p.target && <p className="text-[11px] text-neutral-500">{p.target}</p>}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
