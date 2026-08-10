"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createOpuSession,
  deleteOpuBatch,
  deleteOpuSession,
  getOpuBatch,
  listAnimals,
  listOpuSessions,
  listProfiles,
  updateOpuBatch,
  updateOpuSession,
} from "@/lib/data";
import { Animal, OpuBatch, OpuSession, Profile } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { exportOpuBatchReportToPdf } from "@/lib/pdfExport";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { EarTagPicker } from "@/components/EarTagPicker";

function pct(numerator: number | null, denominator: number | null): string {
  if (numerator === null || denominator === null || denominator <= 0) return "-";
  return `%${Math.round((numerator / denominator) * 100)}`;
}

export default function OpuBatchPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Yükleniyor...</p>}>
      <OpuBatchContent />
    </Suspense>
  );
}

function OpuBatchContent() {
  const { profile } = useAuth();
  const canManage = hasPermission(profile, "can_manage_opu");
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");

  const [batch, setBatch] = useState<OpuBatch | null>(null);
  const [sessions, setSessions] = useState<OpuSession[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [showAddDonor, setShowAddDonor] = useState(false);
  const [addDonorId, setAddDonorId] = useState<string | null>(null);
  const [addOocyteCount, setAddOocyteCount] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [editingTechnician, setEditingTechnician] = useState(false);
  const [savingTechnician, setSavingTechnician] = useState(false);

  function refresh() {
    if (!id) return Promise.resolve();
    return Promise.all([getOpuBatch(id), listOpuSessions(id), listAnimals(), listProfiles()]).then(([b, s, a, p]) => {
      setBatch(b ?? null);
      setSessions(s);
      setAnimals(a);
      setProfiles(p);
      setLoading(false);
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!id) return <p className="text-sm text-red-600">OPU günü belirtilmedi.</p>;
  if (loading) return <p className="text-sm text-neutral-500">Yükleniyor...</p>;
  if (!batch) return <p className="text-sm text-red-600">Kayıt bulunamadı.</p>;

  const earTagFor = (animalId: string) => animals.find((a) => a.id === animalId)?.ear_tag ?? "?";
  const totalOocytes = sessions.reduce((sum, s) => sum + (s.oocyte_count ?? 0), 0);
  const gradeTotals = sessions.reduce(
    (acc, s) => ({
      a: acc.a + (s.oocyte_grade_a ?? 0),
      b: acc.b + (s.oocyte_grade_b ?? 0),
      c: acc.c + (s.oocyte_grade_c ?? 0),
      d: acc.d + (s.oocyte_grade_d ?? 0),
    }),
    { a: 0, b: 0, c: 0, d: 0 }
  );
  const technicianNames = Array.from(new Set(sessions.map((s) => s.technician_name).filter((n): n is string => !!n)));

  async function handleDelete() {
    setDeleting(true);
    await deleteOpuBatch(batch!.id);
    router.push("/opu");
  }

  async function handleAddDonor(e: React.FormEvent) {
    e.preventDefault();
    if (!addDonorId || addOocyteCount.trim() === "") return;
    setAddSubmitting(true);
    try {
      await createOpuSession({
        donor_animal_id: addDonorId,
        batch_id: batch!.id,
        session_date: batch!.batch_date,
        session_time: null,
        technician_name: technicianNames[0] ?? null,
        follicle_count_right: null,
        follicle_count_left: null,
        oocyte_count: Number(addOocyteCount),
        oocyte_grade_a: null,
        oocyte_grade_b: null,
        oocyte_grade_c: null,
        oocyte_grade_d: null,
        cleaved_count: null,
        fertilization_bull_id: null,
        fertilization_semen_type: null,
        embryo_count: null,
        notes: null,
        created_by: profile?.id ?? null,
      });
      setAddDonorId(null);
      setAddOocyteCount("");
      setShowAddDonor(false);
      await refresh();
    } finally {
      setAddSubmitting(false);
    }
  }

  async function handleRemoveDonor(sessionId: string) {
    await deleteOpuSession(sessionId);
    await refresh();
  }

  async function handleSetTechnician(name: string) {
    setSavingTechnician(true);
    try {
      await Promise.all(sessions.map((s) => updateOpuSession(s.id, { technician_name: name })));
      await refresh();
      setEditingTechnician(false);
    } finally {
      setSavingTechnician(false);
    }
  }

  async function handleExportPdf() {
    setExporting(true);
    try {
      exportOpuBatchReportToPdf({
        filename: `opu-gunu-${batch!.batch_date}.pdf`,
        batchDateLabel: formatDate(batch!.batch_date),
        generatedAtLabel: new Date().toLocaleString("tr-TR"),
        technicianNames,
        summary: [
          { label: "Donör Sayısı", value: String(sessions.length) },
          { label: "Toplanan Oosit", value: String(totalOocytes) },
          { label: "A / B / C / D Kalite", value: `${gradeTotals.a} / ${gradeTotals.b} / ${gradeTotals.c} / ${gradeTotals.d}` },
          { label: "Maturasyona Konulan", value: batch!.maturation_count !== null ? String(batch!.maturation_count) : "-" },
          { label: "Maturasyon Oranı", value: pct(batch!.maturation_count, totalOocytes) },
          { label: "Embriyoya Dönüşen", value: batch!.embryo_count !== null ? String(batch!.embryo_count) : "-" },
          { label: "Embriyoya Dönüşme Oranı", value: pct(batch!.embryo_count, batch!.maturation_count) },
        ],
        donorHeaders: ["Küpe No", "Oosit", "A", "B", "C", "D"],
        donorRows: sessions.map((s) => [
          earTagFor(s.donor_animal_id),
          s.oocyte_count ?? 0,
          s.oocyte_grade_a ?? 0,
          s.oocyte_grade_b ?? 0,
          s.oocyte_grade_c ?? 0,
          s.oocyte_grade_d ?? 0,
        ]),
        notes: batch!.notes,
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon="🥚"
        title={`OPU Günü: ${formatDate(batch.batch_date)}`}
        subtitle={`${sessions.length} donör · ${totalOocytes} oosit`}
        color="purple"
        backHref="/opu"
        actions={
          <>
            <button type="button" onClick={handleExportPdf} disabled={exporting} className="btn-secondary">
              {exporting ? "Hazırlanıyor..." : "PDF'e Aktar"}
            </button>
            {canManage && (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="text-xs font-medium text-red-600 hover:underline"
              >
                Sil
              </button>
            )}
          </>
        }
      />

      {confirmingDelete && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">
            Bu OPU gününü ve bağlı tüm donör kayıtlarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? "Siliniyor..." : "Evet, sil"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs transition-colors hover:bg-neutral-50"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Toplanan Oosit" value={totalOocytes} sub={`A ${gradeTotals.a} · B ${gradeTotals.b} · C ${gradeTotals.c} · D ${gradeTotals.d}`} />
        <StatCard label="Maturasyona Konulan" value={batch.maturation_count ?? "-"} sub={`Oran: ${pct(batch.maturation_count, totalOocytes)}`} />
        <StatCard label="Embriyoya Dönüşen" value={batch.embryo_count ?? "-"} sub={`Oran: ${pct(batch.embryo_count, batch.maturation_count)}`} />
        <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
          <p className="truncate text-2xl font-semibold text-neutral-900">
            {technicianNames.length > 0 ? technicianNames.join(", ") : "-"}
          </p>
          <p className="text-xs text-neutral-500">Veteriner Hekim/Tekniker</p>
          {canManage && sessions.length > 0 && (
            <button
              type="button"
              onClick={() => setEditingTechnician((v) => !v)}
              className="mt-1 text-xs font-medium text-green-700 hover:underline"
            >
              Düzenle
            </button>
          )}
        </div>
      </div>

      {editingTechnician && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
          <p className="mb-2 text-sm font-medium text-green-800">Bu havuzdaki tüm kayıtlar için veteriner hekim/tekniker seç</p>
          <div className="flex flex-wrap gap-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={savingTechnician}
                onClick={() => handleSetTechnician(p.full_name)}
                className={`chip ${technicianNames.length === 1 && technicianNames[0] === p.full_name ? "chip-selected" : "chip-unselected"}`}
              >
                {p.full_name}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setEditingTechnician(false)}
            disabled={savingTechnician}
            className="mt-2 text-xs text-neutral-500 underline hover:no-underline"
          >
            Vazgeç
          </button>
        </div>
      )}

      {canManage && <StageForm batch={batch} totalOocytes={totalOocytes} onSaved={(b) => setBatch(b)} />}

      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-800">Donör Bazlı Toplama (Verim) &middot; {sessions.length}</h2>
          {canManage && (
            <button type="button" onClick={() => setShowAddDonor((v) => !v)} className="text-xs font-medium text-green-700 hover:underline">
              + Donör ekle
            </button>
          )}
        </div>

        {showAddDonor && (
          <form onSubmit={handleAddDonor} className="mb-3 space-y-2 rounded-md border border-neutral-200 p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <EarTagPicker animals={animals} selectedId={addDonorId} onSelect={setAddDonorId} onClear={() => setAddDonorId(null)} />
              <input
                type="number"
                min={0}
                placeholder="Oosit sayısı"
                value={addOocyteCount}
                onChange={(e) => setAddOocyteCount(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={addSubmitting || !addDonorId || !addOocyteCount} className="btn-primary">
                {addSubmitting ? "Ekleniyor..." : "Ekle"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddDonor(false)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm transition-colors hover:bg-neutral-50"
              >
                Vazgeç
              </button>
            </div>
          </form>
        )}

        {sessions.length === 0 ? (
          <p className="text-sm text-neutral-400">Henüz donör eklenmedi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                  <th className="py-1.5 pr-2">Küpe No</th>
                  <th className="py-1.5 pr-2">Oosit</th>
                  <th className="py-1.5 pr-2">A</th>
                  <th className="py-1.5 pr-2">B</th>
                  <th className="py-1.5 pr-2">C</th>
                  <th className="py-1.5 pr-2">D</th>
                  {canManage && <th className="py-1.5 pr-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="py-1.5 pr-2 font-medium text-neutral-900">{earTagFor(s.donor_animal_id)}</td>
                    <td className="py-1.5 pr-2">{s.oocyte_count ?? "-"}</td>
                    <td className="py-1.5 pr-2">{s.oocyte_grade_a ?? "-"}</td>
                    <td className="py-1.5 pr-2">{s.oocyte_grade_b ?? "-"}</td>
                    <td className="py-1.5 pr-2">{s.oocyte_grade_c ?? "-"}</td>
                    <td className="py-1.5 pr-2">{s.oocyte_grade_d ?? "-"}</td>
                    {canManage && (
                      <td className="py-1.5 pr-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveDonor(s.id)}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Kaldır
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
      <p className="text-2xl font-semibold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
      {sub && <p className="mt-1 text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}

function StageForm({
  batch,
  totalOocytes,
  onSaved,
}: {
  batch: OpuBatch;
  totalOocytes: number;
  onSaved: (b: OpuBatch) => void;
}) {
  const [maturationCount, setMaturationCount] = useState(
    batch.maturation_count !== null ? String(batch.maturation_count) : ""
  );
  const [embryoCount, setEmbryoCount] = useState(batch.embryo_count !== null ? String(batch.embryo_count) : "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  function toNullableNumber(v: string): number | null {
    return v.trim() === "" ? null : Number(v);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const updated = await updateOpuBatch(batch.id, {
      maturation_count: toNullableNumber(maturationCount),
      embryo_count: toNullableNumber(embryoCount),
    });
    if (updated) onSaved(updated);
    setSaving(false);
    setEditing(false);
  }

  const bothSet = batch.maturation_count !== null && batch.embryo_count !== null;

  if (bothSet && !editing) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="text-sm font-medium text-green-800">Tüm laboratuvar aşamaları tamamlandı.</p>
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-green-700 underline hover:no-underline">
          Bilgileri düzelt
        </button>
      </div>
    );
  }

  // Duzenleme modunda (Bilgileri duzelt) her iki sayi da birden gosterilir;
  // normal akista ise sirasiyla once maturasyon, sonra embriyo sayisi sorulur.
  const showMaturationField = editing || batch.maturation_count === null;
  const showEmbryoField = editing || (batch.maturation_count !== null && batch.embryo_count === null);
  const question = editing
    ? "Havuz bilgilerini düzenle"
    : batch.maturation_count === null
      ? "Bu havuzdaki oositlerden kaçı maturasyona kondu?"
      : "Maturasyona konulanlardan kaçı embriyoya dönüştü?";
  const canSubmit = editing
    ? maturationCount.trim() !== "" || embryoCount.trim() !== ""
    : batch.maturation_count === null
      ? maturationCount.trim() !== ""
      : embryoCount.trim() !== "";

  return (
    <form onSubmit={handleSave} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
          {editing ? "Düzenleme" : "Laboratuvar sonucu bekleniyor"}
        </p>
        <label className="mt-1 block text-sm font-medium text-neutral-800">{question}</label>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {showMaturationField && (
          <label className="block">
            {editing && <span className="mb-1 block text-xs font-medium text-neutral-600">Maturasyona konulan</span>}
            <input
              type="number"
              min={0}
              max={totalOocytes}
              autoFocus
              value={maturationCount}
              onChange={(e) => setMaturationCount(e.target.value)}
              className="input"
              placeholder={`Sayı gir (toplam ${totalOocytes} oosit var)`}
            />
          </label>
        )}
        {showEmbryoField && (
          <label className="block">
            {editing && <span className="mb-1 block text-xs font-medium text-neutral-600">Embriyoya dönüşen</span>}
            <input
              type="number"
              min={0}
              max={Number(maturationCount) || undefined}
              value={embryoCount}
              onChange={(e) => setEmbryoCount(e.target.value)}
              className="input"
              placeholder={maturationCount ? `Sayı gir (${maturationCount} maturasyona konulmuştu)` : "Sayı gir"}
            />
          </label>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving || !canSubmit} className="btn-primary">
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
        {editing && (
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-neutral-500 underline hover:no-underline">
            Vazgeç
          </button>
        )}
      </div>
    </form>
  );
}
