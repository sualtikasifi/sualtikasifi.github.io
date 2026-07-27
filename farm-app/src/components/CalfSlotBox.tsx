"use client";

import { Animal, CalfFeeding } from "@/lib/types";

function last5Statuses(feedings: CalfFeeding[]): boolean[] {
  const sorted = [...feedings].sort((a, b) => a.fed_at.localeCompare(b.fed_at));
  const lastFive = sorted.slice(-5);
  const missing = 5 - lastFive.length;
  return Array(missing).fill(true).concat(lastFive.map((f) => f.drank));
}

interface Props {
  label: string;
  animal: Animal | undefined;
  underTreatment: boolean;
  feedings: CalfFeeding[];
  selected: boolean;
  onClick: () => void;
  className?: string;
}

export function CalfSlotBox({ label, animal, underTreatment, feedings, selected, onClick, className }: Props) {
  const colorClasses = !animal
    ? "border-dashed border-neutral-300 bg-white text-neutral-400"
    : underTreatment
      ? "border-red-400 bg-red-100 text-red-900"
      : "border-green-400 bg-green-100 text-green-900";

  return (
    <button
      type="button"
      onClick={onClick}
      title={animal ? `${label}: ${animal.ear_tag}` : `${label}: boş`}
      className={`flex shrink-0 flex-col items-center justify-center gap-1 rounded-md border p-1 text-center shadow-sm transition-colors ${colorClasses} ${
        selected ? "ring-2 ring-offset-1 ring-green-700" : ""
      } ${className ?? "h-14 w-14"}`}
    >
      <span className="w-full truncate text-[10px] font-bold leading-tight">
        {animal ? animal.ear_tag : "Boş"}
      </span>
      {animal && (
        <div className="flex gap-0.5">
          {last5Statuses(feedings).map((ok, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-green-600" : "bg-red-600"}`} />
          ))}
        </div>
      )}
    </button>
  );
}
