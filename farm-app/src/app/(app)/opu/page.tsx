"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listAnimals, listBulls, listEmbryos, listOpuSessions } from "@/lib/data";
import { Animal, Bull, Embryo, OpuSession } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { OPU_STAGE_INFO, opuStageFor } from "@/lib/opuStage";
import { exportOpuReportToExcel } from "@/lib/excelExport";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

function formatDateTime(d: Date): string {
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SEMEN_TYPE_LABELS: Record<string, string> = {
  konvansiyonel: "Konvansiyonel",
  disi: "Dişi",
};

export default function OpuSessionsPage() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<OpuSession[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [embryos, setEmbryos] = useState<Embryo[]>([]);
  const [bulls, setBulls] = useState<Bull[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    Promise.all([listOpuSessions(), listAnimals(), listEmbryos(), listBulls()]).then(([s, a, e, b]) => {
      setSessions(s);
      setAnimals(a);
      setEmbryos(e);
      setBulls(b);
      setLoading(false);
    });
  }, []);

  const earTagFor = (animalId: string) => animals.find((a) => a.id === animalId)?.ear_tag ?? "?";
  const embryoCountFor = (sessionId: string) => embryos.filter((e) => e.opu_session_id === sessionId).length;
  const totalFollicles = (s: OpuSession) =>
    s.follicle_count_right !== null || s.follicle_count_left !== null
      ? (s.follicle_count_right ?? 0) + (s.follicle_count_left ?? 0)
      : null;

  const exportCandidates = useMemo(() => {
    return sessions.filter((s) => {
      if (exportFrom && s.session_date < exportFrom) return false;
      if (exportTo && s.session_date > exportTo) return false;
      return true;
    });
  }, [sessions, exportFrom, exportTo]);

  async function handleExport() {
    setExporting(true);
    try {
      const pctOrNull = (numerator: number, denominator: number): number | null =>
        denominator > 0 ? numerator / denominator : null;

      const dateRangeLabel =
        exportFrom || exportTo
          ? `Dönem: ${exportFrom ? formatDate(exportFrom) : "başlangıç"} - ${exportTo ? formatDate(exportTo) : "bugün"}`
          : "Dönem: Tüm kayıtlar";

      // --- OPU Seansları (detay) ---
      const sessionHeaders = [
        "Sıra No",
        "Küpe No",
        "Donör Adı",
        "Irk",
        "Tarih",
        "Saat",
        "Veteriner Hekim/Tekniker",
        "Sağ Folikül",
        "Sol Folikül",
        "Toplam Folikül",
        "Toplanan Oosit",
        "Oosit Verimi",
        "A Kalite",
        "B Kalite",
        "C Kalite",
        "D Kalite",
        "Kaliteli Oosit Oranı (A+B)",
        "Bölünen (Cleavage)",
        "Bölünme Oranı",
        "Fertilizasyon Spermasi",
        "Embriyo Sayısı",
        "Embriyo Verimi",
        "Aşama Durumu",
        "Notlar",
      ];
      const sortedCandidates = [...exportCandidates].sort((a, b) => b.session_date.localeCompare(a.session_date));
      const sessionRows = sortedCandidates.map((s, i) => {
        const donor = animals.find((a) => a.id === s.donor_animal_id);
        const follicles = totalFollicles(s);
        const embryoCount = s.embryo_count ?? embryoCountFor(s.id);
        const fertilizationBull = s.fertilization_bull_id ? bulls.find((b) => b.id === s.fertilization_bull_id) : null;
        const stage = opuStageFor(s);
        return [
          i + 1,
          donor?.ear_tag ?? "?",
          donor?.name ?? "-",
          donor?.breed ?? "-",
          formatDate(s.session_date),
          s.session_time?.slice(0, 5) ?? "-",
          s.technician_name ?? "-",
          s.follicle_count_right,
          s.follicle_count_left,
          follicles,
          s.oocyte_count,
          pctOrNull(s.oocyte_count ?? 0, follicles ?? 0),
          s.oocyte_grade_a,
          s.oocyte_grade_b,
          s.oocyte_grade_c,
          s.oocyte_grade_d,
          pctOrNull((s.oocyte_grade_a ?? 0) + (s.oocyte_grade_b ?? 0), s.oocyte_count ?? 0),
          s.cleaved_count,
          pctOrNull(s.cleaved_count ?? 0, s.oocyte_count ?? 0),
          fertilizationBull
            ? `${fertilizationBull.name} (${SEMEN_TYPE_LABELS[s.fertilization_semen_type ?? ""] ?? s.fertilization_semen_type})`
            : "-",
          embryoCount,
          pctOrNull(embryoCount, s.oocyte_count ?? 0),
          stage === "done" ? "Tamamlandı" : OPU_STAGE_INFO[stage].question,
          s.notes ?? "-",
        ];
      });

      // --- Veteriner Performansı ---
      interface Totals {
        sessionCount: number;
        follicles: number;
        oocytes: number;
        cleaved: number;
        embryos: number;
      }
      const emptyTotals = (): Totals => ({ sessionCount: 0, follicles: 0, oocytes: 0, cleaved: 0, embryos: 0 });

      const techMap = new Map<string, Totals>();
      const donorMap = new Map<string, Totals>();
      for (const s of exportCandidates) {
        const follicles = (s.follicle_count_right ?? 0) + (s.follicle_count_left ?? 0);
        const embryoCount = s.embryo_count ?? embryoCountFor(s.id);

        const techKey = s.technician_name?.trim() || "Belirtilmemiş";
        const tt = techMap.get(techKey) ?? emptyTotals();
        tt.sessionCount += 1;
        tt.follicles += follicles;
        tt.oocytes += s.oocyte_count ?? 0;
        tt.cleaved += s.cleaved_count ?? 0;
        tt.embryos += embryoCount;
        techMap.set(techKey, tt);

        const dt = donorMap.get(s.donor_animal_id) ?? emptyTotals();
        dt.sessionCount += 1;
        dt.follicles += follicles;
        dt.oocytes += s.oocyte_count ?? 0;
        dt.cleaved += s.cleaved_count ?? 0;
        dt.embryos += embryoCount;
        donorMap.set(s.donor_animal_id, dt);
      }

      const technicianHeaders = [
        "Veteriner Hekim/Tekniker",
        "Seans Sayısı",
        "Toplam Folikül",
        "Toplam Oosit",
        "Toplam Bölünen",
        "Toplam Embriyo",
        "Oosit/Folikül",
        "Embriyo/Oosit",
      ];
      const technicianRows = Array.from(techMap.entries())
        .sort((a, b) => b[1].embryos - a[1].embryos)
        .map(([name, t]) => [
          name,
          t.sessionCount,
          t.follicles,
          t.oocytes,
          t.cleaved,
          t.embryos,
          pctOrNull(t.oocytes, t.follicles),
          pctOrNull(t.embryos, t.oocytes),
        ]);

      const donorHeaders = [
        "Küpe No",
        "Donör Adı",
        "Irk",
        "Seans Sayısı",
        "Toplam Folikül",
        "Toplam Oosit",
        "Toplam Bölünen",
        "Toplam Embriyo",
        "Ort. Embriyo/Seans",
      ];
      const donorRows = Array.from(donorMap.entries())
        .sort((a, b) => b[1].embryos - a[1].embryos)
        .map(([animalId, t]) => {
          const donor = animals.find((a) => a.id === animalId);
          return [
            donor?.ear_tag ?? "?",
            donor?.name ?? "-",
            donor?.breed ?? "-",
            t.sessionCount,
            t.follicles,
            t.oocytes,
            t.cleaved,
            t.embryos,
            Number((t.embryos / t.sessionCount).toFixed(1)),
          ];
        });

      // --- Özet ---
      const grandTotals = Array.from(techMap.values()).reduce(
        (acc, t) => ({
          sessionCount: acc.sessionCount + t.sessionCount,
          follicles: acc.follicles + t.follicles,
          oocytes: acc.oocytes + t.oocytes,
          cleaved: acc.cleaved + t.cleaved,
          embryos: acc.embryos + t.embryos,
        }),
        emptyTotals()
      );
      const uniqueDonorCount = donorMap.size;

      await exportOpuReportToExcel({
        filename: `opu-raporu-${new Date().toISOString().slice(0, 10)}.xlsx`,
        reportTitle: "OPU / Embriyo Programı Raporu",
        generatedAtLabel: formatDateTime(new Date()),
        dateRangeLabel,
        summary: [
          { label: "Toplam OPU Seansı", value: grandTotals.sessionCount },
          { label: "Toplam Donör Sayısı", value: uniqueDonorCount },
          { label: "Toplam Folikül", value: grandTotals.follicles },
          { label: "Toplam Oosit", value: grandTotals.oocytes },
          { label: "Toplam Bölünen (Cleavage)", value: grandTotals.cleaved },
          { label: "Toplam Embriyo", value: grandTotals.embryos },
          { label: "Genel Oosit Verimi (Oosit/Folikül)", value: pctOrNull(grandTotals.oocytes, grandTotals.follicles) ?? 0, percent: true },
          { label: "Genel Bölünme Oranı (Bölünen/Oosit)", value: pctOrNull(grandTotals.cleaved, grandTotals.oocytes) ?? 0, percent: true },
          { label: "Genel Embriyo Verimi (Embriyo/Oosit)", value: pctOrNull(grandTotals.embryos, grandTotals.oocytes) ?? 0, percent: true },
          {
            label: "Seans Başına Ortalama Embriyo",
            value: grandTotals.sessionCount > 0 ? Number((grandTotals.embryos / grandTotals.sessionCount).toFixed(1)) : 0,
          },
          {
            label: "Donör Başına Ortalama Embriyo",
            value: uniqueDonorCount > 0 ? Number((grandTotals.embryos / uniqueDonorCount).toFixed(1)) : 0,
          },
        ],
        sessionHeaders,
        sessionRows,
        sessionPercentColumns: [11, 16, 18, 21],
        technicianHeaders,
        technicianRows,
        technicianPercentColumns: [6, 7],
        donorHeaders,
        donorRows,
      });
      setShowExportModal(false);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">OPU Seansları</h1>
        <div className="flex items-center gap-2">
          <Link href="/opu/stats" className="btn-secondary">
            OPU İstatistikleri
          </Link>
          <button type="button" onClick={() => setShowExportModal(true)} className="btn-secondary">
            Excel&apos;e Aktar
          </button>
          {hasPermission(profile, "can_manage_opu") && (
            <Link href="/opu/new" className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-800">
              Yeni OPU
            </Link>
          )}
        </div>
      </div>

      {showExportModal && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowExportModal(false)}
        >
          <div className="card w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-semibold text-neutral-800">Excel&apos;e Aktar</h2>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Başlangıç (opsiyonel)</span>
              <input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} className="input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Bitiş (opsiyonel)</span>
              <input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} className="input" />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || exportCandidates.length === 0}
                className="btn-primary"
              >
                {exporting ? "Hazırlanıyor..." : `Aktar (${exportCandidates.length})`}
              </button>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm transition-colors hover:bg-neutral-50"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-neutral-400">Kayıt yok.</p>
      ) : (
        <div className="card-list">
          {sessions.map((s) => {
            const stage = opuStageFor(s);
            return (
              <Link
                key={s.id}
                href={`/opu/detail?id=${s.id}`}
                className="block border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0 transition-colors hover:bg-neutral-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-neutral-900">{earTagFor(s.donor_animal_id)}</span>
                    <span className="ml-2 text-neutral-500">(Donör)</span>
                    {s.technician_name && <p className="text-xs text-neutral-400">{s.technician_name}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-neutral-600">
                      {totalFollicles(s) ?? "-"} folikül &middot; {s.oocyte_count ?? "-"} oosit &middot;{" "}
                      {s.cleaved_count ?? "-"} bölünen &middot; {s.embryo_count ?? embryoCountFor(s.id)} embriyo
                    </p>
                    <p className="text-xs text-neutral-400">
                      {formatDate(s.session_date)}
                      {s.session_time && ` · ${s.session_time.slice(0, 5)}`}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  {stage === "done" ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Tüm aşamalar tamamlandı
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Sıradaki soru: {OPU_STAGE_INFO[stage].question}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
