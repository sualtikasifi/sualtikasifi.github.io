"use client";

import { useEffect, useState } from "react";
import {
  assignCalfToSlot,
  createCalfFeeding,
  createCalfTreatment,
  listAnimals,
  listCalfFeedings,
  listCalfHousingSlots,
  listCalfTreatments,
  listCalfTreatmentStatuses,
  setCalfTreatmentStatus,
} from "@/lib/data";
import { Animal, CalfFeeding, CalfHousingSlot, CalfTreatment, CalfTreatmentStatus } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { CalfNotesPanel } from "@/components/CalfNotesPanel";
import { CalfSlotBox } from "@/components/CalfSlotBox";
import { CalfSlotDetailPanel } from "@/components/CalfSlotDetailPanel";

export default function BuzagilikPage() {
  const { profile } = useAuth();
  const [slots, setSlots] = useState<CalfHousingSlot[]>([]);
  const [otherStructureSlots, setOtherStructureSlots] = useState<CalfHousingSlot[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [feedings, setFeedings] = useState<CalfFeeding[]>([]);
  const [treatmentStatuses, setTreatmentStatuses] = useState<CalfTreatmentStatus[]>([]);
  const [treatments, setTreatments] = useState<CalfTreatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  function loadData() {
    return Promise.all([
      listCalfHousingSlots("buzagilik"),
      listCalfHousingSlots("iglo"),
      listAnimals(),
      listCalfFeedings(),
      listCalfTreatmentStatuses(),
      listCalfTreatments(),
    ]);
  }

  useEffect(() => {
    loadData().then(([s, other, a, f, t, tr]) => {
      setSlots(s);
      setOtherStructureSlots(other);
      setAnimals(a);
      setFeedings(f);
      setTreatmentStatuses(t);
      setTreatments(tr);
      setLoading(false);
    });
  }, []);

  async function refresh() {
    const [s, other, a, f, t, tr] = await loadData();
    setSlots(s);
    setOtherStructureSlots(other);
    setAnimals(a);
    setFeedings(f);
    setTreatmentStatuses(t);
    setTreatments(tr);
  }

  const animalById = (id: string | null) => (id ? animals.find((a) => a.id === id) : undefined);
  const treatmentFor = (animalId: string) => treatmentStatuses.find((t) => t.animal_id === animalId);
  const feedingsFor = (animalId: string) => feedings.filter((f) => f.animal_id === animalId);
  const treatmentsFor = (animalId: string) => treatments.filter((t) => t.animal_id === animalId);

  const assignedElsewhere = new Set(
    [...slots, ...otherStructureSlots].map((s) => s.animal_id).filter((id): id is string => !!id)
  );
  const availableCalves = animals.filter((a) => a.weaned_at === null && !assignedElsewhere.has(a.id));

  const column20 = slots.filter((s) => s.group_index === 0).sort((a, b) => a.slot_index - b.slot_index);
  const column16 = slots.filter((s) => s.group_index === 1).sort((a, b) => a.slot_index - b.slot_index);
  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  async function handleAssign(slotId: string, animalId: string) {
    await assignCalfToSlot(slotId, animalId);
    await refresh();
  }

  async function handleUnassign(slotId: string) {
    await assignCalfToSlot(slotId, null);
    await refresh();
  }

  async function handleSetTreatment(animalId: string, underTreatment: boolean, note: string | null) {
    await setCalfTreatmentStatus(animalId, underTreatment, note, profile?.id ?? null);
    await refresh();
  }

  async function handleAddTreatment(
    animalId: string,
    input: { treatment_date: string; diagnosis: string | null; description: string }
  ) {
    await createCalfTreatment({ animal_id: animalId, created_by: profile?.id ?? null, ...input });
    await refresh();
  }

  async function handleLogFeeding(animalId: string, drank: boolean) {
    if (!profile) return;
    await createCalfFeeding({
      animal_id: animalId,
      fed_at: new Date().toISOString(),
      drank,
      notes: null,
      created_by: profile.id,
    });
    await refresh();
  }

  const BOX_HEIGHT = 44;
  const BOX_GAP = 4;
  const COLUMN_HEIGHT = 20 * BOX_HEIGHT + 19 * BOX_GAP + 12;

  function renderHutColumn(column: CalfHousingSlot[], columnLabel: string) {
    return (
      <div className="flex w-16 shrink-0 flex-col items-center">
        <p className="mb-1 text-center text-xs font-medium text-neutral-500">{columnLabel}</p>
        <div
          className="flex w-full flex-col-reverse gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1.5"
          style={{ height: COLUMN_HEIGHT }}
        >
          {column.map((slot, i) => (
            <CalfSlotBox
              key={slot.id}
              label={`${columnLabel} · ${i + 1}`}
              animal={animalById(slot.animal_id)}
              underTreatment={!!(slot.animal_id && treatmentFor(slot.animal_id)?.under_treatment)}
              feedings={slot.animal_id ? feedingsFor(slot.animal_id) : []}
              selected={selectedSlotId === slot.id}
              onClick={() => setSelectedSlotId(slot.id === selectedSlotId ? null : slot.id)}
              className="h-11 w-full shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  function renderEmptyColumn() {
    return (
      <div className="flex w-16 shrink-0 flex-col items-center">
        <p className="mb-1 text-center text-xs font-medium text-neutral-400">&nbsp;</p>
        <div
          className="flex w-full items-center justify-center rounded-lg border border-dashed border-neutral-300 p-1.5 text-center text-xs text-neutral-400"
          style={{ height: COLUMN_HEIGHT }}
        >
          şimdilik boş
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Buzağılık</h1>

      <CalfNotesPanel />

      {loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : (
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-neutral-800">Buzağılık Odası</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {renderHutColumn(column20, "20'lik")}
            {renderHutColumn(column16, "16'lık")}
            {renderEmptyColumn()}
            {renderEmptyColumn()}
            {renderEmptyColumn()}
            {renderEmptyColumn()}
          </div>
        </div>
      )}

      {selectedSlot && (
        <CalfSlotDetailPanel
          label={
            selectedSlot.group_index === 0
              ? `20'lik Sıra · ${selectedSlot.slot_index + 1}`
              : `16'lık Sıra · ${selectedSlot.slot_index + 1}`
          }
          animal={animalById(selectedSlot.animal_id)}
          feedings={selectedSlot.animal_id ? feedingsFor(selectedSlot.animal_id) : []}
          treatmentStatus={selectedSlot.animal_id ? treatmentFor(selectedSlot.animal_id) : undefined}
          treatments={selectedSlot.animal_id ? treatmentsFor(selectedSlot.animal_id) : []}
          availableCalves={availableCalves}
          onAssign={(animalId) => handleAssign(selectedSlot.id, animalId)}
          onUnassign={() => handleUnassign(selectedSlot.id)}
          onSetTreatment={(underTreatment, note) =>
            selectedSlot.animal_id
              ? handleSetTreatment(selectedSlot.animal_id, underTreatment, note)
              : Promise.resolve()
          }
          onAddTreatment={(input) =>
            selectedSlot.animal_id ? handleAddTreatment(selectedSlot.animal_id, input) : Promise.resolve()
          }
          onLogFeeding={(drank) =>
            selectedSlot.animal_id ? handleLogFeeding(selectedSlot.animal_id, drank) : Promise.resolve()
          }
          onClose={() => setSelectedSlotId(null)}
        />
      )}
    </div>
  );
}
