import { CalfHousingSlot } from "./types";

export function slotLabel(slot: CalfHousingSlot): string {
  if (slot.structure === "iglo") return `İglo ${slot.group_index + 1} · ${slot.slot_index + 1}`;
  return `Sıra ${slot.group_index + 1} · ${slot.slot_index + 1}`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ageInDays(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Kupe numaralarini sayisal olarak kucukten buyuge siralar (ör. "9" < "10"),
// sayisal olmayan kupeleri sona, alfabetik olarak atar.
export function compareEarTags(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  const aIsNum = a.trim() !== "" && !Number.isNaN(na);
  const bIsNum = b.trim() !== "" && !Number.isNaN(nb);
  if (aIsNum && bIsNum) return na - nb;
  if (aIsNum) return -1;
  if (bIsNum) return 1;
  return a.localeCompare(b, "tr");
}
