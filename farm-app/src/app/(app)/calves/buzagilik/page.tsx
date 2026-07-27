"use client";

import { useEffect, useState } from "react";
import {
  assignCalfToSlot,
  createCalfFeeding,
  listAnimals,
  listCalfFeedings,
  listCalfHousingSlots,
  listCalfTreatmentStatuses,
  setCalfTreatmentStatus,
} from "@/lib/data";
import { Animal, CalfFeeding, CalfHousingSlot, CalfTreatmentStatus } from "@/lib/types";
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
  const [loading, setLoading] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  function loadData() {
    return Promise.all([
      listCalfHousingSlots("buzagilik"),
      listCalfHousingSlots("iglo"),
      listAnimals(),
      listCalfFeedings(),
      listCalfTreatmentStatuses(),
    ]);
  }

  useEffect(() => {
    loadData().then(([s, other, a, f, t]) => {
      setSlots(s);
      setOtherStructureSlots(other);
      setAnimals(a);
      setFeedings(f);
      setTreatmentStatuses(t);
      setLoading(false);
    });
  }, []);

  async function refresh() {
    const [s, other, a, f, t] = await loadData();
    setSlots(s);
    setOtherStructureSlots(other);
    setAnimals(a);
    setFeedings(f);
    setTreatmentStatuses(t);
  }

  const animalById = (id: string | null) => (id ? animals.find((a) => a.id === id) : undefined);
  const treatmentFor = (animalId: string) => treatmentStatuses.find((t) => t.animal_id === animalId);
  const feedingsFor = (animalId: string) => feedings.filter((f) => f.animal_id === animalId);

  const assignedElsewhere = new Set(
    [...slots, ...otherStructureSlots].map((s) => s.animal_id).filter((id): id is string => !!id)
  );
  const availableCalves = animals.filter((a) => a.weaned_at === null && !assignedElsewhere.has(a.id));

  const row20 = slots.filter((s) => s.group_index === 0);
  const row16 = slots.filter((s) => s.group_index === 1);
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

  function renderRow(row: CalfHousingSlot[], rowLabel: string) {
    return (
      <div>
        <p className="mb-1 text-xs font-medium text-neutral-500">{rowLabel}</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {row.map((slot, i) => (
            <CalfSlotBox
              key={slot.id}
              label={`${rowLabel} · ${i + 1}`}
              animal={animalById(slot.animal_id)}
              underTreatment={!!(slot.animal_id && treatmentFor(slot.animal_id)?.under_treatment)}
              feedings={slot.animal_id ? feedingsFor(slot.animal_id) : []}
              selected={selectedSlotId === slot.id}
              onClick={() => setSelectedSlotId(slot.id === selectedSlotId ? null : slot.id)}
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

      {loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : (
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-neutral-800">Buzağılık Odası</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 md:col-span-1">
              <p className="text-xs font-medium text-neutral-500">Kulübe Alanı (1/3)</p>
              {renderRow(row20, "20'lik Sıra")}
              {renderRow(row16, "16'lık Sıra")}
            </div>
            <div className="flex items-center justify-center rounded-lg border border-dashed border-neutral-300 p-6 text-xs text-neutral-400 md:col-span-2">
              Boş Alan
            </div>
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
          availableCalves={availableCalves}
          onAssign={(animalId) => handleAssign(selectedSlot.id, animalId)}
          onUnassign={() => handleUnassign(selectedSlot.id)}
          onSetTreatment={(underTreatment, note) =>
            selectedSlot.animal_id
              ? handleSetTreatment(selectedSlot.animal_id, underTreatment, note)
              : Promise.resolve()
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
