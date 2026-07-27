"use client";

import { useState } from "react";
import { Animal, CalfFeeding, CalfTreatmentStatus } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { EarTagPicker } from "@/components/EarTagPicker";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  label: string;
  animal: Animal | undefined;
  feedings: CalfFeeding[];
  treatmentStatus: CalfTreatmentStatus | undefined;
  availableCalves: Animal[];
  onAssign: (animalId: string) => Promise<void>;
  onUnassign: () => Promise<void>;
  onSetTreatment: (underTreatment: boolean, note: string | null) => Promise<void>;
  onLogFeeding: (drank: boolean) => Promise<void>;
  onClose: () => void;
}

export function CalfSlotDetailPanel({
  label,
  animal,
  feedings,
  treatmentStatus,
  availableCalves,
  onAssign,
  onUnassign,
  onSetTreatment,
  onLogFeeding,
  onClose,
}: Props) {
  const { profile } = useAuth();
  const canManage = hasPermission(profile, "can_manage_calves");
  const [pickerAnimalId, setPickerAnimalId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [treatmentNote, setTreatmentNote] = useState(treatmentStatus?.note ?? "");
  const [savingTreatment, setSavingTreatment] = useState(false);
  const [loggingId, setLoggingId] = useState(false);

  const sortedFeedings = [...feedings].sort((a, b) => b.fed_at.localeCompare(a.fed_at));

  async function handleAssign() {
    if (!pickerAnimalId) return;
    setAssigning(true);
    await onAssign(pickerAnimalId);
    setAssigning(false);
    setPickerAnimalId(null);
  }

  async function handleUnassign() {
    setUnassigning(true);
    await onUnassign();
    setUnassigning(false);
  }

  async function handleTreatmentToggle(underTreatment: boolean) {
    setSavingTreatment(true);
    await onSetTreatment(underTreatment, treatmentNote.trim() || null);
    setSavingTreatment(false);
  }

  async function handleLogFeeding(drank: boolean) {
    setLoggingId(true);
    await onLogFeeding(drank);
    setLoggingId(false);
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800">{label}</h2>
        <button type="button" onClick={onClose} className="text-xs text-neutral-500 underline hover:no-underline">
          Kapat
        </button>
      </div>

      {!animal ? (
        <div className="space-y-2">
          <p className="text-sm text-neutral-400">Bu kutucuk boş.</p>
          {canManage && (
            <div className="space-y-2">
              <EarTagPicker
                animals={availableCalves}
                selectedId={pickerAnimalId}
                onSelect={setPickerAnimalId}
                onClear={() => setPickerAnimalId(null)}
              />
              <button
                type="button"
                onClick={handleAssign}
                disabled={!pickerAnimalId || assigning}
                className="btn-primary"
              >
                {assigning ? "Ekleniyor..." : "Buzağı Ata"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-base font-semibold text-neutral-900">{animal.ear_tag}</span>
              {animal.name && <span className="ml-2 text-neutral-500">{animal.name}</span>}
            </div>
            {canManage && (
              <button
                type="button"
                onClick={handleUnassign}
                disabled={unassigning}
                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
              >
                {unassigning ? "Çıkarılıyor..." : "Kulübeden çıkar"}
              </button>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-neutral-600">Son öğünler</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleLogFeeding(true)}
                disabled={loggingId}
                className="rounded-md border border-green-600 px-3 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
              >
                İçti
              </button>
              <button
                type="button"
                onClick={() => handleLogFeeding(false)}
                disabled={loggingId}
                className="rounded-md border border-red-500 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                İçmedi
              </button>
            </div>
            {sortedFeedings.length > 0 && (
              <div className="mt-2 space-y-1">
                {sortedFeedings.slice(0, 5).map((f) => (
                  <p key={f.id} className="text-xs text-neutral-500">
                    <span className={f.drank ? "text-green-700" : "text-red-600"}>{f.drank ? "İçti" : "İçmedi"}</span>
                    {" · "}
                    {formatDateTime(f.fed_at)}
                  </p>
                ))}
              </div>
            )}
          </div>

          {canManage ? (
            <div className="space-y-2 border-t border-neutral-100 pt-3">
              <p className="text-xs font-medium text-neutral-600">Sağlık durumu</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleTreatmentToggle(false)}
                  disabled={savingTreatment}
                  className={`chip ${!treatmentStatus?.under_treatment ? "chip-selected" : "chip-unselected"}`}
                >
                  Sağlıklı
                </button>
                <button
                  type="button"
                  onClick={() => handleTreatmentToggle(true)}
                  disabled={savingTreatment}
                  className={`chip ${treatmentStatus?.under_treatment ? "border-red-500 bg-red-50 text-red-800" : "chip-unselected"}`}
                >
                  Tedavide
                </button>
              </div>
              <textarea
                value={treatmentNote}
                onChange={(e) => setTreatmentNote(e.target.value)}
                placeholder="Tedavi notu (opsiyonel)"
                className="input"
                rows={2}
              />
              <button
                type="button"
                onClick={() => handleTreatmentToggle(!!treatmentStatus?.under_treatment)}
                disabled={savingTreatment}
                className="btn-secondary"
              >
                {savingTreatment ? "Kaydediliyor..." : "Notu Kaydet"}
              </button>
            </div>
          ) : (
            treatmentStatus?.under_treatment && (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
                Tedavide{treatmentStatus.note && `: ${treatmentStatus.note}`}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
