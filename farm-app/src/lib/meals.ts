import { CalfMeal, CalfMealHour } from "./types";

// Gunun 4 sabit mama ogunu. Kronolojik sirada 03:00 gunun basinda gelir
// (gece yarisindan sonraki ogun o gunun tarihiyle kaydedilir).
export const MEAL_HOURS_CHRONOLOGICAL: CalfMealHour[] = [3, 9, 15, 21];

// Kullaniciya gosterim sirasi: 09 - 15 - 21 - 03 (gunun akisi).
export const MEAL_HOURS_DISPLAY: CalfMealHour[] = [9, 15, 21, 3];

export interface MealSlotRef {
  date: string; // YYYY-MM-DD
  hour: CalfMealHour;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatMealHour(hour: CalfMealHour): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

// Saati gelmis en son ogun (su anki ogun): 21:00'den sonra 21, 15'ten sonra
// 15... 03:00'ten once ise dunun 21:00 ogunu.
export function currentMealSlot(now: Date = new Date()): MealSlotRef {
  const h = now.getHours();
  if (h >= 21) return { date: isoDate(now), hour: 21 };
  if (h >= 15) return { date: isoDate(now), hour: 15 };
  if (h >= 9) return { date: isoDate(now), hour: 9 };
  if (h >= 3) return { date: isoDate(now), hour: 3 };
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return { date: isoDate(yesterday), hour: 21 };
}

function previousSlot(slot: MealSlotRef): MealSlotRef {
  const idx = MEAL_HOURS_CHRONOLOGICAL.indexOf(slot.hour);
  if (idx > 0) return { date: slot.date, hour: MEAL_HOURS_CHRONOLOGICAL[idx - 1] };
  const d = new Date(`${slot.date}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return { date: isoDate(d), hour: MEAL_HOURS_CHRONOLOGICAL[MEAL_HOURS_CHRONOLOGICAL.length - 1] };
}

// Su anki ogunden geriye dogru son n ogun; en yeni once (solda gosterilir).
export function lastNMealSlots(n: number, now: Date = new Date()): MealSlotRef[] {
  const slots: MealSlotRef[] = [];
  let slot = currentMealSlot(now);
  for (let i = 0; i < n; i++) {
    slots.push(slot);
    slot = previousSlot(slot);
  }
  return slots;
}

export function findMeal(meals: CalfMeal[], animalId: string, slot: MealSlotRef): CalfMeal | undefined {
  return meals.find((m) => m.animal_id === animalId && m.meal_date === slot.date && m.meal_hour === slot.hour);
}

// Bugunun 4 ogunu, gosterim sirasiyla (09-15-21-03). 03:00 bu sabahki ogundur.
export function todayMealSlots(now: Date = new Date()): MealSlotRef[] {
  const today = isoDate(now);
  return MEAL_HOURS_DISPLAY.map((hour) => ({ date: today, hour }));
}
