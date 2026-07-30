"use client";

import { Animal, CalfMeal } from "@/lib/types";
import { findMeal, lastNMealSlots } from "@/lib/meals";

interface Props {
  label: string;
  animal: Animal | undefined;
  underTreatment: boolean;
  treatmentLabel?: string | null;
  meals: CalfMeal[];
  pectolitPending: boolean;
  alertNote?: boolean;
  alertExam?: boolean;
  selected: boolean;
  onClick: () => void;
  draggable?: boolean;
  onDragStartSlot?: () => void;
  onDropOnSlot?: () => void;
  className?: string;
}

// Kutunun altindaki 5 nokta: soldan saga en yeni ogunden eskiye. Kayit
// girilmeyen ogun "icti" (yesil) kabul edilir; icmedi kirmizi, pectolit
// verilen ogun sari gorunur. Pectolit bekleyen buzagida en solda yanip
// sonen sari uyari; sag ust kosede muayene bekleyen icin kirmizi, aktif
// notu olan icin sari unlem rozeti yanip soner. Tedavideki buzaginin
// cercevesi kirmizi olur ve numaranin ustunde protokol adi yazar.
export function CalfSlotBox({
  label,
  animal,
  underTreatment,
  treatmentLabel,
  meals,
  pectolitPending,
  alertNote,
  alertExam,
  selected,
  onClick,
  draggable,
  onDragStartSlot,
  onDropOnSlot,
  className,
}: Props) {
  const colorClasses = !animal
    ? "border-dashed border-neutral-300 bg-white text-neutral-400"
    : underTreatment
      ? "border-2 border-red-500 bg-red-100 text-red-900"
      : "border-green-400 bg-green-100 text-green-900";

  const dots = animal
    ? lastNMealSlots(5).map((slot) => {
        const meal = findMeal(meals, animal.id, slot);
        if (!meal) return "bg-green-600";
        if (!meal.drank) return "bg-red-600";
        if (meal.pectolit) return "bg-yellow-400";
        return "bg-green-600";
      })
    : [];

  return (
    <button
      type="button"
      onClick={onClick}
      title={animal ? `${label}: ${animal.ear_tag}` : `${label}: boş`}
      draggable={!!animal && draggable}
      onDragStart={(e) => {
        if (!animal || !draggable) return;
        e.dataTransfer.effectAllowed = "move";
        onDragStartSlot?.();
      }}
      onDragOver={(e) => {
        if (!onDropOnSlot) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        if (!onDropOnSlot) return;
        e.preventDefault();
        onDropOnSlot();
      }}
      className={`relative flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border p-1 text-center shadow-sm transition-colors ${colorClasses} ${
        selected ? "ring-2 ring-offset-1 ring-green-700" : ""
      } ${className ?? "h-14 w-14"}`}
    >
      {animal && (alertExam || alertNote) && (
        <span className="absolute -right-1 -top-1 flex gap-0.5">
          {alertExam && (
            <span className="flex h-3.5 w-3.5 animate-pulse items-center justify-center rounded-full bg-red-600 text-[9px] font-bold leading-none text-white shadow">
              !
            </span>
          )}
          {alertNote && (
            <span className="flex h-3.5 w-3.5 animate-pulse items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold leading-none text-white shadow">
              !
            </span>
          )}
        </span>
      )}
      {animal && underTreatment && treatmentLabel && (
        <span className="w-full truncate text-[7px] font-medium leading-none text-red-700">{treatmentLabel}</span>
      )}
      <span className="w-full truncate text-[10px] font-bold leading-tight">
        {animal ? animal.ear_tag : "Boş"}
      </span>
      {animal && (
        <div className="flex items-center gap-0.5">
          {pectolitPending && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400 ring-1 ring-yellow-500" />}
          {dots.map((cls, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full ${cls}`} />
          ))}
        </div>
      )}
    </button>
  );
}
