"use client";

import { useEffect, useState } from "react";
import { Animal, CalfProtocol, CalfProtocolDay, CalfTreatment, CalfTreatmentCourse, Profile } from "@/lib/types";
import { todayIso } from "@/lib/format";
import { exportRowsToExcel } from "@/lib/excelExport";
import { listProfiles } from "@/lib/data";

interface Props {
  courses: CalfTreatmentCourse[];
  protocols: CalfProtocol[];
  protocolDays: CalfProtocolDay[];
  animals: Animal[];
  treatments: CalfTreatment[];
  canManage: boolean;
  onLogDone: (input: {
    course: CalfTreatmentCourse;
    day: number;
    diagnosis: string;
    medicines: string;
    note: string | null;
  }) => Promise<void>;
  // Yanlislikla "Yapildi" isaretlenirse geri almak icin: ilgili tedavi
  // kaydini siler.
  onUndo: (treatmentId: string) => Promise<void>;
  // Verilmezse bugun kullanilir (oda sayfalarindaki varsayilan davranis).
  date?: string;
  heading?: string;
  // Verilirse tabloya konum sutunu eklenir (Tedavi Listesi sayfasi icin).
  locationFor?: (animalId: string) => string | null;
  // false ise gorev yokken kart tamamen gizlenmez, bos mesaj gosterilir.
  hideWhenEmpty?: boolean;
}

interface Row {
  course: CalfTreatmentCourse;
  earTag: string;
  location: string | null;
  protocolName: string;
  day: number;
  maxDay: number;
  medicines: string;
  done: boolean;
  doneTreatmentId: string | null;
  doneBy: string | null;
}

