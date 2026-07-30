"use client";

import { Animal, CalfMeal } from "@/lib/types";
import { findMeal, lastNMealSlots } from "@/lib/meals";

interface Props {
  label: string;
  animal: Animal | undefined;
  underTreatment: boolean;
  meals: CalfMeal[];
  pectolitPending: boolean;
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
// sonen sari uyari noktasi bulunur.
export function CalfSlotBox({
  label,
  animal,
  underTreatment,
  meals,
  pectolitPending,
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
      ? "border-red-400 bg-red-100 text-red-900"
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
      className={`flex shrink-0 flex-col items-center justify-center gap-1 rounded-md border p-1 text-center shadow-sm transition-colors ${colorClasses} ${
        selected ? "ring-2 ring-offset-1 ring-green-700" : ""
      } ${className ?? "h-14 w-14"}`}
    >
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
