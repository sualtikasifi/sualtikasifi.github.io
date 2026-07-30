"use client";

import Link from "next/link";

// Buzagilar ana sayfasi: sadece iki buyuk giris butonu. Tum takip,
// besleme, tedavi ve rapor ozellikleri Buzagilik/Iglo sayfalarinda.
export default function CalvesPage() {
  return (
    <div className="flex min-h-[70vh] flex-col gap-4 sm:flex-row">
      <Link
        href="/calves/buzagilik"
        className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-green-600 bg-green-50 p-8 text-center shadow-sm transition-all hover:bg-green-100 hover:shadow-md"
      >
        <span className="text-5xl">🏠</span>
        <span className="text-2xl font-bold text-green-900">Buzağılık</span>
        <span className="text-sm text-green-700">120 kulübe · beslenme, tedavi ve raporlar</span>
      </Link>
      <Link
        href="/calves/iglo"
        className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-sky-600 bg-sky-50 p-8 text-center shadow-sm transition-all hover:bg-sky-100 hover:shadow-md"
      >
        <span className="text-5xl">⛺</span>
        <span className="text-2xl font-bold text-sky-900">İglo</span>
        <span className="text-sm text-sky-700">6 iglo · 60 kutucuk</span>
      </Link>
    </div>
  );
}
