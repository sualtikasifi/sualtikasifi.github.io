"use client";

import { useState } from "react";
import { Animal } from "@/lib/types";

interface Props {
  animals: Animal[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function EarTagMultiPicker({ animals, selectedIds, onChange }: Props) {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);

  const q = search.trim().toLowerCase();
  const filtered = (q ? animals.filter((a) => a.ear_tag.toLowerCase().includes(q)) : animals).filter(
    (a) => !selectedIds.includes(a.id)
  );

  function add(id: string) {
    onChange([...selectedIds, id]);
    setSearch("");
  }

  function remove(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  return (
    <div>
      {selectedIds.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedIds.map((id) => {
            const a = animals.find((x) => x.id === id);
            return (
              <span
                key={id}
                className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
              >
                {a?.ear_tag ?? "?"}
                <button type="button" onClick={() => remove(id)} className="text-green-900">
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
      <input
        placeholder="Küpe Numarası ile ara ve ekle"
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
              onClick={() => add(a.id)}
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-50"
            >
              {a.ear_tag} {a.name && `(${a.name})`}
            </button>
          ))}
          {filtered.length === 0 && <p className="px-3 py-1.5 text-xs text-neutral-400">Sonuç yok</p>}
        </div>
      )}
    </div>
  );
}
