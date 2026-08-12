"use client";

import Link from "next/link";
import { useState } from "react";
import { CalfHousingSlot } from "@/lib/types";
import { useCalfCare } from "@/lib/useCalfCare";
import { MealSlotRef } from "@/lib/meals";
import { hasPermission } from "@/lib/permissions";
import { CalfNotesPanel } from "@/components/CalfNotesPanel";
import { CalfSlotBox } from "@/components/CalfSlotBox";
import { CalfDetailModal, MoveTarget } from "@/components/CalfDetailModal";
import { FeedingSessionBar } from "@/components/FeedingSessionBar";
import { MealHistoryPanel } from "@/components/MealHistoryPanel";
import { PageHeader } from "@/components/PageHeader";
import { PinchZoomPan } from "@/components/PinchZoomPan";
import { slotLabel } from "@/lib/format";

const COLUMN_COUNT = 6;
const HUTS_PER_COLUMN = 20;

export default function BuzagilikPage() {
  const care = useCalfCare("buzagilik");
  const canManage = hasPermission(care.profile, "can_manage_calves");

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [entryMeal, setEntryMeal] = useState<MealSlotRef | null>(null);
  const [mealSelection, setMealSelection] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);
  const [dragSlotId, setDragSlotId] = useState<string | null>(null);
  const [moveSourceSlotId, setMoveSourceSlotId] = useState<string | null>(null);

  const columns = Array.from({ length: COLUMN_COUNT }, (_, g) =>
    care.slots.filter((s) => s.group_index === g).sort((a, b) => a.slot_index - b.slot_index)
  );
  const selectedSlot = care.slots.find((s) => s.id === selectedSlotId);

  const emptyTargets: MoveTarget[] = [...care.slots, ...care.otherSlots]
    .filter((s) => !s.animal_id)
    .map((s) => ({ slotId: s.id, label: slotLabel(s) }));

  const occupied = care.slots.filter((s) => s.animal_id);
  const treatedCount = occupied.filter((s) => care.underTreatment(s.animal_id!)).length;
  const examPendingCount = occupied.filter((s) => care.unexaminedMissedFor(s.animal_id!).length > 0).length;

  function handleBoxClick(slot: CalfHousingSlot) {
    if (moveSourceSlotId) {
      if (slot.id !== moveSourceSlotId) care.handleMove(moveSourceSlotId, slot.id);
      setMoveSourceSlotId(null);
      return;
    }
    if (entryMeal) {
      if (!slot.animal_id) return;
      setMealSelection((prev) => {
        const next = new Set(prev);
        if (next.has(slot.animal_id!)) next.delete(slot.animal_id!);
        else next.add(slot.animal_id!);
        return next;
      });
      return;
    }
    setSelectedSlotId(slot.id === selectedSlotId ? null : slot.id);
  }

  async function markSelection(drank: boolean) {
    if (!entryMeal || mealSelection.size === 0) return;
    setMarking(true);
    for (const animalId of mealSelection) {
      await care.handleMarkMeal(animalId, entryMeal, drank);
    }
    setMealSelection(new Set());
    setMarking(false);
  }

  function finishEntryMode() {
    setEntryMeal(null);
    setMealSelection(new Set());
  }

  const BOX_HEIGHT = 52;
  const BOX_GAP = 4;
  const COLUMN_HEIGHT = HUTS_PER_COLUMN * BOX_HEIGHT + (HUTS_PER_COLUMN - 1) * BOX_GAP + 12;

  function renderHutColumn(column: CalfHousingSlot[], columnLabel: string) {
    return (
      <div key={columnLabel} className="flex w-16 shrink-0 flex-col items-center">
        <p className="mb-1 text-center text-xs font-medium text-neutral-500">{columnLabel}</p>
        <div
          className="flex w-full flex-col-reverse gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1.5"
          style={{ height: COLUMN_HEIGHT }}
        >
          {column.map((slot, i) => (
            <CalfSlotBox
              key={slot.id}
              label={`${columnLabel} · ${i + 1}`}
              animal={care.animalById(slot.animal_id)}
              underTreatment={!!(slot.animal_id && care.underTreatment(slot.animal_id))}
              treatmentLabel={slot.animal_id ? care.activeProtocolNameFor(slot.animal_id) : null}
              meals={slot.animal_id ? care.mealsFor(slot.animal_id) : []}
              ageDays={slot.animal_id ? care.ageDaysFor(slot.animal_id) : null}
              ageOverdue={!!(slot.animal_id && (care.ageDaysFor(slot.animal_id) ?? 0) > 30)}
              pectolitPending={!!(slot.animal_id && care.pectolitPending(slot.animal_id))}
              alertNote={!!(slot.animal_id && care.activeNotesFor(slot.animal_id).length > 0)}
              alertExam={!!(slot.animal_id && care.unexaminedMissedFor(slot.animal_id).length > 0)}
              alertPectolitResponse={!!(slot.animal_id && care.pectolitNeedsResponse(slot.animal_id))}
              alertAntibiotic={!!(slot.animal_id && care.pectolitAntibioticWarning(slot.animal_id))}
              selected={
                selectedSlotId === slot.id || !!(entryMeal && slot.animal_id && mealSelection.has(slot.animal_id))
              }
              onClick={() => handleBoxClick(slot)}
              draggable={canManage && !entryMeal && !moveSourceSlotId}
              onDragStartSlot={() => setDragSlotId(slot.id)}
              onDropOnSlot={() => {
                if (dragSlotId && dragSlotId !== slot.id) care.handleMove(dragSlotId, slot.id);
                setDragSlotId(null);
              }}
              moveTarget={!!moveSourceSlotId}
              className="h-[52px] w-full shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon="🏠"
        title="Buzağılık"
        subtitle="120 kulübe · beslenme, tedavi ve raporlar"
        color="green"
        backHref="/calves"
      />

      <CalfNotesPanel />

      {care.brixAlerts.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3">
          <p className="mb-1 text-sm font-semibold text-red-800">Kan Brix ölçümü bekleyenler (36 saat doldu)</p>
          <p className="text-xs text-red-700">
            {care.brixAlerts.map((a) => a.animal.ear_tag).join(", ")} — kulübeye tıklayıp Kan Brix değerini girin.
          </p>
        </div>
      )}

      {!care.loading && (
        <FeedingSessionBar
          meals={care.meals}
          slotAnimalIds={care.slots.map((s) => s.animal_id).filter((id): id is string => !!id)}
          activeMeal={entryMeal}
          onSelectMeal={(slot) => {
            setEntryMeal(slot);
            setSelectedSlotId(null);
          }}
          onFinish={finishEntryMode}
          canManage={canManage}
          selectionCount={mealSelection.size}
          marking={marking}
          onMarkSelected={markSelection}
        />
      )}

      {!care.loading && <MealHistoryPanel animals={care.animals} />}

      <Link
        href="/calves/tedaviler"
        className="btn-primary flex items-center justify-center gap-1.5 bg-gradient-to-r from-rose-600 to-rose-700"
      >
        🩺 Tedavi Listesi
      </Link>

      {care.loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : (
        <div className="card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-neutral-800">
              Buzağılık Odası
              {entryMeal && <span className="ml-2 font-normal text-amber-700">(öğün işaretleme modu)</span>}
              {moveSourceSlotId && (
                <span className="ml-2 font-normal text-blue-700">
                  (taşıma modu — hedef kulübeye dokunun ·{" "}
                  <button type="button" onClick={() => setMoveSourceSlotId(null)} className="underline hover:no-underline">
                    Vazgeç
                  </button>
                  )
                </span>
              )}
            </h2>
            <p className="text-xs text-neutral-500">
              Dolu: <span className="font-semibold text-neutral-800">{occupied.length}/{COLUMN_COUNT * HUTS_PER_COLUMN}</span>
              {" · "}Tedavide: <span className="font-semibold text-red-700">{treatedCount}</span>
              {" · "}Muayene bekleyen: <span className="font-semibold text-red-700">{examPendingCount}</span>
            </p>
          </div>
          <p className="mb-1.5 text-[11px] text-neutral-400">
            İki parmakla yakınlaştırıp uzaklaştırabilir, yakınlaştırınca parmağınızla kaydırabilirsiniz.
          </p>
          <PinchZoomPan className="rounded-lg bg-neutral-50/50">
            <div className="flex gap-2 p-0.5">{columns.map((column, g) => renderHutColumn(column, `Sıra ${g + 1}`))}</div>
          </PinchZoomPan>
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">
            Kırmızı çerçeve: tedavide (üstte protokol adı) · Noktalar: son 5 öğün, soldan en yeni (yeşil içti, kırmızı
            içmedi, sarı Pectolit) · Yanıp sönen sarı nokta: Pectolit içecek · Kırmızı ünlem: muayene bekliyor · Sarı
            ünlem: aktif not var · Taşımak için kulübeyi sürükleyip bırakın ya da açıp &ldquo;Taşı&rdquo;ya basıp hedefe dokunun.
          </p>
        </div>
      )}

      {selectedSlot && !entryMeal && (
        <CalfDetailModal
          label={slotLabel(selectedSlot)}
          animal={care.animalById(selectedSlot.animal_id)}
          availableCalves={care.availableCalves}
          locationFor={(animalId) => {
            const slot = care.currentSlotForAnimal(animalId);
            return slot ? slotLabel(slot) : null;
          }}
          meals={selectedSlot.animal_id ? care.mealsFor(selectedSlot.animal_id) : []}
          birthRecord={selectedSlot.animal_id ? care.birthRecordFor(selectedSlot.animal_id) : undefined}
          pectolit={selectedSlot.animal_id ? care.activePectolitCourseFor(selectedSlot.animal_id) : undefined}
          pectolitHistory={selectedSlot.animal_id ? care.pectolitCoursesFor(selectedSlot.animal_id) : []}
          pectolitNeedsResponse={!!(selectedSlot.animal_id && care.pectolitNeedsResponse(selectedSlot.animal_id))}
          pectolitAntibioticWarning={!!(selectedSlot.animal_id && care.pectolitAntibioticWarning(selectedSlot.animal_id))}
          notes={selectedSlot.animal_id ? care.notesFor(selectedSlot.animal_id) : []}
          courses={selectedSlot.animal_id ? care.coursesFor(selectedSlot.animal_id) : []}
          protocols={care.protocols}
          protocolDays={care.protocolDays}
          treatments={selectedSlot.animal_id ? care.treatmentsFor(selectedSlot.animal_id) : []}
          legacyStatus={selectedSlot.animal_id ? care.legacyStatusFor(selectedSlot.animal_id) : undefined}
          moveTargets={emptyTargets}
          onAssign={(animalId) => care.handleAssign(selectedSlot.id, animalId)}
          onCreateAndAssign={(input) => care.handleCreateAndAssign(selectedSlot.id, input)}
          onUnassign={async () => {
            await care.handleAssign(selectedSlot.id, null);
            setSelectedSlotId(null);
          }}
          onMove={async (targetSlotId) => {
            await care.handleMove(selectedSlot.id, targetSlotId);
            setSelectedSlotId(null);
          }}
          onStartMove={() => {
            setMoveSourceSlotId(selectedSlot.id);
            setSelectedSlotId(null);
          }}
          onStartCourse={(protocolId, startDate) =>
            selectedSlot.animal_id
              ? care.handleStartCourse(selectedSlot.animal_id, protocolId, startDate)
              : Promise.resolve()
          }
          onSetCourseStatus={(courseId, status) => care.handleSetCourseStatus(courseId, status)}
          onAddTreatment={(input) =>
            selectedSlot.animal_id ? care.handleAddTreatment(selectedSlot.animal_id, input) : Promise.resolve()
          }
          onSaveBirth={(patch) =>
            selectedSlot.animal_id ? care.handleSaveBirth(selectedSlot.animal_id, patch) : Promise.resolve()
          }
          onStartPectolit={() =>
            selectedSlot.animal_id ? care.handleStartPectolit(selectedSlot.animal_id) : Promise.resolve()
          }
          onCancelPectolit={() =>
            selectedSlot.animal_id ? care.handleCancelPectolit(selectedSlot.animal_id) : Promise.resolve()
          }
          onPectolitResponse={(improved) =>
            selectedSlot.animal_id ? care.handlePectolitResponse(selectedSlot.animal_id, improved) : Promise.resolve()
          }
          onAddNote={(text, days) =>
            selectedSlot.animal_id ? care.handleAddNote(selectedSlot.animal_id, text, days) : Promise.resolve()
          }
          onDeleteNote={(noteId) => care.handleDeleteNote(noteId)}
          onMealExam={(mealId, result) => care.handleMealExam(mealId, result)}
          onSaveProtocol={(protocolId, name, days) => care.handleSaveProtocol(protocolId, name, days)}
          onClearLegacyStatus={() =>
            selectedSlot.animal_id ? care.handleClearLegacyStatus(selectedSlot.animal_id) : Promise.resolve()
          }
          onAiAssist={(diagnosis) =>
            selectedSlot.animal_id
              ? care.requestAiAssistFor(selectedSlot.animal_id, diagnosis)
              : Promise.reject(new Error("Hayvan seçili değil"))
          }
          onClose={() => setSelectedSlotId(null)}
        />
      )}
    </div>
  );
}
