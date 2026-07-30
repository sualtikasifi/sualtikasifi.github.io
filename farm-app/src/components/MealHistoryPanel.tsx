"use client";

import { useEffect, useState } from "react";
import { listCalfMeals } from "@/lib/data";
import { Animal, CalfMeal } from "@/lib/types";
import { formatMealHour } from "@/lib/meals";

interface Props {
  animals: Animal[];
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// "Tum ogunleri gor": tarih araligi secilir, o araliktaki icmeyen
// buzagilar ogun ogun listelenir.
export function MealHistoryPanel({ animals }: Props) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(isoDaysAgo(7));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [meals, setMeals] = useState<CalfMeal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void Promise.resolve().then(async () => {
      setLoading(true);
      const m = await listCalfMeals(from);
      if (cancelled) return;
      setMeals(m.filter((x) => x.meal_date <= to));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, from, to]);

  const earTagFor = (id: string) => animals.find((a) => a.id === id)?.ear_tag ?? "?";

  const missed = meals
    .filter((m) => !m.drank)
    .sort((a, b) => b.meal_date.localeCompare(a.meal_date) || b.meal_hour - a.meal_hour);

  // Ayni gun+saat altindaki icmeyenleri grupla.
  const groups = new Map<string, CalfMeal[]>();
  for (const m of missed) {
    const key = `${m.meal_date}|${m.meal_hour}`;
    const arr = groups.get(key) ?? [];
    arr.push(m);
    groups.set(key, arr);
  }

  return (
    <div className="card space-y-2">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800">Tüm Öğünleri Gör</h2>
        <span className="text-xs text-green-700 underline">{open ? "Gizle" : "Aç"}</span>
      </button>

      {open && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Başlangıç</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Bitiş</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
            </label>
          </div>

          {loading ? (
            <p className="text-xs text-neutral-400">Yükleniyor...</p>
          ) : groups.size === 0 ? (
            <p className="text-xs text-green-700">Bu aralıkta mamasını içmeyen buzağı yok. 🎉</p>
          ) : (
            <div className="max-h-72 space-y-1.5 overflow-y-auto">
              {[...groups.entries()].map(([key, items]) => {
                const [date, hour] = key.split("|");
                return (
                  <div key={key} className="rounded-md border border-neutral-200 px-2 py-1.5">
                    <p className="text-xs font-semibold text-neutral-800">
                      {formatDate(date)} · {formatMealHour(Number(hour) as CalfMeal["meal_hour"])}
                    </p>
                    <p className="text-xs text-red-700">
                      {items.map((m) => earTagFor(m.animal_id)).join(", ")}
                    </p>
                    {items.some((m) => !m.exam_result) && (
                      <p className="text-[11px] text-red-500">
                        Muayene bekleyen: {items.filter((m) => !m.exam_result).map((m) => earTagFor(m.animal_id)).join(", ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
