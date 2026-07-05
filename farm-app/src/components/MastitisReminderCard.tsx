import Link from "next/link";
import { MastitisReminder } from "@/lib/mastitisReminder";

const UDDER_LABELS: Record<string, string> = {
  on_sol: "Ön Sol",
  on_sag: "Ön Sağ",
  arka_sol: "Arka Sol",
  arka_sag: "Arka Sağ",
};

export function MastitisReminderCard({
  reminders,
  warning,
}: {
  reminders: MastitisReminder[];
  warning: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        warning ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"
      }`}
    >
      <p className={`text-sm font-semibold ${warning ? "text-red-800" : "text-amber-800"}`}>
        {warning
          ? `Saat 15:00'ı geçti, henüz yapılmamış mastitis tedavisi var! (${reminders.length})`
          : `Bugün mastitis tedavisi olan hayvanlar (${reminders.length})`}
      </p>
      <div className="mt-2 space-y-1">
        {reminders.map((r) => (
          <Link
            key={r.dose.id}
            href="/treatments"
            className={`block rounded-md px-2 py-1 text-sm hover:bg-white/60 ${
              warning ? "text-red-900" : "text-amber-900"
            }`}
          >
            {r.animal?.ear_tag ?? "?"} &middot;{" "}
            {r.treatment.udder_quarters.map((q) => UDDER_LABELS[q] ?? q).join(", ")} &middot; Gün{" "}
            {r.dose.day_number}/{r.treatment.protocol_days}
          </Link>
        ))}
      </div>
    </div>
  );
}
