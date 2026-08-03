"use client";

import { useEffect, useState } from "react";
import {
  createCalfTreatment,
  listAnimals,
  listCalfHousingSlots,
  listCalfProtocolDays,
  listCalfProtocols,
  listCalfTreatmentCourses,
  listCalfTreatments,
  listCalfTreatmentStatuses,
} from "@/lib/data";
import {
  Animal,
  CalfHousingSlot,
  CalfProtocol,
  CalfProtocolDay,
  CalfTreatment,
  CalfTreatmentCourse,
  CalfTreatmentStatus,
} from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { todayIso } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { DailyTreatmentTable } from "@/components/DailyTreatmentTable";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    weekday: "long",
  });
}

function shiftDate(iso: string, deltaDays: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Buzagilik ve Iglo'daki tum hasta buzagilarin tek noktadan takibi: secili
// gunun tedavi gorevleri (protokol kuru bazli) + o tarihe kayitli tum
// tedavi kayitlari (Excel'den ice aktarilanlar dahil).
export default function CalfTreatmentListPage() {
  const { profile } = useAuth();
  const canManage = hasPermission(profile, "can_manage_calves");

  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [courses, setCourses] = useState<CalfTreatmentCourse[]>([]);
  const [protocols, setProtocols] = useState<CalfProtocol[]>([]);
  const [protocolDays, setProtocolDays] = useState<CalfProtocolDay[]>([]);
  const [treatments, setTreatments] = useState<CalfTreatment[]>([]);
  const [legacyStatuses, setLegacyStatuses] = useState<CalfTreatmentStatus[]>([]);
  const [buzagilikSlots, setBuzagilikSlots] = useState<CalfHousingSlot[]>([]);
  const [igloSlots, setIgloSlots] = useState<CalfHousingSlot[]>([]);
  const [loading, setLoading] = useState(true);

  function loadData() {
    return Promise.all([
      listAnimals(),
      listCalfTreatmentCourses(),
      listCalfProtocols(),
      listCalfProtocolDays(),
      listCalfTreatments(),
      listCalfTreatmentStatuses(),
      listCalfHousingSlots("buzagilik"),
      listCalfHousingSlots("iglo"),
    ]);
  }

  useEffect(() => {
    loadData().then(([a, c, p, pd, tr, ls, bs, is]) => {
      setAnimals(a);
      setCourses(c);
      setProtocols(p);
      setProtocolDays(pd);
      setTreatments(tr);
      setLegacyStatuses(ls);
      setBuzagilikSlots(bs);
      setIgloSlots(is);
      setLoading(false);
    });
  }, []);

  async function refresh() {
    const [a, c, p, pd, tr, ls, bs, is] = await loadData();
    setAnimals(a);
    setCourses(c);
    setProtocols(p);
    setProtocolDays(pd);
    setTreatments(tr);
    setLegacyStatuses(ls);
    setBuzagilikSlots(bs);
    setIgloSlots(is);
  }

  function locationFor(animalId: string): string | null {
    const b = buzagilikSlots.find((s) => s.animal_id === animalId);
    if (b) return `Buzağılık · Sıra ${b.group_index + 1} · ${b.slot_index + 1}`;
    const i = igloSlots.find((s) => s.animal_id === animalId);
    if (i) return `İglo ${i.group_index + 1} · ${i.slot_index + 1}`;
    return null;
  }

  async function handleLogDone({
    course,
    day,
    diagnosis,
    medicines,
    note,
  }: {
    course: CalfTreatmentCourse;
    day: number;
    diagnosis: string;
    medicines: string;
    note: string | null;
  }) {
    await createCalfTreatment({
      animal_id: course.animal_id,
      created_by: profile?.id ?? null,
      course_id: course.id,
      treatment_date: selectedDate,
      diagnosis,
      protocol_day: day,
      description: medicines,
      note,
    });
    await refresh();
  }

  const activeCourses = courses
    .filter((c) => c.status === "aktif")
    .map((c) => {
      const animal = animals.find((a) => a.id === c.animal_id);
      const protocol = protocols.find((p) => p.id === c.protocol_id);
      const days = protocolDays.filter((d) => d.protocol_id === c.protocol_id);
      const maxDay = days.reduce((mx, d) => Math.max(mx, d.day_number), 0);
      const diff = Math.floor(
        (new Date(`${todayIso()}T00:00:00`).getTime() - new Date(`${c.start_date}T00:00:00`).getTime()) / 86400000
      );
      const day = Math.min(Math.max(diff + 1, 1), maxDay || 1);
      return { course: c, earTag: animal?.ear_tag ?? "?", location: locationFor(c.animal_id), protocolName: protocol?.name ?? "?", day, maxDay };
    })
    .sort((a, b) => a.earTag.localeCompare(b.earTag, "tr", { numeric: true }));

  const legacySick = legacyStatuses
    .filter((s) => s.under_treatment && !activeCourses.some((c) => c.course.animal_id === s.animal_id))
    .map((s) => ({ animal: animals.find((a) => a.id === s.animal_id), note: s.note }))
    .filter((s): s is { animal: Animal; note: string | null } => !!s.animal);

  const dayRecords = treatments
    .filter((t) => t.treatment_date === selectedDate)
    .map((t) => ({ treatment: t, animal: animals.find((a) => a.id === t.animal_id) }))
    .filter((r): r is { treatment: CalfTreatment; animal: Animal } => !!r.animal)
    .sort((a, b) => a.animal.ear_tag.localeCompare(b.animal.ear_tag, "tr", { numeric: true }));

  const isToday = selectedDate === todayIso();

  return (
    <div className="space-y-4">
      <PageHeader
        icon="🩺"
        title="Tedavi Listesi"
        subtitle="Hasta buzağıların günlük takibi (Buzağılık + İglo)"
        color="rose"
      />

      {loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : (
        <>
          <div className="card space-y-2">
            <p className="text-xs font-semibold text-neutral-700">Şu an tedavi gören buzağılar</p>
            {activeCourses.length === 0 && legacySick.length === 0 ? (
              <p className="text-sm text-green-700">Şu an tedavi gören buzağı yok. 🎉</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {activeCourses.map((c) => (
                  <span
                    key={c.course.id}
                    className="rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-800"
                    title={c.location ?? undefined}
                  >
                    {c.earTag} · {c.protocolName} (Gün {c.day}/{c.maxDay})
                  </span>
                ))}
                {legacySick.map(({ animal, note }) => (
                  <span
                    key={animal.id}
                    className="rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-800"
                  >
                    {animal.ear_tag}
                    {note ? ` · ${note}` : ""}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="card space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-neutral-700">Tarih seç</p>
              {!isToday && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayIso())}
                  className="text-xs font-semibold text-green-700 hover:underline"
                >
                  Bugüne dön
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDate((d) => shiftDate(d, -1))}
                className="btn-secondary shrink-0 px-2.5"
                aria-label="Önceki gün"
              >
                ←
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => setSelectedDate((d) => shiftDate(d, 1))}
                className="btn-secondary shrink-0 px-2.5"
                aria-label="Sonraki gün"
              >
                →
              </button>
            </div>
            <p className="text-xs text-neutral-500">{formatDate(selectedDate)}</p>
          </div>

          <DailyTreatmentTable
            courses={courses}
            protocols={protocols}
            protocolDays={protocolDays}
            animals={animals}
            treatments={treatments}
            canManage={canManage}
            onLogDone={handleLogDone}
            date={selectedDate}
            heading={isToday ? "Bugünün Tedavi Görevleri" : `${formatDate(selectedDate)} Tedavi Görevleri`}
            locationFor={locationFor}
            hideWhenEmpty={false}
          />

          <div className="card space-y-2">
            <p className="text-xs font-semibold text-neutral-700">Bu tarihe kayıtlı tüm tedaviler</p>
            {dayRecords.length === 0 ? (
              <p className="text-sm text-neutral-400">Bu tarihe kayıtlı tedavi yok.</p>
            ) : (
              <div className="max-h-96 space-y-1.5 overflow-y-auto">
                {dayRecords.map(({ treatment: t, animal }) => (
                  <div key={t.id} className="rounded-md border border-neutral-100 px-2 py-1.5 text-xs">
                    <p className="font-semibold text-neutral-900">
                      {animal.ear_tag}
                      <span className="ml-2 font-normal text-neutral-500">{locationFor(animal.id) ?? "Barınakta değil"}</span>
                      {t.protocol_day != null && <span className="ml-2 text-neutral-500">Gün {t.protocol_day}</span>}
                      {t.diagnosis && <span className="ml-2 text-neutral-500">{t.diagnosis}</span>}
                    </p>
                    <p className="text-neutral-600">{t.description}</p>
                    {t.note && <p className="italic text-neutral-500">Not: {t.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
