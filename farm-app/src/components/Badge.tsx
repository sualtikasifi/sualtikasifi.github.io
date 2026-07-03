const COLORS: Record<string, string> = {
  bekliyor: "bg-amber-100 text-amber-800",
  yapildi: "bg-green-100 text-green-800",
  iptal: "bg-neutral-200 text-neutral-600",
  aktif: "bg-green-100 text-green-800",
  satildi: "bg-blue-100 text-blue-800",
  olu: "bg-neutral-300 text-neutral-700",
  devam_ediyor: "bg-amber-100 text-amber-800",
  iyilesti: "bg-green-100 text-green-800",
  olum: "bg-red-100 text-red-800",
};

const LABELS: Record<string, string> = {
  bekliyor: "Bekliyor",
  yapildi: "Yapildi",
  iptal: "Iptal",
  aktif: "Aktif",
  satildi: "Satildi",
  olu: "Olu",
  devam_ediyor: "Devam ediyor",
  iyilesti: "Iyilesti",
  olum: "Olum",
  genel: "Genel",
  mastitis: "Mastitis",
  buzagi_beslenme: "Buzagi Beslenme",
};

export function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[value] ?? "bg-neutral-100 text-neutral-700"}`}>
      {LABELS[value] ?? value}
    </span>
  );
}
