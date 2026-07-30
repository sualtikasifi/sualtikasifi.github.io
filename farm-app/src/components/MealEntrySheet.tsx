"use client";

import { useState } from "react";
import { Animal, CalfMeal } from "@/lib/types";
import { MealSlotRef, formatMealHour } from "@/lib/meals";

interface Props {
  animal: Animal;
  slot: MealSlotRef;
  existing: CalfMeal | undefined;
  pectolitPending: boolean;
  onMark: (drank: boolean) => Promise<void>;
  onClose: () => void;
}

// Giris modunda bir kulubeye tiklaninca acilan alt pencere: o ogun icin
// icti/icmedi secimi yapilir ve aninda kaydedilir.
export function MealEntrySheet({ animal, slot, existing, pectolitPending, onMark, onClose }: Props) {
  const [saving, setSaving] = useState(false);

  async function mark(drank: boolean) {
    setSaving(true);
    await onMark(drank);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white p-4 shadow-2xl">
      <div className="mx-auto flex max-w-md flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-900">
            {animal.ear_tag} · {formatMealHour(slot.hour)} öğünü
          </p>
          <button type="button" onClick={onClose} className="text-xs text-neutral-500 underline hover:no-underline">
            Vazgeç
          </button>
        </div>
        {pectolitPending && (
          <p className="rounded-md border border-yellow-300 bg-yellow-50 px-2 py-1 text-xs text-yellow-800">
            Bu öğünde <span className="font-semibold">Pectolit</span> içmesi gerekiyor.
          </p>
        )}
        {existing && (
          <p className="text-xs text-neutral-500">
            Mevcut kayıt: {existing.drank ? "İçti" : "İçmedi"}
            {existing.pectolit ? " (Pectolit)" : ""} — tekrar seçerseniz güncellenir.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => mark(true)}
            className="rounded-lg border-2 border-green-600 bg-green-50 py-3 text-sm font-semibold text-green-800 transition-colors hover:bg-green-100 disabled:opacity-50"
          >
            Mama İçti
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => mark(false)}
            className="rounded-lg border-2 border-red-500 bg-red-50 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            Mama İçmedi
          </button>
        </div>
      </div>
    </div>
  );
}
