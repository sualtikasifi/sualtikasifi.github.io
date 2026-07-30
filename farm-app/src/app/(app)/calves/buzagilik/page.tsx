"use client";

import { useState } from "react";
import { CalfHousingSlot } from "@/lib/types";
import { useCalfCare } from "@/lib/useCalfCare";
import { MealSlotRef, findMeal } from "@/lib/meals";
import { hasPermission } from "@/lib/permissions";
import { CalfNotesPanel } from "@/components/CalfNotesPanel";
import { CalfSlotBox } from "@/components/CalfSlotBox";
import { CalfDetailModal, MoveTarget } from "@/components/CalfDetailModal";
import { FeedingSessionBar } from "@/components/FeedingSessionBar";
import { MealEntrySheet } from "@/components/MealEntrySheet";
import { MealHistoryPanel } from "@/components/MealHistoryPanel";
import { DailyTreatmentTable } from "@/components/DailyTreatmentTable";
import { VaccinationPanel } from "@/components/VaccinationPanel";

const COLUMN_COUNT = 6;
const HUTS_PER_COLUMN = 20;

function slotLabel(slot: CalfHousingSlot): string {
  if (slot.structure === "iglo") return `İglo ${slot.group_index + 1} · ${slot.slot_index + 1}`;
  return `Sıra ${slot.group_index + 1} · ${slot.slot_index + 1}`;
}

