"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createOpuBatch, createOpuSession, listAnimals, listProfiles } from "@/lib/data";
import { Animal, Profile } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { EarTagPicker } from "@/components/EarTagPicker";
import { todayIso } from "@/lib/format";

interface DonorRow {
  key: string;
  donorId: string | null;
  oocyteCount: string;
  gradeA: string;
  gradeB: string;
  gradeC: string;
  gradeD: string;
}

function emptyRow(): DonorRow {
  return {
    key: crypto.randomUUID(),
    donorId: null,
    oocyteCount: "",
    gradeA: "",
    gradeB: "",
    gradeC: "",
    gradeD: "",
  };
}

export default function NewOpuBatchPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [batchDate, setBatchDate] = useState(todayIso());
  const [technicianName, setTechnicianName] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<DonorRow[]>([emptyRow()]);

  useEffect(() => {
    Promise.all([listAnimals(), listProfiles()]).then(([a, p]) => {
      setAnimals(a);
      setProfiles(p);
    });
  }, []);

  function updateRow(key: string, patch: Partial<DonorRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  }

  const validRows = rows.filter((r) => r.donorId && r.oocyteCount.trim() !== "");
  const totalOocytes = validRows.reduce((sum, r) => sum + (Number(r.oocyteCount) || 0), 0);

  function toNullableNumber(v: string): number | null {
    return v.trim() === "" ? null : Number(v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validRows.length === 0) return;
    setSubmitting(true);
    try {
      const batch = await createOpuBatch({
        batch_date: batchDate,
        maturation_count: null,
        embryo_count: null,
        notes: notes.trim() || null,
        ai_analysis: null,
        ai_analysis_generated_at: null,
        created_by: profile?.id ?? null,
      });
      for (const row of validRows) {
        await createOpuSession({
          donor_animal_id: row.donorId!,
          batch_id: batch.id,
          session_date: batchDate,
          session_time: null,
          technician_name: technicianName.trim() || null,
          follicle_count_right: null,
          follicle_count_left: null,
          oocyte_count: Number(row.oocyteCount),
          oocyte_grade_a: toNullableNumber(row.gradeA),
          oocyte_grade_b: toNullableNumber(row.gradeB),
          oocyte_grade_c: toNullableNumber(row.gradeC),
          oocyte_grade_d: toNullableNumber(row.gradeD),
          cleaved_count: null,
          fertilization_bull_id: null,
          fertilization_semen_type: null,
          embryo_count: null,
          notes: null,
          created_by: profile?.id ?? null,
        });
      }
      router.push(`/opu/batch?id=${batch.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Yeni OPU Günü</h1>
      <p className="text-sm text-neutral-500">
        O gün OPU yapılan tüm donörleri ve topladıkları oosit sayısını tek seferde girin — hepsi aynı günün oosit
        havuzunda toplanır. Maturasyon ve embriyo sayıları bir sonraki aşamada, havuz sayfasından girilecek.
      </p>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tarih">
            <input type="date" value={batchDate} onChange={(e) => setBatchDate(e.target.value)} className="input" />
          </Field>
          <FieldBlock label="Veteriner Hekim/Tekniker">
            <div className="flex flex-wrap gap-2">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTechnicianName(p.full_name)}
                  className={`chip ${technicianName === p.full_name ? "chip-selected" : "chip-unselected"}`}
                >
                  {p.full_name}
                </button>
              ))}
            </div>
          </FieldBlock>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">Donörler</span>
            <span className="text-xs text-neutral-500">Toplam oosit: {totalOocytes}</span>
          </div>
          {rows.map((row, i) => (
            <div key={row.key} className="rounded-md border border-neutral-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500">Donör {i + 1}</span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Kaldır
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <span className="mb-1 block text-xs font-medium text-neutral-600">Donör hayvan</span>
                  <EarTagPicker
                    animals={animals}
                    selectedId={row.donorId}
                    onSelect={(id) => updateRow(row.key, { donorId: id })}
                    onClear={() => updateRow(row.key, { donorId: null })}
                  />
                </div>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-neutral-600">Oosit sayısı</span>
                  <input
                    type="number"
                    min={0}
                    value={row.oocyteCount}
                    onChange={(e) => updateRow(row.key, { oocyteCount: e.target.value })}
                    className="input"
                  />
                </label>
              </div>
              <div className="mt-2">
                <span className="mb-1 block text-xs font-medium text-neutral-600">Oosit kalitesi (opsiyonel)</span>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="A"
                    value={row.gradeA}
                    onChange={(e) => updateRow(row.key, { gradeA: e.target.value })}
                    className="input"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="B"
                    value={row.gradeB}
                    onChange={(e) => updateRow(row.key, { gradeB: e.target.value })}
                    className="input"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="C"
                    value={row.gradeC}
                    onChange={(e) => updateRow(row.key, { gradeC: e.target.value })}
                    className="input"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="D"
                    value={row.gradeD}
                    onChange={(e) => updateRow(row.key, { gradeD: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, emptyRow()])}
            className="btn-secondary"
          >
            + Donör ekle
          </button>
        </div>

        <Field label="Notlar (opsiyonel)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} />
        </Field>

        <button type="submit" disabled={submitting || validRows.length === 0} className="btn-primary">
          {submitting ? "Kaydediliyor..." : `Kaydet (${validRows.length} donör)`}
        </button>
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
