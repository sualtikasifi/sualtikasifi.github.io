"use client";

import { useCallback, useEffect, useState } from "react";
import {
  assignCalfToSlot,
  createCalfNote,
  createCalfProtocol,
  createCalfTreatment,
  createCalfTreatmentCourse,
  listAnimals,
  listCalfBirthRecords,
  listCalfHousingSlots,
  listCalfMeals,
  listCalfNotes,
  listCalfPectolit,
  listCalfProtocolDays,
  listCalfProtocols,
  listCalfTreatmentCourses,
  listCalfTreatments,
  listCalfTreatmentStatuses,
  replaceCalfProtocolDays,
  setCalfMealExam,
  setCalfPectolit,
  setCalfTreatmentCourseStatus,
  setCalfTreatmentStatus,
  updateCalfProtocolName,
  upsertCalfBirthRecord,
  upsertCalfMeal,
} from "./data";
import {
  Animal,
  CalfBirthRecord,
  CalfHousingSlot,
  CalfHousingStructure,
  CalfMeal,
  CalfNote,
  CalfPectolit,
  CalfProtocol,
  CalfProtocolDay,
  CalfTreatment,
  CalfTreatmentCourse,
  CalfTreatmentStatus,
  CourseStatus,
} from "./types";
import { MealSlotRef } from "./meals";
import { useAuth } from "./auth";
import { todayIso } from "./format";

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Buzagilik ve Iglo sayfalarinin ortak veri yukleme + islem katmani.
export function useCalfCare(structure: CalfHousingStructure) {
  const { profile } = useAuth();
  const [slots, setSlots] = useState<CalfHousingSlot[]>([]);
  const [otherSlots, setOtherSlots] = useState<CalfHousingSlot[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [meals, setMeals] = useState<CalfMeal[]>([]);
  const [treatments, setTreatments] = useState<CalfTreatment[]>([]);
  const [treatmentStatuses, setTreatmentStatuses] = useState<CalfTreatmentStatus[]>([]);
  const [courses, setCourses] = useState<CalfTreatmentCourse[]>([]);
  const [protocols, setProtocols] = useState<CalfProtocol[]>([]);
  const [protocolDays, setProtocolDays] = useState<CalfProtocolDay[]>([]);
  const [birthRecords, setBirthRecords] = useState<CalfBirthRecord[]>([]);
  const [pectolitList, setPectolitList] = useState<CalfPectolit[]>([]);
  const [calfNotes, setCalfNotes] = useState<CalfNote[]>([]);
  const [loading, setLoading] = useState(true);

  const otherStructure: CalfHousingStructure = structure === "buzagilik" ? "iglo" : "buzagilik";

  const refresh = useCallback(async () => {
    const [s, o, a, m, tr, ts, c, p, pd, br, pl, cn] = await Promise.all([
      listCalfHousingSlots(structure),
      listCalfHousingSlots(otherStructure),
      listAnimals(),
      listCalfMeals(daysAgoIso(14)),
      listCalfTreatments(),
      listCalfTreatmentStatuses(),
      listCalfTreatmentCourses(),
      listCalfProtocols(),
      listCalfProtocolDays(),
      listCalfBirthRecords(),
      listCalfPectolit(),
      listCalfNotes(),
    ]);
    setSlots(s);
    setOtherSlots(o);
    setAnimals(a);
    setMeals(m);
    setTreatments(tr);
    setTreatmentStatuses(ts);
    setCourses(c);
    setProtocols(p);
    setProtocolDays(pd);
    setBirthRecords(br);
    setPectolitList(pl);
    setCalfNotes(cn);

    // Suresi dolan aktif kurleri otomatik "tamamlandi" yap.
    const today = todayIso();
    for (const course of c) {
      if (course.status !== "aktif") continue;
      const days = pd.filter((d) => d.protocol_id === course.protocol_id);
      const maxDay = days.reduce((mx, d) => Math.max(mx, d.day_number), 0);
      if (maxDay === 0) continue;
      const diff = Math.floor(
        (new Date(`${today}T00:00:00`).getTime() - new Date(`${course.start_date}T00:00:00`).getTime()) / 86400000
      );
      if (diff + 1 > maxDay) {
        await setCalfTreatmentCourseStatus(course.id, "tamamlandi");
        setCourses((prev) => prev.map((x) => (x.id === course.id ? { ...x, status: "tamamlandi" } : x)));
      }
    }
  }, [structure, otherStructure]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      await refresh();
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // --- Erisim yardimcilari ---
  const animalById = (id: string | null) => (id ? animals.find((a) => a.id === id) : undefined);
  const mealsFor = (animalId: string) => meals.filter((m) => m.animal_id === animalId);
  const treatmentsFor = (animalId: string) => treatments.filter((t) => t.animal_id === animalId);
  const coursesFor = (animalId: string) => courses.filter((c) => c.animal_id === animalId);
  const birthRecordFor = (animalId: string) => birthRecords.find((b) => b.animal_id === animalId);
  const pectolitFor = (animalId: string) => pectolitList.find((p) => p.animal_id === animalId);
  const notesFor = (animalId: string) => calfNotes.filter((n) => n.animal_id === animalId);
  const legacyStatusFor = (animalId: string) => treatmentStatuses.find((t) => t.animal_id === animalId);
  const hasActiveCourse = (animalId: string) => courses.some((c) => c.animal_id === animalId && c.status === "aktif");
  const underTreatment = (animalId: string) =>
    hasActiveCourse(animalId) || !!legacyStatusFor(animalId)?.under_treatment;
  const pectolitPending = (animalId: string) => (pectolitFor(animalId)?.remaining_meals ?? 0) > 0;
  // Suresi devam eden (visible_until bugunden once olmayan) notlar.
  const activeNotesFor = (animalId: string) =>
    calfNotes.filter((n) => n.animal_id === animalId && n.visible_until != null && n.visible_until >= todayIso());
  // Icmedigi halde muayene sonucu girilmemis ogunler (kirmizi unlem).
  const unexaminedMissedFor = (animalId: string) =>
    meals.filter((m) => m.animal_id === animalId && !m.drank && !m.exam_result);
  const activeProtocolNameFor = (animalId: string) => {
    const course = courses.find((c) => c.animal_id === animalId && c.status === "aktif");
    if (!course) return null;
    return protocols.find((p) => p.id === course.protocol_id)?.name ?? null;
  };

  const assignedAnywhere = new Set(
    [...slots, ...otherSlots].map((s) => s.animal_id).filter((id): id is string => !!id)
  );
  const availableCalves = animals.filter((a) => a.weaned_at === null && !assignedAnywhere.has(a.id));

  // --- Islemler ---
  async function handleAssign(slotId: string, animalId: string | null) {
    await assignCalfToSlot(slotId, animalId);
    await refresh();
  }

  async function handleMove(fromSlotId: string, toSlotId: string) {
    const from = slots.find((s) => s.id === fromSlotId) ?? otherSlots.find((s) => s.id === fromSlotId);
    const to = slots.find((s) => s.id === toSlotId) ?? otherSlots.find((s) => s.id === toSlotId);
    if (!from || !to || !from.animal_id || from.id === to.id) return;
    // Hedef doluysa yer degistir (swap), bossa tasi.
    await assignCalfToSlot(from.id, null);
    if (to.animal_id) await assignCalfToSlot(from.id, to.animal_id);
    await assignCalfToSlot(to.id, from.animal_id);
    await refresh();
  }

  async function handleMarkMeal(animalId: string, slot: MealSlotRef, drank: boolean) {
    const pect = pectolitFor(animalId);
    const givePectolit = (pect?.remaining_meals ?? 0) > 0;
    const already = meals.find(
      (m) => m.animal_id === animalId && m.meal_date === slot.date && m.meal_hour === slot.hour
    );
    await upsertCalfMeal({
      animal_id: animalId,
      meal_date: slot.date,
      meal_hour: slot.hour,
      drank,
      pectolit: already?.pectolit || givePectolit,
      created_by: profile?.id ?? null,
    });
    // Pectolit sayacini yalnizca bu ogun daha once pectolitli kaydedilmediyse dus.
    if (givePectolit && !already?.pectolit) {
      await setCalfPectolit(animalId, (pect?.remaining_meals ?? 1) - 1, pect?.started_by ?? profile?.id ?? null);
    }
    await refresh();
  }

  async function handleStartCourse(animalId: string, protocolId: string, startDate: string) {
    await createCalfTreatmentCourse({
      animal_id: animalId,
      protocol_id: protocolId,
      start_date: startDate,
      created_by: profile?.id ?? null,
    });
    await refresh();
  }

  async function handleSetCourseStatus(courseId: string, status: CourseStatus) {
    await setCalfTreatmentCourseStatus(courseId, status);
    await refresh();
  }

  async function handleAddTreatment(
    animalId: string,
    input: {
      treatment_date: string;
      diagnosis: string | null;
      protocol_day: number | null;
      description: string;
      note: string | null;
      course_id?: string | null;
    }
  ) {
    await createCalfTreatment({
      animal_id: animalId,
      created_by: profile?.id ?? null,
      course_id: input.course_id ?? null,
      treatment_date: input.treatment_date,
      diagnosis: input.diagnosis,
      protocol_day: input.protocol_day,
      description: input.description,
      note: input.note,
    });
    await refresh();
  }

  async function handleSaveBirth(
    animalId: string,
    patch: Partial<Omit<CalfBirthRecord, "animal_id" | "updated_at" | "updated_by">>
  ) {
    await upsertCalfBirthRecord(animalId, patch, profile?.id ?? null);
    await refresh();
  }

  async function handleStartPectolit(animalId: string) {
    await setCalfPectolit(animalId, 2, profile?.id ?? null);
    await refresh();
  }

  async function handleCancelPectolit(animalId: string) {
    await setCalfPectolit(animalId, 0, profile?.id ?? null);
    await refresh();
  }

  async function handleAddNote(animalId: string, text: string, visibleDays: number | null) {
    let visibleUntil: string | null = null;
    if (visibleDays != null && visibleDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() + visibleDays);
      const pad = (x: number) => String(x).padStart(2, "0");
      visibleUntil = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
    await createCalfNote(animalId, text, profile?.id ?? null, visibleUntil);
    await refresh();
  }

  async function handleMealExam(mealId: string, result: string) {
    await setCalfMealExam(mealId, result, profile?.id ?? null);
    await refresh();
  }

  // Protokol duzenleme: id verilirse gunceller, verilmezse yeni olusturur.
  async function handleSaveProtocol(
    protocolId: string | null,
    name: string,
    days: { day_number: number; medicines: string }[]
  ) {
    if (protocolId) {
      await updateCalfProtocolName(protocolId, name);
      await replaceCalfProtocolDays(protocolId, days);
    } else {
      const created = await createCalfProtocol(name, profile?.id ?? null);
      await replaceCalfProtocolDays(created.id, days);
    }
    await refresh();
  }

  async function handleClearLegacyStatus(animalId: string) {
    await setCalfTreatmentStatus(animalId, false, null, profile?.id ?? null);
    await refresh();
  }

  // Kan brix uyarilari: dogumdan 36 saat gecmis ama brix girilmemis,
  // bu odadaki buzagilar.
  const brixAlerts = slots
    .filter((s) => s.animal_id)
    .map((s) => {
      const record = birthRecordFor(s.animal_id!);
      if (!record?.born_at || record.blood_brix != null) return null;
      const due = new Date(new Date(record.born_at).getTime() + 36 * 3600 * 1000);
      if (new Date() < due) return null;
      return { animal: animalById(s.animal_id)!, due };
    })
    .filter((x): x is { animal: Animal; due: Date } => !!x);

  return {
    profile,
    loading,
    slots,
    otherSlots,
    animals,
    meals,
    treatments,
    courses,
    protocols,
    protocolDays,
    availableCalves,
    brixAlerts,
    animalById,
    mealsFor,
    treatmentsFor,
    coursesFor,
    birthRecordFor,
    pectolitFor,
    notesFor,
    legacyStatusFor,
    underTreatment,
    pectolitPending,
    handleAssign,
    handleMove,
    handleMarkMeal,
    handleStartCourse,
    handleSetCourseStatus,
    handleAddTreatment,
    handleSaveBirth,
    handleStartPectolit,
    handleCancelPectolit,
    handleAddNote,
    handleMealExam,
    handleSaveProtocol,
    handleClearLegacyStatus,
    activeNotesFor,
    unexaminedMissedFor,
    activeProtocolNameFor,
    refresh,
  };
}
