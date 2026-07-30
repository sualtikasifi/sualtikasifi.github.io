"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  listAnimals,
  listCalfBirthRecords,
  listCalfHousingSlots,
  listCalfMeals,
  listCalfNotes,
  listCalfProtocols,
  listCalfTreatmentCourses,
  listCalfTreatments,
} from "@/lib/data";
import {
  Animal,
  CalfBirthRecord,
  CalfHousingSlot,
  CalfMeal,
  CalfNote,
  CalfProtocol,
  CalfTreatment,
  CalfTreatmentCourse,
} from "@/lib/types";
import { EarTagPicker } from "@/components/EarTagPicker";
import { formatMealHour } from "@/lib/meals";

function formatDate(iso: string): string {
  return new Date(iso.includes("T") ? iso : `${iso}T00:00:00`).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ReportContent() {
  const searchParams = useSearchParams();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [slots, setSlots] = useState<CalfHousingSlot[]>([]);
  const [birthRecords, setBirthRecords] = useState<CalfBirthRecord[]>([]);
  const [treatments, setTreatments] = useState<CalfTreatment[]>([]);
  const [courses, setCourses] = useState<CalfTreatmentCourse[]>([]);
  const [protocols, setProtocols] = useState<CalfProtocol[]>([]);
  const [meals, setMeals] = useState<CalfMeal[]>([]);
  const [notes, setNotes] = useState<CalfNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pickerId, setPickerId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      listAnimals(),
      listCalfHousingSlots("buzagilik"),
      listCalfHousingSlots("iglo"),
      listCalfBirthRecords(),
      listCalfTreatments(),
      listCalfTreatmentCourses(),
      listCalfProtocols(),
      listCalfMeals(isoDaysAgo(60)),
      listCalfNotes(),
    ]).then(([a, s1, s2, br, tr, c, p, m, n]) => {
      setAnimals(a);
      setSlots([...s1, ...s2]);
      setBirthRecords(br);
      setTreatments(tr);
      setCourses(c);
      setProtocols(p);
      setMeals(m);
      setNotes(n);
      const ids = (searchParams.get("ids") ?? "").split(",").filter(Boolean);
      if (ids.length) setSelectedIds(ids.filter((id) => a.some((x) => x.id === id)));
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const housedAnimalIds = slots.map((s) => s.animal_id).filter((id): id is string => !!id);
  const selectable = animals.filter((a) => !selectedIds.includes(a.id));
  const selected = selectedIds
    .map((id) => animals.find((a) => a.id === id))
    .filter((a): a is Animal => !!a)
    .sort((a, b) => a.ear_tag.localeCompare(b.ear_tag, "tr", { numeric: true }));

  const slotLabelFor = (animalId: string) => {
    const slot = slots.find((s) => s.animal_id === animalId);
    if (!slot) return null;
    if (slot.structure === "iglo") return `İglo ${slot.group_index + 1} · ${slot.slot_index + 1}`;
    return `Buzağılık Sıra ${slot.group_index + 1} · ${slot.slot_index + 1}`;
  };

  return (
    <div className="space-y-4">
      <style jsx global>{`
        @media print {
          nav,
          header,
          .no-print {
            display: none !important;
          }
          .print-block {
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="no-print flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Buzağı Raporu</h1>
        <button type="button" onClick={() => window.print()} disabled={selected.length === 0} className="btn-primary">
          PDF Oluştur / Yazdır
        </button>
      </div>

      <div className="no-print card space-y-2">
        <p className="text-xs font-semibold text-neutral-700">Rapor için buzağı seçin</p>
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-56 flex-1">
            <EarTagPicker
              animals={selectable}
              selectedId={pickerId}
              onSelect={(id) => {
                setSelectedIds((prev) => [...prev, id]);
                setPickerId(null);
              }}
              onClear={() => setPickerId(null)}
            />
          </div>
          <button
            type="button"
            onClick={() => setSelectedIds([...new Set([...selectedIds, ...housedAnimalIds])])}
            className="btn-secondary shrink-0"
          >
            Kulübedeki Tümünü Ekle
          </button>
          {selectedIds.length > 0 && (
            <button type="button" onClick={() => setSelectedIds([])} className="btn-secondary shrink-0">
              Temizle
            </button>
          )}
        </div>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedIds((prev) => prev.filter((id) => id !== a.id))}
                className="chip chip-selected"
                title="Kaldırmak için tıklayın"
              >
                {a.ear_tag} ✕
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : selected.length === 0 ? (
        <p className="text-sm text-neutral-400">Rapor için en az bir buzağı seçin.</p>
      ) : (
        <div className="space-y-4">
          {selected.map((animal) => {
            const birth = birthRecords.find((b) => b.animal_id === animal.id);
            const animalTreatments = treatments
              .filter((t) => t.animal_id === animal.id)
              .sort((a, b) => a.treatment_date.localeCompare(b.treatment_date));
            const animalCourses = courses.filter((c) => c.animal_id === animal.id);
            const missedMeals = meals
              .filter((m) => m.animal_id === animal.id && !m.drank)
              .sort((a, b) => b.meal_date.localeCompare(a.meal_date) || b.meal_hour - a.meal_hour);
            const animalNotes = notes
              .filter((n) => n.animal_id === animal.id)
              .sort((a, b) => b.created_at.localeCompare(a.created_at));
            const location = slotLabelFor(animal.id);
            return (
              <div key={animal.id} className="card print-block space-y-3">
                <div className="flex items-baseline justify-between border-b border-neutral-200 pb-2">
                  <h2 className="text-base font-bold text-neutral-900">
                    Küpe {animal.ear_tag}
                    {animal.name && <span className="ml-2 font-normal text-neutral-500">{animal.name}</span>}
                  </h2>
                  <span className="text-xs text-neutral-500">{location ?? "Kulübede değil"}</span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                  <p><span className="text-neutral-500">Irk:</span> <span className="font-medium">{animal.breed ?? "-"}</span></p>
                  <p><span className="text-neutral-500">Cinsiyet:</span> <span className="font-medium">{animal.gender ?? "-"}</span></p>
                  <p>
                    <span className="text-neutral-500">Doğum:</span>{" "}
                    <span className="font-medium">
                      {birth?.born_at ? formatDateTime(birth.born_at) : animal.birth_date ? formatDate(animal.birth_date) : "-"}
                    </span>
                  </p>
                  <p>
                    <span className="text-neutral-500">Kan Brix:</span>{" "}
                    <span className="font-medium">
                      {birth?.blood_brix != null
                        ? `${birth.blood_brix}${birth.blood_brix_at ? ` (${formatDateTime(birth.blood_brix_at)})` : ""}`
                        : "-"}
                    </span>
                  </p>
                  <p>
                    <span className="text-neutral-500">1. Kolostrum:</span>{" "}
                    <span className="font-medium">
                      {birth?.colostrum1_liters != null || birth?.colostrum1_brix != null
                        ? `${birth?.colostrum1_liters ?? "?"} lt · ${birth?.colostrum1_brix ?? "?"} brix`
                        : "-"}
                    </span>
                  </p>
                  <p>
                    <span className="text-neutral-500">2. Kolostrum:</span>{" "}
                    <span className="font-medium">
                      {birth?.colostrum2_liters != null || birth?.colostrum2_brix != null
                        ? `${birth?.colostrum2_liters ?? "?"} lt · ${birth?.colostrum2_brix ?? "?"} brix`
                        : "-"}
                    </span>
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold text-neutral-700">Tedaviler ({animalTreatments.length})</p>
                  {animalTreatments.length === 0 ? (
                    <p className="text-xs text-neutral-400">Tedavi kaydı yok.</p>
                  ) : (
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-neutral-200 text-neutral-500">
                          <th className="py-1 pr-2 font-medium">Tarih</th>
                          <th className="py-1 pr-2 font-medium">Teşhis</th>
                          <th className="py-1 pr-2 font-medium">Gün</th>
                          <th className="py-1 font-medium">Tedavi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {animalTreatments.map((t) => (
                          <tr key={t.id} className="border-b border-neutral-100 align-top">
                            <td className="py-1 pr-2 whitespace-nowrap">{formatDate(t.treatment_date)}</td>
                            <td className="py-1 pr-2">{t.diagnosis ?? "-"}</td>
                            <td className="py-1 pr-2">{t.protocol_day ?? "-"}</td>
                            <td className="py-1">
                              {t.description}
                              {t.note && <span className="italic text-neutral-500"> — {t.note}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {animalCourses.length > 0 && (
                    <p className="mt-1 text-[11px] text-neutral-500">
                      Kürler:{" "}
                      {animalCourses
                        .map((c) => {
                          const name = protocols.find((p) => p.id === c.protocol_id)?.name ?? "?";
                          return `${name} (${formatDate(c.start_date)}, ${c.status})`;
                        })
                        .join(" · ")}
                    </p>
                  )}
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold text-neutral-700">
                    İçmediği Öğünler — son 60 gün ({missedMeals.length})
                  </p>
                  {missedMeals.length === 0 ? (
                    <p className="text-xs text-green-700">İçmediği öğün yok.</p>
                  ) : (
                    <p className="text-xs text-red-700">
                      {missedMeals
                        .map(
                          (m) =>
                            `${formatDate(m.meal_date)} ${formatMealHour(m.meal_hour)}${m.exam_result ? ` (muayene: ${m.exam_result})` : " (muayene bekliyor)"}`
                        )
                        .join(" · ")}
                    </p>
                  )}
                </div>

                {animalNotes.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-neutral-700">Notlar</p>
                    {animalNotes.map((n) => (
                      <p key={n.id} className="text-xs text-neutral-600">
                        • {n.note} <span className="text-neutral-400">({formatDateTime(n.created_at)})</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CalfReportPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Yükleniyor...</p>}>
      <ReportContent />
    </Suspense>
  );
}
