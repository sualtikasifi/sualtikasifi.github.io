import { Animal, MastitisDose, MastitisTreatment } from "@/lib/types";

export interface MastitisReminder {
  treatment: MastitisTreatment;
  dose: MastitisDose;
  animal: Animal | undefined;
}

function daysSinceStart(startDate: string, now: Date): number {
  const start = new Date(`${startDate}T00:00:00`);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function getTodaysMastitisReminders(
  treatments: MastitisTreatment[],
  doses: MastitisDose[],
  animals: Animal[],
  now: Date = new Date()
): MastitisReminder[] {
  const reminders: MastitisReminder[] = [];
  for (const treatment of treatments) {
    if (treatment.ended_at) continue;
    const dayNumber = daysSinceStart(treatment.start_date, now) + 1;
    if (dayNumber < 1 || dayNumber > treatment.protocol_days) continue;
    const dose = doses.find((d) => d.mastitis_treatment_id === treatment.id && d.day_number === dayNumber);
    if (!dose || dose.done) continue;
    reminders.push({ treatment, dose, animal: animals.find((a) => a.id === treatment.animal_id) });
  }
  return reminders;
}

export const MASTITIS_REMINDER_HOUR = 10;
export const MASTITIS_WARNING_HOUR = 15;

export function isMastitisReminderActive(now: Date = new Date()): boolean {
  return now.getHours() >= MASTITIS_REMINDER_HOUR;
}

export function isMastitisWarningActive(now: Date = new Date()): boolean {
  return now.getHours() >= MASTITIS_WARNING_HOUR;
}
