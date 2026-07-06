"use client";

import { Profile } from "@/lib/types";

interface Props {
  profiles: Profile[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function ProfileMultiPicker({ profiles, selectedIds, onChange }: Props) {
  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {profiles.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => toggle(p.id)}
          className={`chip ${selectedIds.includes(p.id) ? "chip-selected" : "chip-unselected"}`}
        >
          {p.full_name}
        </button>
      ))}
    </div>
  );
}