// Aktif tedavi kurlerinden secilen gunun gorev tablosu: hangi buzagiya o
// gun protokolun kacinci gunu ve hangi ilaclar uygulanacak.
export function DailyTreatmentTable({
  courses,
  protocols,
  protocolDays,
  animals,
  treatments,
  canManage,
  onLogDone,
  onUndo,
  date,
  heading = "Bugünün Tedavi Görevleri",
  locationFor,
  hideWhenEmpty = true,
}: Props) {
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    listProfiles().then(setProfiles);
  }, []);

  const nameFor = (id: string | null): string | null =>
    id ? (profiles.find((p) => p.id === id)?.full_name ?? null) : null;

  const targetDate = date ?? todayIso();
  const rows: Row[] = [];
  for (const course of courses) {
    if (course.status !== "aktif") continue;
    const protocol = protocols.find((p) => p.id === course.protocol_id);
    const days = protocolDays.filter((d) => d.protocol_id === course.protocol_id).sort((a, b) => a.day_number - b.day_number);
    if (!protocol || days.length === 0) continue;
    const maxDay = days[days.length - 1].day_number;
    const diff = Math.floor(
      (new Date(`${targetDate}T00:00:00`).getTime() - new Date(`${course.start_date}T00:00:00`).getTime()) / 86400000
    );
    const day = diff + 1;
    if (day < 1 || day > maxDay) continue;
    const meds = days.find((d) => d.day_number === day)?.medicines;
    if (!meds) continue;
    const animal = animals.find((a) => a.id === course.animal_id);
    const doneRecord = treatments.find((t) => t.course_id === course.id && t.treatment_date === targetDate);
    rows.push({
      course,
      earTag: animal?.ear_tag ?? "?",
      location: locationFor && animal ? locationFor(animal.id) : null,
      protocolName: protocol.name,
      day,
      maxDay,
      medicines: meds,
      done: !!doneRecord,
      doneTreatmentId: doneRecord?.id ?? null,
      doneBy: doneRecord?.created_by ?? null,
    });
  }

  if (rows.length === 0 && hideWhenEmpty) return null;
  rows.sort((a, b) => Number(a.done) - Number(b.done) || a.earTag.localeCompare(b.earTag, "tr", { numeric: true }));

  async function markDone(row: Row) {
    if (!window.confirm(`${row.earTag} için bu tedaviyi "Yapıldı" olarak işaretlemek istediğinize emin misiniz?`)) return;
    setSavingId(row.course.id);
    await onLogDone({
      course: row.course,
      day: row.day,
      diagnosis: row.protocolName,
      medicines: row.medicines,
      note: noteFor === row.course.id && noteText.trim() ? noteText.trim() : null,
    });
    setSavingId(null);
    setNoteFor(null);
    setNoteText("");
  }

  async function undoDone(row: Row) {
    if (!row.doneTreatmentId) return;
    if (!window.confirm(`${row.earTag} için "Yapıldı" işaretini geri almak istediğinize emin misiniz? Kayıt silinecek.`))
      return;
    setSavingId(row.course.id);
    await onUndo(row.doneTreatmentId);
    setSavingId(null);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportRowsToExcel(
        `tedavi-listesi-${targetDate}`,
        "Tedavi Listesi",
        [
          "Küpe",
          ...(locationFor ? ["Konum"] : []),
          "Protokol",
          "Gün",
          "İlaçlar",
          "Durum",
        ],
        rows.map((row) => [
          row.earTag,
          ...(locationFor ? [row.location ?? "-"] : []),
          row.protocolName,
          `${row.day}/${row.maxDay}`,
          row.medicines,
          row.done ? `Yapıldı (${nameFor(row.doneBy) ?? "?"})` : "Bekliyor",
        ])
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-800">{heading}</h2>
        {rows.length > 0 && (
          <button type="button" onClick={handleExport} disabled={exporting} className="btn-secondary shrink-0 text-xs">
            {exporting ? "Hazırlanıyor..." : "Excel'e Aktar"}
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-400">Bu tarih için görev yok.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500">
                <th className="py-1.5 pr-2 font-medium">Küpe</th>
                {locationFor && <th className="py-1.5 pr-2 font-medium">Konum</th>}
                <th className="py-1.5 pr-2 font-medium">Protokol</th>
                <th className="py-1.5 pr-2 font-medium">Gün</th>
                <th className="py-1.5 pr-2 font-medium">İlaçlar</th>
                <th className="py-1.5 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.course.id} className={`border-b border-neutral-100 ${row.done ? "opacity-60" : ""}`}>
                  <td className="py-1.5 pr-2 font-semibold text-neutral-900">{row.earTag}</td>
                  {locationFor && <td className="py-1.5 pr-2 text-neutral-500">{row.location ?? "-"}</td>}
                  <td className="py-1.5 pr-2 text-neutral-700">{row.protocolName}</td>
                  <td className="py-1.5 pr-2 text-neutral-700">
                    {row.day}/{row.maxDay}
                  </td>
                  <td className="py-1.5 pr-2 text-neutral-600">{row.medicines}</td>
                  <td className="py-1.5">
                    {row.done ? (
                      canManage ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-green-700">Yapıldı</span>
                            <button
                              type="button"
                              disabled={savingId === row.course.id}
                              onClick={() => undoDone(row)}
                              className="text-[11px] font-medium text-red-600 underline hover:no-underline disabled:opacity-50"
                            >
                              {savingId === row.course.id ? "..." : "Geri Al"}
                            </button>
                          </div>
                          <span className="text-[10px] text-neutral-400">{nameFor(row.doneBy) ?? "Bilinmiyor"}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-green-700">Yapıldı</span>
                          <span className="text-[10px] text-neutral-400">{nameFor(row.doneBy) ?? "Bilinmiyor"}</span>
                        </div>
                      )
                    ) : canManage ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={savingId === row.course.id}
                            onClick={() => markDone(row)}
                            className="rounded-md border border-green-600 px-2 py-0.5 text-[11px] font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                          >
                            {savingId === row.course.id ? "..." : "Yapıldı"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNoteFor(noteFor === row.course.id ? null : row.course.id);
                              setNoteText("");
                            }}
                            className="text-[11px] text-neutral-500 underline hover:no-underline"
                          >
                            Not
                          </button>
                        </div>
                        {noteFor === row.course.id && (
                          <input
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Not (Yapıldı ile kaydedilir)"
                            className="input py-1 text-[11px]"
                          />
                        )}
                      </div>
                    ) : (
                      <span className="text-neutral-400">Bekliyor</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
