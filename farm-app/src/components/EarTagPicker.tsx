"use client";

import { useState } from "react";
import { Animal } from "@/lib/types";

interface Props {
  animals: Animal[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
}

export function EarTagPicker({ animals, selectedId, onSelect, onClear }: Props) {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);

  if (selectedId) {
    return (
      <div className="flex items-center justify-between rounded-md border border-neutral-300 px-3 py-2 text-sm">
        <span>{animals.find((a) => a.id === selectedId)?.ear_tag}</span>
        <button type="button" onClick={onClear} className="text-xs text-green-700">
          Değiştir
        </button>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const filtered = q ? animals.filter((a) => a.ear_tag.toLowerCase().includes(q)) : animals;

  return (
    <div>
      <input
        placeholder="Küpe Numarası"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        className="input"
        autoComplete="off"
      />
      {focused && (
        <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-neutral-200">
          {filtered.slice(0, 20).map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-50"
            >
              {a.ear_tag} {a.name && `(${a.name})`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
