"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listAnimals, listEmbryos, listOpuSessions } from "@/lib/data";
import { Animal, Embryo, OpuSession } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { OPU_STAGE_INFO, opuStageFor } from "@/lib/opuStage";
import { exportRowsToExcel } from "@/lib/excelExport";

export default function OpuSessionsPage() {
  const [sessions, setSessions] = useState<OpuSession[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [embryos, setEmbryos] = useState<Embryo[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([listOpuSessions(), listAnimals(), listEmbryos()]).then(([s, a, e]) => {
      setSessions(s);
      setAnimals(a);
      setEmbryos(e);
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
      await exportRowsToExcel(
        `opu-seanslari-${new Date().toISOString().slice(0, 10)}.xlsx`,
        "OPU Seansları",
        [
          "Küpe No",
          "Donör Adı",
          "Tarih",
          "Teknisyen",
          "Sağ Folikül",
          "Sol Folikül",
          "Oosit",
          "Bölünen",
          "Embriyo",
          "Notlar",
        ],
        exportCandidates.map((s) => {
          const donor = animals.find((a) => a.id === s.donor_animal_id);
          return [
            donor?.ear_tag ?? "?",
            donor?.name ?? "",
            formatDate(s.session_date),
            s.technician_name ?? "",
            s.follicle_count_right ?? "",
            s.follicle_count_left ?? "",
            s.oocyte_count ?? "",
            s.cleaved_count ?? "",
            s.embryo_count ?? embryoCountFor(s.id),
            s.notes ?? "",
          ];
        })
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">OPU Seansları</h1>
        <Link href="/opu/new" className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-800">
          Yeni OPU
        </Link>
      </div>

      <div className="card flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Başlangıç (opsiyonel)</span>
          <input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Bitiş (opsiyonel)</span>
          <input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} className="input" />
        </label>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || exportCandidates.length === 0}
          className="btn-secondary"
        >
          {exporting ? "Hazırlanıyor..." : `Excel'e Aktar (${exportCandidates.length})`}
        </button>
      </div>

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
                    <p className="text-xs text-neutral-400">{formatDate(s.session_date)}</p>
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
