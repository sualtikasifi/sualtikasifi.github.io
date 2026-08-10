"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listAnimals, listOpuBatches, listOpuSessions } from "@/lib/data";
import { Animal, OpuBatch, OpuSession } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { exportOpuReportToExcel } from "@/lib/excelExport";

interface Totals {
  count: number;
  oocytes: number;
}

function emptyTotals(): Totals {
  return { count: 0, oocytes: 0 };
}

function pct(numerator: number, denominator: number): string {
  if (denominator <= 0) return "-";
  return `%${Math.round((numerator / denominator) * 100)}`;
}

function pctOrNull(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

export default function OpuStatsPage() {
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

  const technicianStats = useMemo(() => {
    const map = new Map<string, Totals>();
    for (const s of sessions) {
      const key = s.technician_name?.trim() || "Belirtilmemiş";
      const t = map.get(key) ?? emptyTotals();
      t.count += 1;
      t.oocytes += s.oocyte_count ?? 0;
      map.set(key, t);
    }
    return Array.from(map.entries())
      .map(([name, t]) => ({ name, ...t }))
      .sort((a, b) => b.oocytes - a.oocytes);
  }, [sessions]);

  const donorStats = useMemo(() => {
    const map = new Map<string, Totals>();
    for (const s of sessions) {
      const t = map.get(s.donor_animal_id) ?? emptyTotals();
      t.count += 1;
      t.oocytes += s.oocyte_count ?? 0;
      map.set(s.donor_animal_id, t);
    }
    return Array.from(map.entries())
      .map(([animalId, t]) => ({ animalId, ...t }))
      .sort((a, b) => b.oocytes - a.oocytes);
  }, [sessions]);

  const batchStats = useMemo(() => {
    return batches
      .map((b) => {
        const batchSessions = sessions.filter((s) => s.batch_id === b.id);
        const totalOocytes = batchSessions.reduce((sum, s) => sum + (s.oocyte_count ?? 0), 0);
        return { batch: b, donorCount: batchSessions.length, totalOocytes };
      })
      .sort((a, b) => b.batch.batch_date.localeCompare(a.batch.batch_date));
  }, [batches, sessions]);

  const grandTotals = useMemo(() => {
    const totalOocytes = batchStats.reduce((sum, b) => sum + b.totalOocytes, 0);
    const totalMaturation = batchStats.reduce((sum, b) => sum + (b.batch.maturation_count ?? 0), 0);
    const totalEmbryo = batchStats.reduce((sum, b) => sum + (b.batch.embryo_count ?? 0), 0);
    return { totalOocytes, totalMaturation, totalEmbryo };
  }, [batchStats]);

  async function handleExport() {
    setExporting(true);
    try {
      await exportOpuReportToExcel({
        filename: `opu-istatistikleri-${new Date().toISOString().slice(0, 10)}.xlsx`,
        reportTitle: "OPU / Embriyo Programı İstatistikleri",
        generatedAtLabel: new Date().toLocaleString("tr-TR"),
        dateRangeLabel: "Tüm kayıtlar",
        summary: [
          { label: "Toplam OPU Günü", value: batches.length },
          { label: "Toplam Donör Kaydı", value: sessions.length },
          { label: "Toplam Oosit", value: grandTotals.totalOocytes },
          { label: "Toplam Maturasyona Konulan", value: grandTotals.totalMaturation },
          { label: "Toplam Embriyo", value: grandTotals.totalEmbryo },
          {
            label: "Genel Maturasyon Oranı",
            value: pctOrNull(grandTotals.totalMaturation, grandTotals.totalOocytes) ?? 0,
            percent: true,
          },
          {
            label: "Genel Embriyoya Dönüşme Oranı",
            value: pctOrNull(grandTotals.totalEmbryo, grandTotals.totalMaturation) ?? 0,
            percent: true,
          },
        ],
        sessionHeaders: ["Tarih", "Donör Sayısı", "Toplam Oosit", "Maturasyona Konulan", "Embriyoya Dönüşen", "Maturasyon Oranı", "Embriyo Oranı"],
        sessionRows: batchStats.map(({ batch, donorCount, totalOocytes }) => [
          formatDate(batch.batch_date),
          donorCount,
          totalOocytes,
          batch.maturation_count,
          batch.embryo_count,
          pctOrNull(batch.maturation_count ?? 0, totalOocytes),
          pctOrNull(batch.embryo_count ?? 0, batch.maturation_count ?? 0),
        ]),
        sessionPercentColumns: [5, 6],
        technicianHeaders: ["Veteriner Hekim/Tekniker", "Donör Sayısı", "Toplam Oosit", "Ort. Oosit/Donör"],
        technicianRows: technicianStats.map((t) => [t.name, t.count, t.oocytes, Number((t.oocytes / t.count).toFixed(1))]),
        technicianPercentColumns: [],
        donorHeaders: ["Küpe No", "Kaç Kez OPU", "Toplam Oosit", "Ort. Oosit/OPU"],
        donorRows: donorStats.map((d) => [
          earTagFor(d.animalId),
          d.count,
          d.oocytes,
          Number((d.oocytes / d.count).toFixed(1)),
        ]),
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">OPU İstatistikleri</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || batches.length === 0}
            className="btn-secondary"
          >
            {exporting ? "Hazırlanıyor..." : "Excel'e Aktar"}
          </button>
          <Link href="/opu" className="text-xs font-medium text-green-700 hover:underline">
            OPU listesine dön
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : batches.length === 0 ? (
        <p className="text-sm text-neutral-400">Kayıt yok.</p>
      ) : (
        <>
          <div className="card">
            <h2 className="mb-2 text-sm font-semibold text-neutral-800">Gün Bazlı Havuz Performansı</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                    <th className="py-1.5 pr-2">Tarih</th>
                    <th className="py-1.5 pr-2">Donör</th>
                    <th className="py-1.5 pr-2">Oosit</th>
                    <th className="py-1.5 pr-2">Maturasyon</th>
                    <th className="py-1.5 pr-2">Embriyo</th>
                    <th className="py-1.5 pr-2">Maturasyon Oranı</th>
                    <th className="py-1.5 pr-2">Embriyo Oranı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {batchStats.map(({ batch, donorCount, totalOocytes }) => (
                    <tr key={batch.id}>
                      <td className="py-1.5 pr-2 font-medium text-neutral-900">
                        <Link href={`/opu/batch?id=${batch.id}`} className="hover:underline">
                          {formatDate(batch.batch_date)}
                        </Link>
                      </td>
                      <td className="py-1.5 pr-2">{donorCount}</td>
                      <td className="py-1.5 pr-2">{totalOocytes}</td>
                      <td className="py-1.5 pr-2">{batch.maturation_count ?? "-"}</td>
                      <td className="py-1.5 pr-2">{batch.embryo_count ?? "-"}</td>
                      <td className="py-1.5 pr-2">{pct(batch.maturation_count ?? 0, totalOocytes)}</td>
                      <td className="py-1.5 pr-2">{pct(batch.embryo_count ?? 0, batch.maturation_count ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-2 text-sm font-semibold text-neutral-800">Veteriner Hekim/Tekniker Başarı Oranları</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                    <th className="py-1.5 pr-2">Veteriner Hekim/Tekniker</th>
                    <th className="py-1.5 pr-2">Donör Sayısı</th>
                    <th className="py-1.5 pr-2">Toplam Oosit</th>
                    <th className="py-1.5 pr-2">Ort. Oosit/Donör</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {technicianStats.map((t) => (
                    <tr key={t.name}>
                      <td className="py-1.5 pr-2 font-medium text-neutral-900">{t.name}</td>
                      <td className="py-1.5 pr-2">{t.count}</td>
                      <td className="py-1.5 pr-2">{t.oocytes}</td>
                      <td className="py-1.5 pr-2">{(t.oocytes / t.count).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-2 text-sm font-semibold text-neutral-800">Donör Verimleri</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                    <th className="py-1.5 pr-2">Donör</th>
                    <th className="py-1.5 pr-2">Kaç Kez OPU</th>
                    <th className="py-1.5 pr-2">Toplam Oosit</th>
                    <th className="py-1.5 pr-2">Ort. Oosit/OPU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {donorStats.map((d) => (
                    <tr key={d.animalId}>
                      <td className="py-1.5 pr-2 font-medium text-neutral-900">{earTagFor(d.animalId)}</td>
                      <td className="py-1.5 pr-2">{d.count}</td>
                      <td className="py-1.5 pr-2">{d.oocytes}</td>
                      <td className="py-1.5 pr-2">{(d.oocytes / d.count).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
