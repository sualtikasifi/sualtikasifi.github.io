const COLORS: Record<string, string> = {
  bekliyor: "bg-amber-100 text-amber-800",
  yapildi: "bg-green-100 text-green-800",
  iptal: "bg-neutral-200 text-neutral-600",
  aktif: "bg-green-100 text-green-800",
  satildi: "bg-blue-100 text-blue-800",
  olu: "bg-neutral-300 text-neutral-700",
  bekleniyor: "bg-amber-100 text-amber-800",
  gebe: "bg-green-100 text-green-800",
  gebe_degil: "bg-neutral-200 text-neutral-600",
  gelisiyor: "bg-amber-100 text-amber-800",
  dondu: "bg-blue-100 text-blue-800",
  transfer_edildi: "bg-green-100 text-green-800",
  atildi: "bg-neutral-200 text-neutral-600",
  konvansiyonel: "bg-neutral-200 text-neutral-700",
  disi: "bg-pink-100 text-pink-800",
  on_sol: "bg-purple-100 text-purple-800",
  on_sag: "bg-purple-100 text-purple-800",
  arka_sol: "bg-indigo-100 text-indigo-800",
  arka_sag: "bg-indigo-100 text-indigo-800",
};

const LABELS: Record<string, string> = {
  bekliyor: "Bekliyor",
  yapildi: "Yapıldı",
  iptal: "İptal",
  aktif: "Aktif",
  satildi: "Satıldı",
  olu: "Ölü",
  bekleniyor: "Bekleniyor",
  gebe: "Gebe",
  gebe_degil: "Gebe değil",
  gelisiyor: "Gelişiyor",
  dondu: "Donduruldu",
  transfer_edildi: "Transfer edildi",
  atildi: "Atıldı",
  morula: "Morula",
  erken_blastosist: "Erken Blastosist",
  blastosist: "Blastosist",
  genisleyen_blastosist: "Genişleyen Blastosist",
  yumurtadan_cikan_blastosist: "Yumurtadan Çıkan Blastosist",
  konvansiyonel: "Konvansiyonel",
  disi: "Dişi",
  on_sol: "Ön Sol",
  on_sag: "Ön Sağ",
  arka_sol: "Arka Sol",
  arka_sag: "Arka Sağ",
};

export function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[value] ?? "bg-neutral-100 text-neutral-700"}`}>
      {LABELS[value] ?? value}
    </span>
  );
}
