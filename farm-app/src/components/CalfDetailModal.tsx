"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Animal,
  AnimalGender,
  CalfBirthRecord,
  CalfMeal,
  CalfNote,
  CalfPectolitCourse,
  CalfProtocol,
  CalfProtocolDay,
  CalfTreatment,
  CalfTreatmentCourse,
  CalfTreatmentStatus,
} from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { EarTagPicker } from "@/components/EarTagPicker";
import { findMeal, formatMealHour, lastNMealSlots } from "@/lib/meals";
import { todayIso } from "@/lib/format";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Bugun, verilen baslangic gununden itibaren kacinci gun (1-indeksli).
function courseCurrentDay(startDate: string): number {
  const diff = Math.floor(
    (new Date(`${todayIso()}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / 86400000
  );
  return diff + 1;
}

// datetime-local inputu yerel saatle "YYYY-MM-DDTHH:mm" bekler.
function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface MoveTarget {
  slotId: string;
  label: string;
}

interface Props {
  label: string;
  animal: Animal | undefined;
  availableCalves: Animal[];
  locationFor?: (animalId: string) => string | null;
  meals: CalfMeal[];
  birthRecord: CalfBirthRecord | undefined;
  pectolit: CalfPectolitCourse | undefined;
  pectolitHistory: CalfPectolitCourse[];
  pectolitNeedsResponse: boolean;
  pectolitAntibioticWarning: boolean;
  notes: CalfNote[];
  courses: CalfTreatmentCourse[];
  protocols: CalfProtocol[];
  protocolDays: CalfProtocolDay[];
  treatments: CalfTreatment[];
  legacyStatus: CalfTreatmentStatus | undefined;
  moveTargets: MoveTarget[];
  onAssign: (animalId: string) => Promise<void>;
  onCreateAndAssign: (input: {
    ear_tag: string;
    gender: AnimalGender | null;
    breed: string | null;
    born_at: string | null;
  }) => Promise<void>;
  onUnassign: () => Promise<void>;
  onMove: (targetSlotId: string) => Promise<void>;
  // Modali kapatip ana ekranda "tasima modu"nu baslatir - kullanici
  // ardindan hedef kulubeye dokunur.
  onStartMove: () => void;
  onStartCourse: (protocolId: string, startDate: string) => Promise<void>;
  onSetCourseStatus: (courseId: string, status: "tamamlandi" | "iptal") => Promise<void>;
  onAddTreatment: (input: {
    treatment_date: string;
    diagnosis: string | null;
    protocol_day: number | null;
    description: string;
    note: string | null;
  }) => Promise<void>;
  onSaveBirth: (patch: Partial<Omit<CalfBirthRecord, "animal_id" | "updated_at" | "updated_by">>) => Promise<void>;
  onStartPectolit: () => Promise<void>;
  onCancelPectolit: () => Promise<void>;
  onPectolitResponse: (improved: boolean) => Promise<void>;
  onAddNote: (text: string, visibleDays: number | null) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onMealExam: (mealId: string, result: string) => Promise<void>;
  onSaveProtocol: (
    protocolId: string | null,
    name: string,
    days: { day_number: number; medicines: string }[]
  ) => Promise<void>;
  onDeleteProtocol: (protocolId: string) => Promise<void>;
  onClearLegacyStatus: () => Promise<void>;
  onAiAssist: (diagnosis: string) => Promise<string>;
  onClose: () => void;
}

export function CalfDetailModal({
  label,
  animal,
  availableCalves,
  locationFor,
  meals,
  birthRecord,
  pectolit,
  pectolitHistory,
  pectolitNeedsResponse,
  pectolitAntibioticWarning,
  notes,
  courses,
  protocols,
  protocolDays,
  treatments,
  legacyStatus,
  moveTargets,
  onAssign,
  onCreateAndAssign,
  onUnassign,
  onMove,
  onStartMove,
  onStartCourse,
  onSetCourseStatus,
  onAddTreatment,
  onSaveBirth,
  onStartPectolit,
  onCancelPectolit,
  onPectolitResponse,
  onAddNote,
  onDeleteNote,
  onMealExam,
  onSaveProtocol,
  onDeleteProtocol,
  onClearLegacyStatus,
  onAiAssist,
  onClose,
}: Props) {
  const { profile } = useAuth();
  const canManage = hasPermission(profile, "can_manage_calves");

  const [pickerAnimalId, setPickerAnimalId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [assignMode, setAssignMode] = useState<"existing" | "new">("existing");
  const [newEarTag, setNewEarTag] = useState("");
  const [newGender, setNewGender] = useState<AnimalGender | null>(null);
  const [newBreed, setNewBreed] = useState("");
  const [newBornAt, setNewBornAt] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [bornAtInput, setBornAtInput] = useState(toLocalInputValue(birthRecord?.born_at ?? null));
  const [brixInput, setBrixInput] = useState(birthRecord?.blood_brix != null ? String(birthRecord.blood_brix) : "");
  const [col1L, setCol1L] = useState(birthRecord?.colostrum1_liters != null ? String(birthRecord.colostrum1_liters) : "");
  const [col1B, setCol1B] = useState(birthRecord?.colostrum1_brix != null ? String(birthRecord.colostrum1_brix) : "");
  const [col2L, setCol2L] = useState(birthRecord?.colostrum2_liters != null ? String(birthRecord.colostrum2_liters) : "");
  const [col2B, setCol2B] = useState(birthRecord?.colostrum2_brix != null ? String(birthRecord.colostrum2_brix) : "");

  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(null);
  const [courseStartDate, setCourseStartDate] = useState(todayIso());

  const [showTreatmentForm, setShowTreatmentForm] = useState(false);
  const [newTreatmentDate, setNewTreatmentDate] = useState(todayIso());
  const [newTreatmentDiagnosis, setNewTreatmentDiagnosis] = useState("");
  const [newTreatmentDay, setNewTreatmentDay] = useState("");
  const [newTreatmentDescription, setNewTreatmentDescription] = useState("");
  const [newTreatmentNote, setNewTreatmentNote] = useState("");

  const [noteInput, setNoteInput] = useState("");
  const [noteDays, setNoteDays] = useState("3");
  const [moveTargetId, setMoveTargetId] = useState("");
  const [examText, setExamText] = useState("");
  // Protokol duzenleyici: null=kapali, ""=yeni protokol, id=duzenlenen
  const [editingProtocolId, setEditingProtocolId] = useState<string | null>(null);
  const [protocolNameDraft, setProtocolNameDraft] = useState("");
  const [protocolDaysDraft, setProtocolDaysDraft] = useState<string[]>([]);
  const [deleteProtocolError, setDeleteProtocolError] = useState<string | null>(null);

  async function handleDeleteProtocol(protocolId: string, protocolName: string) {
    if (!window.confirm(`"${protocolName}" protokolünü silmek istediğinize emin misiniz?`)) return;
    setDeleteProtocolError(null);
    setBusy(true);
    try {
      await onDeleteProtocol(protocolId);
      if (editingProtocolId === protocolId) setEditingProtocolId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/row-level security|permission denied/i.test(msg)) {
        setDeleteProtocolError("Bu işlem için yetkiniz yok.");
      } else if (msg) {
        setDeleteProtocolError(msg);
      } else {
        setDeleteProtocolError("Protokol silinemedi, tekrar deneyin.");
      }
    } finally {
      setBusy(false);
    }
  }

  const [showAiAssist, setShowAiAssist] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<string | null>(null);
  const [aiCustomDiagnosis, setAiCustomDiagnosis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleAiAnalyze() {
    const diagnosis = aiDiagnosis === "__other__" ? aiCustomDiagnosis.trim() : aiDiagnosis;
    if (!diagnosis) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      setAiResult(await onAiAssist(diagnosis));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Bir hata oluştu, tekrar deneyin.");
    } finally {
      setAiLoading(false);
    }
  }

  function openProtocolEditor(protocolId: string | null) {
    if (protocolId) {
      const protocol = protocols.find((p) => p.id === protocolId);
      const days = protocolDays
        .filter((d) => d.protocol_id === protocolId)
        .sort((a, b) => a.day_number - b.day_number)
        .map((d) => d.medicines);
      setProtocolNameDraft(protocol?.name ?? "");
      setProtocolDaysDraft(days.length ? days : [""]);
      setEditingProtocolId(protocolId);
    } else {
      setProtocolNameDraft("");
      setProtocolDaysDraft([""]);
      setEditingProtocolId("");
    }
  }

  const activeCourse = courses.find((c) => c.status === "aktif");
  const protocolById = (id: string) => protocols.find((p) => p.id === id);
  const daysOf = (protocolId: string) =>
    protocolDays.filter((d) => d.protocol_id === protocolId).sort((a, b) => a.day_number - b.day_number);

  const courseInfo = useMemo(() => {
    if (!activeCourse) return null;
    const protocol = protocolById(activeCourse.protocol_id);
    const days = daysOf(activeCourse.protocol_id);
    const maxDay = days.length ? days[days.length - 1].day_number : 0;
    const diff = Math.floor(
      (new Date(`${todayIso()}T00:00:00`).getTime() - new Date(`${activeCourse.start_date}T00:00:00`).getTime()) /
        86400000
    );
    const currentDay = diff + 1;
    const todayMeds = days.find((d) => d.day_number === currentDay)?.medicines ?? null;
    return { protocol, days, maxDay, currentDay, todayMeds };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCourse, protocols, protocolDays]);

  // Kan brix hatirlatmasi: dogumdan 36 saat sonra bakilmali.
  const brixState = useMemo(() => {
    if (!birthRecord?.born_at) return null;
    const due = new Date(new Date(birthRecord.born_at).getTime() + 36 * 3600 * 1000);
    const now = new Date();
    if (birthRecord.blood_brix != null) return { kind: "done" as const, due };
    if (now >= due) return { kind: "due" as const, due };
    return { kind: "waiting" as const, due };
  }, [birthRecord]);

  const sortedTreatments = [...treatments].sort((a, b) => b.treatment_date.localeCompare(a.treatment_date));
  const recentSlots = lastNMealSlots(8);
  const todayStr = todayIso();
  const activeNotes = notes.filter((n) => n.visible_until != null && n.visible_until >= todayStr);
  const unexaminedMissed = meals
    .filter((m) => !m.drank && !m.exam_result)
    .sort((a, b) => b.meal_date.localeCompare(a.meal_date) || b.meal_hour - a.meal_hour);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  function numOrNull(s: string): number | null {
    const t = s.trim().replace(",", ".");
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-800">{label}</h2>
          <button type="button" onClick={onClose} className="text-xs text-neutral-500 underline hover:no-underline">
            Kapat
          </button>
        </div>

        {!animal ? (
          <div className="space-y-3">
            <p className="text-sm text-neutral-400">Bu kutucuk boş.</p>
            {canManage && (
              <div className="space-y-3">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAssignMode("existing")}
                    className={`chip ${assignMode === "existing" ? "chip-selected" : "chip-unselected"}`}
                  >
                    Var Olanı Ata
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignMode("new")}
                    className={`chip ${assignMode === "new" ? "chip-selected" : "chip-unselected"}`}
                  >
                    Yeni Buzağı Ekle
                  </button>
                </div>

                {assignMode === "existing" ? (
                  <div className="space-y-2">
                    <EarTagPicker
                      animals={availableCalves}
                      selectedId={pickerAnimalId}
                      onSelect={setPickerAnimalId}
                      onClear={() => setPickerAnimalId(null)}
                      locationFor={locationFor}
                    />
                    {pickerAnimalId && locationFor?.(pickerAnimalId) && (
                      <p className="text-xs text-amber-700">
                        Bu buzağı şu an {locationFor(pickerAnimalId)} konumunda — atarsan oradan otomatik taşınır.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => pickerAnimalId && run(() => onAssign(pickerAnimalId))}
                      disabled={!pickerAnimalId || busy}
                      className="btn-primary"
                    >
                      {busy
                        ? "Ekleniyor..."
                        : pickerAnimalId && locationFor?.(pickerAnimalId)
                          ? "Buzağıyı Taşı"
                          : "Buzağı Ata"}
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newEarTag.trim()) return;
                      setCreateError(null);
                      setBusy(true);
                      try {
                        await onCreateAndAssign({
                          ear_tag: newEarTag.trim(),
                          gender: newGender,
                          breed: newBreed.trim() || null,
                          born_at: newBornAt || null,
                        });
                        setNewEarTag("");
                        setNewGender(null);
                        setNewBreed("");
                        setNewBornAt("");
                      } catch (err) {
                        // Supabase network-level hatalarinda (Postgrest istekten
                        // once fetch basarisiz olursa) hata gercek bir Error
                        // degil, sadece {message,...} tasiyan duz bir nesne
                        // olabilir; bu yuzden instanceof Error'a guvenmeyip
                        // message alanini dogrudan da kontrol ediyoruz.
                        const msg =
                          err instanceof Error
                            ? err.message
                            : err && typeof err === "object" && typeof (err as { message?: unknown }).message === "string"
                              ? ((err as { message: string }).message)
                              : "";
                        if (/duplicate|unique/i.test(msg)) {
                          setCreateError("Bu küpe numarası zaten kayıtlı.");
                        } else if (/row-level security|permission denied/i.test(msg)) {
                          setCreateError("Bu işlem için yetkiniz yok. Yöneticinize başvurun.");
                        } else if (!msg || /failed to fetch|network|abort|load failed|timeout/i.test(msg)) {
                          setCreateError("Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.");
                        } else {
                          setCreateError(`Buzağı oluşturulamadı: ${msg}`);
                        }
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="space-y-2 rounded-md border border-neutral-200 p-2"
                  >
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-neutral-600">Küpe Numarası *</span>
                      <input
                        value={newEarTag}
                        onChange={(e) => setNewEarTag(e.target.value)}
                        placeholder="örn. 3841"
                        className="input"
                        required
                      />
                    </label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setNewGender(newGender === "disi" ? null : "disi")}
                        className={`chip ${newGender === "disi" ? "chip-selected" : "chip-unselected"}`}
                      >
                        Dişi
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewGender(newGender === "erkek" ? null : "erkek")}
                        className={`chip ${newGender === "erkek" ? "chip-selected" : "chip-unselected"}`}
                      >
                        Erkek
                      </button>
                    </div>
                    <div>
                      <span className="mb-1 block text-xs font-medium text-neutral-600">Irk (opsiyonel)</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setNewBreed(newBreed === "Simental" ? "" : "Simental")}
                          className={`chip ${newBreed === "Simental" ? "chip-selected" : "chip-unselected"}`}
                        >
                          Simental
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewBreed(newBreed === "Holstein" ? "" : "Holstein")}
                          className={`chip ${newBreed === "Holstein" ? "chip-selected" : "chip-unselected"}`}
                        >
                          Holstein
                        </button>
                      </div>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-neutral-600">
                        Doğum tarihi ve saati (opsiyonel)
                      </span>
                      <input
                        type="datetime-local"
                        value={newBornAt}
                        onChange={(e) => setNewBornAt(e.target.value)}
                        className="input"
                      />
                    </label>
                    {createError && <p className="text-xs text-red-600">{createError}</p>}
                    <button type="submit" disabled={busy || !newEarTag.trim()} className="btn-primary">
                      {busy ? "Ekleniyor..." : "Buzağı Oluştur ve Ata"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-neutral-900">{animal.ear_tag}</span>
                {animal.name && <span className="text-neutral-500">{animal.name}</span>}
                {animal.breed && <span className="text-xs text-neutral-400">{animal.breed}</span>}
                <Link
                  href={`/calves/report?ids=${animal.id}`}
                  className="rounded-md border border-green-600 px-2 py-0.5 text-[11px] font-medium text-green-700 hover:bg-green-50"
                >
                  Buzağı Özet
                </Link>
              </div>
              {canManage && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onStartMove}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Taşı
                  </button>
                  <button
                    type="button"
                    onClick={() => run(onUnassign)}
                    disabled={busy}
                    className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
                  >
                    Kulübeden çıkar
                  </button>
                </div>
              )}
            </div>

            {/* Aktif notlar (unlem rozetinin sebebi) en ustte gorunur */}
            {activeNotes.length > 0 && (
              <div className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-2">
                {activeNotes.map((n) => (
                  <div key={n.id} className="flex items-start justify-between gap-2">
                    <p className="text-xs text-amber-900">
                      <span className="mr-1 font-bold">!</span>
                      {n.note}
                      {n.visible_until && (
                        <span className="ml-1 text-amber-600">({formatDate(n.visible_until)} tarihine kadar)</span>
                      )}
                    </p>
                    {canManage && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(() => onDeleteNote(n.id))}
                        className="shrink-0 text-[11px] font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Muayene bekleyen icilmemis ogunler */}
            {unexaminedMissed.length > 0 && (
              <div className="space-y-2 rounded-lg border border-red-300 bg-red-50 p-2">
                <p className="text-xs font-semibold text-red-800">
                  Muayene bekliyor — içmediği öğünler:
                </p>
                <p className="text-xs text-red-700">
                  {unexaminedMissed
                    .map((m) => `${formatDate(m.meal_date)} ${String(m.meal_hour).padStart(2, "0")}:00`)
                    .join(", ")}
                </p>
                {canManage && (
                  <div className="flex gap-2">
                    <input
                      value={examText}
                      onChange={(e) => setExamText(e.target.value)}
                      placeholder="Muayene sonucu..."
                      className="input flex-1"
                    />
                    <button
                      type="button"
                      disabled={busy || !examText.trim()}
                      onClick={() =>
                        run(async () => {
                          for (const m of unexaminedMissed) {
                            await onMealExam(m.id, examText.trim());
                          }
                          setExamText("");
                        })
                      }
                      className="btn-primary shrink-0"
                    >
                      Kaydet
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Dogum + kan brix */}
            <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
              <p className="text-xs font-semibold text-neutral-700">Doğum ve Kan Brix</p>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-neutral-600">Doğum tarihi ve saati</span>
                <input
                  type="datetime-local"
                  value={bornAtInput}
                  onChange={(e) => setBornAtInput(e.target.value)}
                  disabled={!canManage}
                  className="input"
                />
              </label>
              {brixState && (
                <p
                  className={`rounded-md px-2 py-1 text-xs ${
                    brixState.kind === "due"
                      ? "border border-red-300 bg-red-50 font-semibold text-red-700"
                      : brixState.kind === "waiting"
                        ? "border border-amber-200 bg-amber-50 text-amber-800"
                        : "border border-green-200 bg-green-50 text-green-800"
                  }`}
                >
                  {brixState.kind === "due" && `Kan Brix zamanı geldi (${formatDateTime(brixState.due.toISOString())})`}
                  {brixState.kind === "waiting" && `Kan Brix: ${formatDateTime(brixState.due.toISOString())} tarihinde bakılacak`}
                  {brixState.kind === "done" &&
                    `Kan Brix: ${birthRecord?.blood_brix}${birthRecord?.blood_brix_at ? ` (${formatDateTime(birthRecord.blood_brix_at)})` : ""}`}
                </p>
              )}
              <div className="flex items-end gap-2">
                <label className="block flex-1">
                  <span className="mb-1 block text-xs font-medium text-neutral-600">Kan Brix değeri</span>
                  <input
                    inputMode="decimal"
                    value={brixInput}
                    onChange={(e) => setBrixInput(e.target.value)}
                    placeholder="örn. 8.5"
                    disabled={!canManage}
                    className="input"
                  />
                </label>
              </div>
              {canManage && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      onSaveBirth({
                        born_at: bornAtInput ? new Date(bornAtInput).toISOString() : null,
                        blood_brix: numOrNull(brixInput),
                        blood_brix_at:
                          numOrNull(brixInput) != null && birthRecord?.blood_brix == null
                            ? new Date().toISOString()
                            : birthRecord?.blood_brix_at ?? null,
                      })
                    )
                  }
                  className="btn-secondary"
                >
                  {busy ? "Kaydediliyor..." : "Doğum/Brix Kaydet"}
                </button>
              )}
            </div>

            {/* Kolostrum */}
            <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
              <p className="text-xs font-semibold text-neutral-700">İlk 2 Kolostrum</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-neutral-600">1. kolostrum (litre)</span>
                  <input inputMode="decimal" value={col1L} onChange={(e) => setCol1L(e.target.value)} disabled={!canManage} className="input" placeholder="örn. 3" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-neutral-600">1. kolostrum Brix</span>
                  <input inputMode="decimal" value={col1B} onChange={(e) => setCol1B(e.target.value)} disabled={!canManage} className="input" placeholder="örn. 24" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-neutral-600">2. kolostrum (litre)</span>
                  <input inputMode="decimal" value={col2L} onChange={(e) => setCol2L(e.target.value)} disabled={!canManage} className="input" placeholder="örn. 2" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-neutral-600">2. kolostrum Brix</span>
                  <input inputMode="decimal" value={col2B} onChange={(e) => setCol2B(e.target.value)} disabled={!canManage} className="input" placeholder="örn. 22" />
                </label>
              </div>
              {canManage && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      onSaveBirth({
                        colostrum1_liters: numOrNull(col1L),
                        colostrum1_brix: numOrNull(col1B),
                        colostrum2_liters: numOrNull(col2L),
                        colostrum2_brix: numOrNull(col2B),
                      })
                    )
                  }
                  className="btn-secondary"
                >
                  {busy ? "Kaydediliyor..." : "Kolostrum Kaydet"}
                </button>
              )}
            </div>

            {/* Pectolit */}
            <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-neutral-700">Pectolit</p>
                {pectolit && (
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                    Gün {Math.min(courseCurrentDay(pectolit.start_date), pectolit.total_days)}/{pectolit.total_days}
                  </span>
                )}
              </div>

              {pectolitAntibioticWarning && (
                <div className="rounded-md border border-purple-300 bg-purple-50 px-2 py-1.5">
                  <p className="text-xs font-semibold text-purple-800">
                    5 günü aşkın süredir ishal iyileşmedi — antibiyotik tedavisi başlatılması öneriliyor.
                  </p>
                  <p className="text-[11px] text-purple-700">
                    Pectolit isterseniz devam edebilir; aşağıdan &quot;Tedavi&quot; bölümünden antibiyotik protokolü
                    başlatabilirsiniz.
                  </p>
                </div>
              )}

              {pectolit ? (
                <div className="space-y-2">
                  <p className="text-xs text-neutral-500">
                    09:00 ve 21:00 öğünlerinde Pectolit içecek; işaretlenen öğünler sarı görünür.
                  </p>

                  {pectolitNeedsResponse ? (
                    <div className="space-y-2 rounded-md border border-blue-300 bg-blue-50 p-2">
                      <p className="text-xs font-semibold text-blue-900">
                        {pectolit.total_days} günlük Pectolit süresi doldu — ishal iyileşti mi?
                      </p>
                      {canManage && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => run(() => onPectolitResponse(true))}
                            className="rounded-md border border-green-600 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-100 disabled:opacity-50"
                          >
                            İyileşti (Bitir)
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => run(() => onPectolitResponse(false))}
                            className="rounded-md border border-red-500 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            İyileşmedi (+1 gün)
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    canManage && (
                      <button type="button" disabled={busy} onClick={() => run(onCancelPectolit)} className="btn-secondary">
                        Pectolit&apos;i İptal Et
                      </button>
                    )
                  )}
                </div>
              ) : (
                canManage && (
                  <button type="button" disabled={busy} onClick={() => run(onStartPectolit)} className="btn-primary">
                    Pectolit Başla (3 gün · 09:00 ve 21:00)
                  </button>
                )
              )}

              {pectolitHistory.length > 0 && (
                <div className="border-t border-neutral-100 pt-1.5">
                  <p className="text-[11px] text-neutral-400">
                    Geçmiş kürler:{" "}
                    {pectolitHistory
                      .filter((c) => c.status !== "aktif")
                      .slice(0, 3)
                      .map((c) => `${formatDate(c.start_date)} (${c.total_days} gün, ${c.status})`)
                      .join(" · ") || "yok"}
                  </p>
                </div>
              )}
            </div>

            {/* Tedavi */}
            <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-neutral-700">Tedavi</p>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setShowAiAssist((v) => !v)}
                    className="text-xs font-medium text-purple-600 hover:underline"
                  >
                    🤖 AI Sağlık Asistanı
                  </button>
                )}
              </div>

              {showAiAssist && canManage && (
                <div className="space-y-2 rounded-md border border-purple-200 bg-purple-50/50 p-2">
                  <p className="text-xs font-medium text-neutral-700">Teşhis seçin:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {protocols.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setAiDiagnosis(p.name)}
                        className={`chip ${aiDiagnosis === p.name ? "chip-selected" : "chip-unselected"}`}
                      >
                        {p.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAiDiagnosis("__other__")}
                      className={`chip ${aiDiagnosis === "__other__" ? "chip-selected" : "chip-unselected"}`}
                    >
                      Diğer
                    </button>
                  </div>
                  {aiDiagnosis === "__other__" && (
                    <input
                      value={aiCustomDiagnosis}
                      onChange={(e) => setAiCustomDiagnosis(e.target.value)}
                      placeholder="Teşhisi yazın"
                      className="input"
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleAiAnalyze}
                    disabled={aiLoading || !aiDiagnosis || (aiDiagnosis === "__other__" && !aiCustomDiagnosis.trim())}
                    className="btn-primary"
                  >
                    {aiLoading ? "Analiz ediliyor..." : "Analiz Et"}
                  </button>
                  {aiError && <p className="text-xs text-red-600">{aiError}</p>}
                  {aiResult && (
                    <div className="whitespace-pre-wrap rounded-md border border-purple-200 bg-white p-2 text-xs leading-relaxed text-neutral-800">
                      {aiResult}
                    </div>
                  )}
                </div>
              )}

              {legacyStatus?.under_treatment && !activeCourse && (
                <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-2 py-1.5">
                  <p className="text-xs text-red-800">Tedavide işaretli{legacyStatus.note ? `: ${legacyStatus.note}` : ""}</p>
                  {canManage && (
                    <button type="button" disabled={busy} onClick={() => run(onClearLegacyStatus)} className="text-xs font-medium text-green-700 hover:underline">
                      Sağlıklı işaretle
                    </button>
                  )}
                </div>
              )}

              {activeCourse && courseInfo ? (
                <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-2">
                  <p className="text-sm font-semibold text-red-800">
                    {courseInfo.protocol?.name ?? "Protokol"} · Gün {Math.min(courseInfo.currentDay, courseInfo.maxDay)}/
                    {courseInfo.maxDay}
                  </p>
                  <p className="text-xs text-red-700">Başlangıç: {formatDate(activeCourse.start_date)}</p>
                  {courseInfo.todayMeds && (
                    <p className="text-xs text-red-900">
                      <span className="font-medium">Bugün:</span> {courseInfo.todayMeds}
                    </p>
                  )}
                  {canManage && (
                    <div className="flex gap-2">
                      <button type="button" disabled={busy} onClick={() => run(() => onSetCourseStatus(activeCourse.id, "tamamlandi"))} className="btn-secondary">
                        Tedaviyi Tamamla
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(() => onSetCourseStatus(activeCourse.id, "iptal"))}
                        className="rounded-md border border-red-400 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        İptal Et
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                canManage && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-neutral-500">Tedavi başlatmak için protokol seçin:</p>
                      <button
                        type="button"
                        onClick={() => openProtocolEditor(null)}
                        className="text-xs font-medium text-green-700 hover:underline"
                      >
                        Yeni Protokol
                      </button>
                    </div>
                    <div className="space-y-1">
                      {protocols.map((p) => {
                        const dayCount = protocolDays.filter((d) => d.protocol_id === p.id).length;
                        const isSelected = selectedProtocolId === p.id;
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${
                              isSelected ? "border-green-600 bg-green-50" : "border-neutral-200"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedProtocolId(p.id === selectedProtocolId ? null : p.id)}
                              className="flex-1 text-left"
                            >
                              <span className={`text-xs font-semibold ${isSelected ? "text-green-800" : "text-neutral-800"}`}>
                                {p.name}
                              </span>
                              <span className="ml-2 text-[11px] text-neutral-500">{dayCount} gün</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openProtocolEditor(p.id)}
                              className="shrink-0 text-[11px] font-medium text-neutral-500 underline hover:no-underline"
                            >
                              Düzenle
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleDeleteProtocol(p.id, p.name)}
                              className="shrink-0 text-[11px] font-medium text-red-600 underline hover:no-underline disabled:opacity-50"
                            >
                              Sil
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {deleteProtocolError && <p className="text-xs text-red-600">{deleteProtocolError}</p>}

                    {editingProtocolId !== null && (
                      <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50/50 p-2">
                        <p className="text-xs font-semibold text-neutral-700">
                          {editingProtocolId === "" ? "Yeni Protokol" : "Protokolü Düzenle"}
                        </p>
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-neutral-600">Protokol adı</span>
                          <input
                            value={protocolNameDraft}
                            onChange={(e) => setProtocolNameDraft(e.target.value)}
                            placeholder="örn. Pnömoni Tedavisi"
                            className="input"
                          />
                        </label>
                        {protocolDaysDraft.map((meds, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="mt-2 w-10 shrink-0 text-xs font-medium text-neutral-600">Gün {i + 1}</span>
                            <textarea
                              value={meds}
                              onChange={(e) =>
                                setProtocolDaysDraft((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                              }
                              placeholder="İlaçlar (örn. BAYTRİL-C VİT)"
                              className="input flex-1"
                              rows={1}
                            />
                            <button
                              type="button"
                              onClick={() => setProtocolDaysDraft((prev) => prev.filter((_, j) => j !== i))}
                              disabled={protocolDaysDraft.length <= 1}
                              className="mt-2 shrink-0 text-[11px] text-red-500 hover:underline disabled:opacity-40"
                            >
                              Sil
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setProtocolDaysDraft((prev) => [...prev, ""])}
                            className="btn-secondary"
                          >
                            Gün Ekle
                          </button>
                          <button
                            type="button"
                            disabled={busy || !protocolNameDraft.trim() || protocolDaysDraft.every((d) => !d.trim())}
                            onClick={() =>
                              run(async () => {
                                await onSaveProtocol(
                                  editingProtocolId === "" ? null : editingProtocolId,
                                  protocolNameDraft.trim(),
                                  protocolDaysDraft
                                    .map((meds, i) => ({ day_number: i + 1, medicines: meds.trim() }))
                                    .filter((d) => d.medicines)
                                );
                                setEditingProtocolId(null);
                              })
                            }
                            className="btn-primary"
                          >
                            {busy ? "Kaydediliyor..." : "Protokolü Kaydet"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingProtocolId(null)}
                            className="text-xs text-neutral-500 underline hover:no-underline"
                          >
                            Vazgeç
                          </button>
                        </div>
                      </div>
                    )}
                    {selectedProtocolId && (
                      <div className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-2">
                        <div className="space-y-1">
                          {daysOf(selectedProtocolId).map((d) => (
                            <p key={d.id} className="text-[11px] text-neutral-600">
                              <span className="font-semibold">Gün {d.day_number}:</span> {d.medicines}
                            </p>
                          ))}
                        </div>
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-neutral-600">Başlangıç tarihi</span>
                          <input type="date" value={courseStartDate} onChange={(e) => setCourseStartDate(e.target.value)} className="input" />
                        </label>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              await onStartCourse(selectedProtocolId, courseStartDate);
                              setSelectedProtocolId(null);
                            })
                          }
                          className="btn-primary"
                        >
                          {busy ? "Başlatılıyor..." : "Tedaviyi Başlat"}
                        </button>
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Tedavi gecmisi */}
              <div className="space-y-2 border-t border-neutral-100 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-neutral-600">Tedavi Geçmişi</p>
                  {canManage && (
                    <button type="button" onClick={() => setShowTreatmentForm((v) => !v)} className="text-xs font-medium text-green-700 hover:underline">
                      {showTreatmentForm ? "Vazgeç" : "Kayıt Ekle"}
                    </button>
                  )}
                </div>

                {showTreatmentForm && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newTreatmentDescription.trim()) return;
                      run(async () => {
                        await onAddTreatment({
                          treatment_date: newTreatmentDate,
                          diagnosis: newTreatmentDiagnosis.trim() || null,
                          protocol_day: newTreatmentDay.trim() ? Number(newTreatmentDay) : null,
                          description: newTreatmentDescription.trim(),
                          note: newTreatmentNote.trim() || null,
                        });
                        setNewTreatmentDiagnosis("");
                        setNewTreatmentDay("");
                        setNewTreatmentDescription("");
                        setNewTreatmentNote("");
                        setShowTreatmentForm(false);
                      });
                    }}
                    className="space-y-2 rounded-md border border-neutral-200 p-2"
                  >
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-neutral-600">Tarih</span>
                      <input type="date" value={newTreatmentDate} onChange={(e) => setNewTreatmentDate(e.target.value)} className="input" />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-neutral-600">Teşhis (opsiyonel)</span>
                        <input value={newTreatmentDiagnosis} onChange={(e) => setNewTreatmentDiagnosis(e.target.value)} placeholder="örn. PNÖMONİ" className="input" />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-neutral-600">Protokol günü</span>
                        <input type="number" min={1} value={newTreatmentDay} onChange={(e) => setNewTreatmentDay(e.target.value)} placeholder="örn. 1" className="input" />
                      </label>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-neutral-600">Tedavi / ilaçlar</span>
                      <textarea value={newTreatmentDescription} onChange={(e) => setNewTreatmentDescription(e.target.value)} placeholder="örn. CLAVON-C VİT-B VİT" className="input" rows={2} />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-neutral-600">Not (opsiyonel)</span>
                      <input value={newTreatmentNote} onChange={(e) => setNewTreatmentNote(e.target.value)} placeholder="örn. iştahı iyi" className="input" />
                    </label>
                    <button type="submit" disabled={busy || !newTreatmentDescription.trim()} className="btn-primary">
                      {busy ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                  </form>
                )}

                {sortedTreatments.length === 0 ? (
                  <p className="text-xs text-neutral-400">Kayıtlı tedavi yok.</p>
                ) : (
                  <div className="max-h-40 space-y-1.5 overflow-y-auto">
                    {sortedTreatments.map((t) => (
                      <div key={t.id} className="rounded-md border border-neutral-100 px-2 py-1.5 text-xs">
                        <p className="font-medium text-neutral-800">
                          {formatDate(t.treatment_date)}
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
            </div>

            {/* Mama gecmisi */}
            <div className="space-y-1.5 rounded-lg border border-neutral-200 p-3">
              <p className="text-xs font-semibold text-neutral-700">Son Öğünler</p>
              <div className="space-y-1">
                {recentSlots.map((slot) => {
                  const meal = findMeal(meals, animal.id, slot);
                  const drank = meal ? meal.drank : true;
                  return (
                    <p key={`${slot.date}-${slot.hour}`} className="flex items-center gap-2 text-xs text-neutral-600">
                      <span className={`h-2 w-2 rounded-full ${!drank ? "bg-red-600" : meal?.pectolit ? "bg-yellow-400" : "bg-green-600"}`} />
                      {formatDate(slot.date)} {formatMealHour(slot.hour)} ·{" "}
                      <span className={!drank ? "font-medium text-red-600" : "text-green-700"}>{drank ? "İçti" : "İçmedi"}</span>
                      {meal?.pectolit && <span className="text-yellow-700">Pectolit</span>}
                      {!meal && <span className="text-neutral-400">(kayıt yok, içti sayıldı)</span>}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* Notlar */}
            <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
              <p className="text-xs font-semibold text-neutral-700">Notlar</p>
              {canManage && (
                <div className="space-y-2">
                  <input
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Bu buzağı için not..."
                    className="input"
                  />
                  <div className="flex items-end gap-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-neutral-600">Kaç gün görünsün?</span>
                      <input
                        type="number"
                        min={0}
                        value={noteDays}
                        onChange={(e) => setNoteDays(e.target.value)}
                        className="input w-24"
                      />
                    </label>
                    <p className="flex-1 pb-2 text-[11px] text-neutral-400">
                      Süre boyunca kulübede sarı ünlem yanar. 0 = rozetsiz not.
                    </p>
                    <button
                      type="button"
                      disabled={busy || !noteInput.trim()}
                      onClick={() =>
                        run(async () => {
                          const days = Number(noteDays);
                          await onAddNote(noteInput.trim(), Number.isFinite(days) && days > 0 ? days : null);
                          setNoteInput("");
                        })
                      }
                      className="btn-secondary shrink-0"
                    >
                      Ekle
                    </button>
                  </div>
                </div>
              )}
              {notes.length === 0 ? (
                <p className="text-xs text-neutral-400">Not yok.</p>
              ) : (
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {notes.map((n) => (
                    <div key={n.id} className="flex items-start justify-between gap-2 rounded-md bg-neutral-50 px-2 py-1">
                      <p className="text-xs text-neutral-700">
                        {n.note} <span className="text-neutral-400">· {formatDateTime(n.created_at)}</span>
                      </p>
                      {canManage && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(() => onDeleteNote(n.id))}
                          className="shrink-0 text-[11px] font-medium text-red-600 hover:underline disabled:opacity-50"
                        >
                          Sil
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tasima */}
            {canManage && moveTargets.length > 0 && (
              <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
                <p className="text-xs font-semibold text-neutral-700">Başka Kulübeye Taşı</p>
                <p className="text-[11px] text-neutral-400">İpucu: kulübeleri sürükleyip bırakarak da taşıyabilirsiniz.</p>
                <div className="flex gap-2">
                  <select value={moveTargetId} onChange={(e) => setMoveTargetId(e.target.value)} className="input flex-1">
                    <option value="">Boş kulübe seçin...</option>
                    {moveTargets.map((t) => (
                      <option key={t.slotId} value={t.slotId}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy || !moveTargetId}
                    onClick={() => run(() => onMove(moveTargetId))}
                    className="btn-secondary shrink-0"
                  >
                    Taşı
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
