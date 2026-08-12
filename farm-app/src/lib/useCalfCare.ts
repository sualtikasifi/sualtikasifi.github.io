"use client";

import { useCallback, useEffect, useState } from "react";
import {
  assignCalfToSlot,
  createAnimal,
  createCalfNote,
  deleteCalfNote,
  createCalfProtocol,
  createCalfTreatment,
  deleteCalfTreatment,
  createCalfTreatmentCourse,
  createCalfPectolitCourse,
  listAnimals,
  listCalfBirthRecords,
  listCalfHousingSlots,
  listCalfMeals,
  listCalfNotes,
  listCalfPectolitCourses,
  listCalfProtocolDays,
  listCalfProtocols,
  listCalfTreatmentCourses,
  listCalfTreatments,
  listCalfTreatmentStatuses,
  replaceCalfProtocolDays,
  requestCalfAiAssist,
  setCalfMealExam,
  setCalfTreatmentCourseStatus,
  setCalfTreatmentStatus,
  updateCalfPectolitCourse,
  updateCalfProtocolName,
  upsertCalfBirthRecord,
  upsertCalfMeal,
} from "./data";
import {
  Animal,
  AnimalGender,
  CalfAiAssistCourse,
  CalfBirthRecord,
  CalfHousingSlot,
  CalfHousingStructure,
  CalfMeal,
  CalfNote,
  CalfPectolitCourse,
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

function addDaysIso(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Bugun, kurun basladigi gunden itibaren kacinci gun (1-indeksli).
function courseCurrentDay(startDate: string): number {
  const diff = Math.floor(
    (new Date(`${todayIso()}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / 86400000
  );
  return diff + 1;
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
  const [pectolitCourses, setPectolitCourses] = useState<CalfPectolitCourse[]>([]);
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
      listCalfPectolitCourses(),
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
    setPectolitCourses(pl);
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
  // Buzagi kac gunluk: once dogum kaydindaki born_at (saat bilgili), yoksa
  // hayvanin birth_date alani kullanilir. Ikisi de yoksa null doner.
  const ageDaysFor = (animalId: string): number | null => {
    const animal = animalById(animalId);
    const born = birthRecordFor(animalId)?.born_at ?? animal?.birth_date ?? null;
    if (!born) return null;
    const diff = Math.floor((Date.now() - new Date(born).getTime()) / 86400000);
    return diff >= 0 ? diff : null;
  };
  // Hayvanin tum tedavi gecmisini + dogum/kolostrum/kan brix bilgilerini
  // AI Sağlık Asistanı icin tek bir istege paketler.
  const requestAiAssistFor = (animalId: string, diagnosis: string): Promise<string> => {
    const animal = animalById(animalId);
    const birthRecord = birthRecordFor(animalId);
    const animalTreatments = treatmentsFor(animalId);
    const treatmentHistory: CalfAiAssistCourse[] = coursesFor(animalId).map((c) => ({
      protocolName: protocols.find((p) => p.id === c.protocol_id)?.name ?? "Bilinmeyen protokol",
      startDate: c.start_date,
      status: c.status,
      logs: animalTreatments
        .filter((t) => t.course_id === c.id)
        .map((t) => ({ date: t.treatment_date, protocolDay: t.protocol_day, description: t.description, note: t.note })),
    }));
    const looseTreatments = animalTreatments.filter((t) => !t.course_id);
    if (looseTreatments.length > 0) {
      treatmentHistory.push({
        protocolName: "Diğer / bağımsız kayıtlar",
        startDate: looseTreatments[0].treatment_date,
        status: "-",
        logs: looseTreatments.map((t) => ({
          date: t.treatment_date,
          protocolDay: t.protocol_day,
          description: t.description,
          note: t.note,
        })),
      });
    }
    return requestCalfAiAssist({
      earTag: animal?.ear_tag ?? "?",
      ageDays: ageDaysFor(animalId),
      birthDate: birthRecord?.born_at ?? animal?.birth_date ?? null,
      bloodBrix: birthRecord?.blood_brix ?? null,
      colostrum1Liters: birthRecord?.colostrum1_liters ?? null,
      colostrum1Brix: birthRecord?.colostrum1_brix ?? null,
      colostrum2Liters: birthRecord?.colostrum2_liters ?? null,
      colostrum2Brix: birthRecord?.colostrum2_brix ?? null,
      treatmentHistory,
      selectedDiagnosis: diagnosis,
    });
  };
  const activePectolitCourseFor = (animalId: string) =>
    pectolitCourses.find((c) => c.animal_id === animalId && c.status === "aktif");
  const pectolitCoursesFor = (animalId: string) =>
    pectolitCourses.filter((c) => c.animal_id === animalId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const notesFor = (animalId: string) => calfNotes.filter((n) => n.animal_id === animalId);
  const legacyStatusFor = (animalId: string) => treatmentStatuses.find((t) => t.animal_id === animalId);
  const hasActiveCourse = (animalId: string) => courses.some((c) => c.animal_id === animalId && c.status === "aktif");
  // Bugunu (veya ileri bir gunu) kapsayan tedavi gecmisi kaydi olan hayvan
  // da tedavide sayilir - Excel'den toplu yuklenen protokoller kur olarak
  // acilmadigi icin sadece kurlara bakmak onlari kaciriyordu.
  const hasOngoingTreatmentRecord = (animalId: string) =>
    treatments.some((t) => t.animal_id === animalId && t.treatment_date >= todayIso());
  const underTreatment = (animalId: string) =>
    hasActiveCourse(animalId) || hasOngoingTreatmentRecord(animalId) || !!legacyStatusFor(animalId)?.under_treatment;
  // Kurun kapsadigi son gun (start_date + total_days - 1).
  const pectolitEndDate = (course: CalfPectolitCourse) => addDaysIso(course.start_date, course.total_days - 1);
  // Bugun, kurun 09:00/21:00 doz penceresi icinde mi (kur suruyor).
  const pectolitPending = (animalId: string) => {
    const course = activePectolitCourseFor(animalId);
    if (!course) return false;
    const today = todayIso();
    return today >= course.start_date && today <= pectolitEndDate(course);
  };
  // Kurun suresi doldu ama "iyilesti mi?" sorusu henuz cevaplanmadi.
  const pectolitNeedsResponse = (animalId: string) => {
    const course = activePectolitCourseFor(animalId);
    if (!course) return false;
    return courseCurrentDay(course.start_date) > course.total_days;
  };
  const pectolitAntibioticWarning = (animalId: string) => !!activePectolitCourseFor(animalId)?.antibiotic_warning;
  // Bu (tarih, saat) dozu pectolit kapsamina giriyor mu - sadece 09:00/21:00,
  // sadece kurun basladigi gunden bitis gunune kadar.
  const isPectolitDoseSlot = (animalId: string, dateStr: string, hour: number) => {
    if (hour !== 9 && hour !== 21) return false;
    const course = activePectolitCourseFor(animalId);
    if (!course) return false;
    return dateStr >= course.start_date && dateStr <= pectolitEndDate(course);
  };
  // Suresi devam eden (visible_until bugunden once olmayan) notlar.
  const activeNotesFor = (animalId: string) =>
    calfNotes.filter((n) => n.animal_id === animalId && n.visible_until != null && n.visible_until >= todayIso());
  // Icmedigi halde muayene sonucu girilmemis ogunler (kirmizi unlem).
  const unexaminedMissedFor = (animalId: string) =>
    meals.filter((m) => m.animal_id === animalId && !m.drank && !m.exam_result);
  const activeProtocolNameFor = (animalId: string) => {
    const course = courses.find((c) => c.animal_id === animalId && c.status === "aktif");
    if (course) return protocols.find((p) => p.id === course.protocol_id)?.name ?? null;
    const record = treatments.find(
      (t) => t.animal_id === animalId && t.treatment_date >= todayIso() && t.diagnosis
    );
    return record?.diagnosis ?? null;
  };

  const slotByAnimalId = new Map<string, CalfHousingSlot>();
  for (const s of [...slots, ...otherSlots]) {
    if (s.animal_id) slotByAnimalId.set(s.animal_id, s);
  }
  // "Var olani ata" arama kutusunda sadece bos duran hayvanlar degil, baska
  // bir bolmede/yapida zaten barinan (sutten kesilmemis) hayvanlar da
  // gorunur - aksi halde araninan kupe numarasi listede hic cikmiyor ve
  // kullanici bunu bir "oneri siniri" hatasi saniyordu. Zaten baska yerde
  // duran bir hayvan secilirse handleAssign onu oradan otomatik tasir.
  const availableCalves = animals.filter((a) => a.weaned_at === null);
  const currentSlotForAnimal = (animalId: string): CalfHousingSlot | null => slotByAnimalId.get(animalId) ?? null;

  // --- Islemler ---
  async function handleAssign(slotId: string, animalId: string | null) {
    if (animalId) {
      const existing = slotByAnimalId.get(animalId);
      if (existing && existing.id !== slotId) {
        await assignCalfToSlot(existing.id, null);
      }
    }
    await assignCalfToSlot(slotId, animalId);
    await refresh();
  }

  // Yeni dogan buzagilar sistemde kayitli olmayabilir: kulubeye tiklayinca
  // var olani atamak yerine sifirdan hayvan olusturup ayni anda atar.
  async function handleCreateAndAssign(
    slotId: string,
    input: { ear_tag: string; gender: AnimalGender | null; breed: string | null; born_at: string | null }
  ) {
    const created = await createAnimal({
      ear_tag: input.ear_tag,
      name: null,
      birth_date: input.born_at ? input.born_at.slice(0, 10) : null,
      breed: input.breed,
      gender: input.gender,
      status: "aktif",
      mother_ear_tag: null,
      weaned_at: null,
      notes: null,
      created_by: profile?.id ?? null,
    });
    if (input.born_at) {
      await upsertCalfBirthRecord(created.id, { born_at: new Date(input.born_at).toISOString() }, profile?.id ?? null);
    }
    await assignCalfToSlot(slotId, created.id);
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
    await upsertCalfMeal({
      animal_id: animalId,
      meal_date: slot.date,
      meal_hour: slot.hour,
      drank,
      pectolit: isPectolitDoseSlot(animalId, slot.date, slot.hour),
      created_by: profile?.id ?? null,
    });
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

  async function handleUndoTreatment(treatmentId: string) {
    await deleteCalfTreatment(treatmentId);
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
    await createCalfPectolitCourse(animalId, profile?.id ?? null);
    await refresh();
  }

  async function handleCancelPectolit(animalId: string) {
    const course = activePectolitCourseFor(animalId);
    if (!course) return;
    await updateCalfPectolitCourse(course.id, { status: "iptal" });
    await refresh();
  }

  // Pectolit suresi dolunca sorulan "ishal iyilesti mi?" cevabi. Iyilestiyse
  // kur biter; iyilesmediyse 1 gun (2 doz) uzar - uzatma total_days'i 5'e
  // tasiyorsa (yani 5. gunun sonunda hala iyilesmediyse) antibiyotik uyarisi
  // acilir, ama kur pectolit vermeye devam eder.
  async function handlePectolitResponse(animalId: string, improved: boolean) {
    const course = activePectolitCourseFor(animalId);
    if (!course) return;
    if (improved) {
      await updateCalfPectolitCourse(course.id, { status: "tamamlandi" });
    } else {
      const triggersWarning = course.antibiotic_warning || course.total_days >= 5;
      await updateCalfPectolitCourse(course.id, {
        total_days: course.total_days + 1,
        antibiotic_warning: triggersWarning,
      });
    }
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

  async function handleDeleteNote(noteId: string) {
    await deleteCalfNote(noteId);
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
    currentSlotForAnimal,
    brixAlerts,
    animalById,
    mealsFor,
    treatmentsFor,
    coursesFor,
    birthRecordFor,
    ageDaysFor,
    requestAiAssistFor,
    activePectolitCourseFor,
    pectolitCoursesFor,
    notesFor,
    legacyStatusFor,
    underTreatment,
    pectolitPending,
    pectolitNeedsResponse,
    pectolitAntibioticWarning,
    handleAssign,
    handleCreateAndAssign,
    handleMove,
    handleMarkMeal,
    handleStartCourse,
    handleSetCourseStatus,
    handleAddTreatment,
    handleUndoTreatment,
    handleSaveBirth,
    handleStartPectolit,
    handleCancelPectolit,
    handlePectolitResponse,
    handleAddNote,
    handleDeleteNote,
    handleMealExam,
    handleSaveProtocol,
    handleClearLegacyStatus,
    activeNotesFor,
    unexaminedMissedFor,
    activeProtocolNameFor,
    refresh,
  };
}
