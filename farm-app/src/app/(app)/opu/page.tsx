"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listAnimals, listOpuBatches, listOpuSessions } from "@/lib/data";
import { Animal, OpuBatch, OpuSession } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { exportRowsToExcel } from "@/lib/excelExport";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";

function pct(numerator: number | null, denominator: number): string {
  if (numerator === null || denominator <= 0) return "-";
  return `%${Math.round((numerator / denominator) * 100)}`;
}

export default function OpuBatchesPage() {
  const { profile } = useAuth();
  const [batches, setBatches] = useState<OpuBatch[]>([]);
  const [sessions, setSessions] = useState<OpuSession[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([listOpuBatches(), listOpuSessions(), listAnimals()]).then(([b, s, a]) => {
      setBatches(b);
      setSessions(s);
      setAnimals(a);
      setLoading(false);
    });
  }, []);

  const earTagFor = (animalId: string) => animals.find((a) => a.id === animalId)?.ear_tag ?? "?";

  const batchInfo = useMemo(() => {
    return batches
      .map((b) => {
        const batchSessions = sessions.filter((s) => s.batch_id === b.id);
        const totalOocytes = batchSessions.reduce((sum, s) => sum + (s.oocyte_count ?? 0), 0);
        const gradeTotals = batchSessions.reduce(
          (acc, s) => ({
            a: acc.a + (s.oocyte_grade_a ?? 0),
            b: acc.b + (s.oocyte_grade_b ?? 0),
            c: acc.c + (s.oocyte_grade_c ?? 0),
            d: acc.d + (s.oocyte_grade_d ?? 0),
          }),
          { a: 0, b: 0, c: 0, d: 0 }
        );
        const technicianNames = Array.from(
          new Set(batchSessions.map((s) => s.technician_name).filter((n): n is string => !!n))
        );
        return { batch: b, donorCount: batchSessions.length, totalOocytes, gradeTotals, technicianNames };
      })
      .sort((a, b) => b.batch.batch_date.localeCompare(a.batch.batch_date));
  }, [batches, sessions]);

  // Yeniden tasarim oncesi (havuz sistemine gecmeden) tek tek eklenmis,
  // hicbir batch'e bagli olmayan eski kayitlar - gorunmez olmasinlar diye
  // ayri bir listede, eski gorunumleriyle birlikte gosteriliyor.
  const legacySessions = useMemo(() => sessions.filter((s) => !s.batch_id), [sessions]);

  async function handleExport() {
    setExporting(true);
    try {
      const headers = [
        "Tarih",
        "Donör Sayısı",
        "Toplam Oosit",
        "Maturasyona Konulan",
        "Maturasyon Oranı",
        "Embriyoya Dönüşen",
        "Embriyoya Dönüşme Oranı",
        "Veteriner Hekim/Tekniker",
        "Notlar",
      ];
      const rows = batchInfo.map(({ batch, donorCount, totalOocytes, technicianNames }) => [
        formatDate(batch.batch_date),
        donorCount,
        totalOocytes,
        batch.maturation_count ?? "-",
        pct(batch.maturation_count, totalOocytes),
        batch.embryo_count ?? "-",
        pct(batch.embryo_count, batch.maturation_count ?? 0),
        technicianNames.join(", ") || "-",
        batch.notes ?? "-",
      ]);
      await exportRowsToExcel(
        `opu-gunleri-${new Date().toISOString().slice(0, 10)}.xlsx`,
        "OPU Günleri",
        headers,
        rows,
        [14, 12, 12, 16, 14, 16, 18, 20, 24]
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon="🧬"
        title="OPU Günleri"
        subtitle="Gün bazlı oosit havuzu, maturasyon ve embriyo takibi"
        color="purple"
        actions={
          <>
            <Link href="/opu/stats" className="btn-secondary">
              İstatistikler
            </Link>
            <button type="button" onClick={handleExport} disabled={exporting || batchInfo.length === 0} className="btn-secondary">
              {exporting ? "Hazırlanıyor..." : "Excel'e Aktar"}
            </button>
            {hasPermission(profile, "can_manage_opu") && (
              <Link href="/opu/new" className="btn-primary">
                + Yeni OPU
              </Link>
            )}
          </>
        }
      />

      {loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : batchInfo.length === 0 ? (
        <p className="text-sm text-neutral-400">Kayıt yok.</p>
      ) : (
        <div className="space-y-3">
          {batchInfo.map(({ batch, donorCount, totalOocytes, gradeTotals, technicianNames }) => {
            const stageLabel =
              batch.maturation_count === null
                ? "Maturasyon bekleniyor"
                : batch.embryo_count === null
                  ? "Embriyo sayımı bekleniyor"
                  : "Tamamlandı";
            const stageDone = batch.maturation_count !== null && batch.embryo_count !== null;
            const stageStarted = batch.maturation_count !== null;
            return (
              <Link
                key={batch.id}
                href={`/opu/batch?id=${batch.id}`}
                className="card block transition-all hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-neutral-900">{formatDate(batch.batch_date)}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          stageDone
                            ? "bg-green-100 text-green-800"
                            : stageStarted
                              ? "bg-sky-100 text-sky-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {stageLabel}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {donorCount} donör{technicianNames.length > 0 && ` · ${technicianNames.join(", ")}`}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MiniStat
                    label="Toplanan Oosit"
                    value={totalOocytes}
                    sub={`A ${gradeTotals.a} · B ${gradeTotals.b} · C ${gradeTotals.c} · D ${gradeTotals.d}`}
                  />
                  <MiniStat
                    label="Ort. Oosit/Donör"
                    value={donorCount > 0 ? (totalOocytes / donorCount).toFixed(1) : "-"}
                  />
                  <MiniStat
                    label="Maturasyon"
                    value={batch.maturation_count ?? "-"}
                    sub={`Oran: ${pct(batch.maturation_count, totalOocytes)}`}
                  />
                  <MiniStat
                    label="Embriyo"
                    value={batch.embryo_count ?? "-"}
                    sub={`Oran: ${pct(batch.embryo_count, batch.maturation_count ?? 0)}`}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {legacySessions.length > 0 && (
        <div>
          <h2 className="mb-1 text-sm font-semibold text-neutral-800">
            Eski Kayıtlar (havuz sistemi öncesi) &middot; {legacySessions.length}
          </h2>
          <div className="card-list">
            {legacySessions.map((s) => (
              <Link
                key={s.id}
                href={`/opu/detail?id=${s.id}`}
                className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0 transition-colors hover:bg-neutral-50"
              >
                <span className="font-medium text-neutral-900">{earTagFor(s.donor_animal_id)}</span>
                <span className="text-neutral-500">
                  {s.oocyte_count ?? "-"} oosit &middot; {s.embryo_count ?? "-"} embriyo &middot; {formatDate(s.session_date)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-neutral-100 bg-neutral-50/60 px-2.5 py-2">
      <p className="text-lg font-semibold text-neutral-900">{value}</p>
      <p className="text-[11px] text-neutral-500">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-neutral-400">{sub}</p>}
    </div>
  );
}