export default function BuzagilikPage() {
  const care = useCalfCare("buzagilik");
  const canManage = hasPermission(care.profile, "can_manage_calves");

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [entryMeal, setEntryMeal] = useState<MealSlotRef | null>(null);
  const [entrySlotId, setEntrySlotId] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [dragSlotId, setDragSlotId] = useState<string | null>(null);

  const columns = Array.from({ length: COLUMN_COUNT }, (_, g) =>
    care.slots.filter((s) => s.group_index === g).sort((a, b) => a.slot_index - b.slot_index)
  );
  const selectedSlot = care.slots.find((s) => s.id === selectedSlotId);
  const entrySlot = care.slots.find((s) => s.id === entrySlotId);

  const emptyTargets: MoveTarget[] = [...care.slots, ...care.otherSlots]
    .filter((s) => !s.animal_id)
    .map((s) => ({ slotId: s.id, label: slotLabel(s) }));

  const occupied = care.slots.filter((s) => s.animal_id);
  const treatedCount = occupied.filter((s) => care.underTreatment(s.animal_id!)).length;
  const examPendingCount = occupied.filter((s) => care.unexaminedMissedFor(s.animal_id!).length > 0).length;

  function handleBoxClick(slot: CalfHousingSlot) {
    if (entryMeal) {
      if (!slot.animal_id) return;
      if (bulkMode) {
        setBulkSelected((prev) => {
          const next = new Set(prev);
          if (next.has(slot.animal_id!)) next.delete(slot.animal_id!);
          else next.add(slot.animal_id!);
          return next;
        });
        return;
      }
      setEntrySlotId(slot.id === entrySlotId ? null : slot.id);
      return;
    }
    setSelectedSlotId(slot.id === selectedSlotId ? null : slot.id);
  }

  async function finishEntryMode() {
    if (entryMeal && bulkMode && bulkSelected.size > 0) {
      for (const animalId of bulkSelected) {
        await care.handleMarkMeal(animalId, entryMeal, false);
      }
    }
    setEntryMeal(null);
    setEntrySlotId(null);
    setBulkMode(false);
    setBulkSelected(new Set());
  }

  const BOX_HEIGHT = 44;
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
              pectolitPending={!!(slot.animal_id && care.pectolitPending(slot.animal_id))}
              alertNote={!!(slot.animal_id && care.activeNotesFor(slot.animal_id).length > 0)}
              alertExam={!!(slot.animal_id && care.unexaminedMissedFor(slot.animal_id).length > 0)}
              selected={
                selectedSlotId === slot.id ||
                entrySlotId === slot.id ||
                !!(bulkMode && slot.animal_id && bulkSelected.has(slot.animal_id))
              }
              onClick={() => handleBoxClick(slot)}
              draggable={canManage && !entryMeal}
              onDragStartSlot={() => setDragSlotId(slot.id)}
              onDropOnSlot={() => {
                if (dragSlotId && dragSlotId !== slot.id) care.handleMove(dragSlotId, slot.id);
                setDragSlotId(null);
              }}
              className="h-11 w-full shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Buzağılık</h1>

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
          bulkMode={bulkMode}
          bulkCount={bulkSelected.size}
          onToggleBulk={() => {
            setBulkMode((v) => !v);
            setBulkSelected(new Set());
            setEntrySlotId(null);
          }}
        />
      )}

      {!care.loading && <MealHistoryPanel animals={care.animals} />}

      {!care.loading && (
        <DailyTreatmentTable
          courses={care.courses.filter((c) => care.slots.some((s) => s.animal_id === c.animal_id))}
          protocols={care.protocols}
          protocolDays={care.protocolDays}
          animals={care.animals}
          treatments={care.treatments}
          canManage={canManage}
          onLogDone={({ course, day, diagnosis, medicines, note }) =>
            care.handleAddTreatment(course.animal_id, {
              treatment_date: new Date().toISOString().slice(0, 10),
              diagnosis,
              protocol_day: day,
              description: medicines,
              note,
              course_id: course.id,
            })
          }
        />
      )}

      {care.loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : (
        <div className="card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-neutral-800">
              Buzağılık Odası
              {entryMeal && <span className="ml-2 font-normal text-amber-700">(öğün işaretleme modu)</span>}
            </h2>
            <p className="text-xs text-neutral-500">
              Dolu: <span className="font-semibold text-neutral-800">{occupied.length}/{COLUMN_COUNT * HUTS_PER_COLUMN}</span>
              {" · "}Tedavide: <span className="font-semibold text-red-700">{treatedCount}</span>
              {" · "}Muayene bekleyen: <span className="font-semibold text-red-700">{examPendingCount}</span>
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {columns.map((column, g) => renderHutColumn(column, `Sıra ${g + 1}`))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">
            Kırmızı çerçeve: tedavide (üstte protokol adı) · Noktalar: son 5 öğün, soldan en yeni (yeşil içti, kırmızı
            içmedi, sarı Pectolit) · Yanıp sönen sarı nokta: Pectolit içecek · Kırmızı ünlem: muayene bekliyor · Sarı
            ünlem: aktif not var · Taşımak için kulübeyi sürükleyip bırakın.
          </p>
        </div>
      )}

      <VaccinationPanel />

      {selectedSlot && !entryMeal && (
        <CalfDetailModal
          label={slotLabel(selectedSlot)}
          animal={care.animalById(selectedSlot.animal_id)}
          availableCalves={care.availableCalves}
          meals={selectedSlot.animal_id ? care.mealsFor(selectedSlot.animal_id) : []}
          birthRecord={selectedSlot.animal_id ? care.birthRecordFor(selectedSlot.animal_id) : undefined}
          pectolit={selectedSlot.animal_id ? care.pectolitFor(selectedSlot.animal_id) : undefined}
          notes={selectedSlot.animal_id ? care.notesFor(selectedSlot.animal_id) : []}
          courses={selectedSlot.animal_id ? care.coursesFor(selectedSlot.animal_id) : []}
          protocols={care.protocols}
          protocolDays={care.protocolDays}
          treatments={selectedSlot.animal_id ? care.treatmentsFor(selectedSlot.animal_id) : []}
          legacyStatus={selectedSlot.animal_id ? care.legacyStatusFor(selectedSlot.animal_id) : undefined}
          moveTargets={emptyTargets}
          onAssign={(animalId) => care.handleAssign(selectedSlot.id, animalId)}
          onUnassign={async () => {
            await care.handleAssign(selectedSlot.id, null);
            setSelectedSlotId(null);
          }}
          onMove={async (targetSlotId) => {
            await care.handleMove(selectedSlot.id, targetSlotId);
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
          onAddNote={(text, days) =>
            selectedSlot.animal_id ? care.handleAddNote(selectedSlot.animal_id, text, days) : Promise.resolve()
          }
          onMealExam={(mealId, result) => care.handleMealExam(mealId, result)}
          onSaveProtocol={(protocolId, name, days) => care.handleSaveProtocol(protocolId, name, days)}
          onClearLegacyStatus={() =>
            selectedSlot.animal_id ? care.handleClearLegacyStatus(selectedSlot.animal_id) : Promise.resolve()
          }
          onClose={() => setSelectedSlotId(null)}
        />
      )}

      {entryMeal && !bulkMode && entrySlot?.animal_id && (
        <MealEntrySheet
          animal={care.animalById(entrySlot.animal_id)!}
          slot={entryMeal}
          existing={findMeal(care.meals, entrySlot.animal_id, entryMeal)}
          pectolitPending={care.pectolitPending(entrySlot.animal_id)}
          onMark={(drank) => care.handleMarkMeal(entrySlot.animal_id!, entryMeal, drank)}
          onClose={() => setEntrySlotId(null)}
        />
      )}
    </div>
  );
}
