"use client";

import { CalfMeal } from "@/lib/types";
import { MealSlotRef, formatMealHour, todayMealSlots } from "@/lib/meals";

interface Props {
  meals: CalfMeal[];
  slotAnimalIds: string[]; // bu odadaki dolu kulubelerdeki hayvanlar
  activeMeal: MealSlotRef | null;
  onSelectMeal: (slot: MealSlotRef) => void;
  onFinish: () => void;
  canManage: boolean;
  // Giris modunda kulubelere tiklanarak tek ya da coklu secim yapilir;
  // Icti/Icmedi butonlari secilenlerin hepsini birden isler.
  selectionCount: number;
  marking: boolean;
  onMarkSelected: (drank: boolean) => void;
}

function formatToday(): string {
  return new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", weekday: "long" });
}

// Sayfanin ustundeki gunluk beslenme alani: 4 es parca (09-15-21-03).
// Bir ogune tiklaninca giris moduna gecilir; kulubelere tiklanarak
// icti/icmedi isaretlenir, Kaydet ile normal goruntuye donulur.
export function FeedingSessionBar({
  meals,
  slotAnimalIds,
  activeMeal,
  onSelectMeal,
  onFinish,
  canManage,
  selectionCount,
  marking,
  onMarkSelected,
}: Props) {
  const slots = todayMealSlots();
  const idSet = new Set(slotAnimalIds);

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800">Bugünün Beslenmesi</h2>
        <span className="text-xs text-neutral-500">{formatToday()}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {slots.map((slot) => {
          const entries = meals.filter(
            (m) => m.meal_date === slot.date && m.meal_hour === slot.hour && idSet.has(m.animal_id)
          );
          const missed = entries.filter((m) => !m.drank).length;
          const isActive = activeMeal?.date === slot.date && activeMeal?.hour === slot.hour;
          return (
            <button
              key={slot.hour}
              type="button"
              disabled={!canManage}
              onClick={() => (isActive ? onFinish() : onSelectMeal(slot))}
              className={`rounded-lg border p-2 text-center transition-colors disabled:opacity-60 ${
                isActive
                  ? "border-green-700 bg-green-700 text-white shadow"
                  : "border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-green-400"
              }`}
            >
              <span className="block text-sm font-bold">{formatMealHour(slot.hour)}</span>
              <span className={`block text-[11px] ${isActive ? "text-green-100" : "text-neutral-500"}`}>
                {entries.length === 0 ? "kayıt yok" : missed > 0 ? `${missed} içmedi` : "hepsi içti"}
              </span>
            </button>
          );
        })}
      </div>
      {activeMeal && (
        <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-900">
            <span className="font-semibold">{formatMealHour(activeMeal.hour)} öğünü işaretleniyor.</span> Kulübelere
            tıklayarak tek veya birden çok buzağı seçin, sonra İçti/İçmedi&apos;ye basın. Bilgi girilmeyenler
            &quot;içti&quot; sayılır.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-amber-800">Seçili: {selectionCount}</span>
            <button
              type="button"
              disabled={selectionCount === 0 || marking}
              onClick={() => onMarkSelected(true)}
              className="rounded-md border border-green-600 bg-green-50 px-3 py-1 text-xs font-semibold text-green-800 transition-colors hover:bg-green-100 disabled:opacity-40"
            >
              {marking ? "..." : "İçti"}
            </button>
            <button
              type="button"
              disabled={selectionCount === 0 || marking}
              onClick={() => onMarkSelected(false)}
              className="rounded-md border border-red-500 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-40"
            >
              {marking ? "..." : "İçmedi"}
            </button>
            <div className="flex-1" />
            <button type="button" onClick={onFinish} className="btn-primary shrink-0">
              Kaydet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
