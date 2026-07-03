"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listAnimals, listTreatments } from "@/lib/data";
import { Animal, Treatment } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/format";

export default function TreatmentsPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listTreatments(), listAnimals()]).then(([t, a]) => {
      setTreatments(t);
      setAnimals(a);
      setLoading(false);
    });
  }, []);

  const earTagFor = (animalId: string) => animals.find((a) => a.id === animalId)?.ear_tag ?? "?";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Tedaviler</h1>
        <Link href="/treatments/new" className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800">
          Yeni tedavi
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Yukleniyor...</p>
      ) : treatments.length === 0 ? (
        <p className="text-sm text-neutral-400">Kayit yok.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {treatments.map((t) => (
            <Link
              key={t.id}
              href={`/animals/detail?id=${t.animal_id}`}
              className="block border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0 hover:bg-neutral-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{earTagFor(t.animal_id)}</span>
                  <Badge value={t.category} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">{formatDate(t.treatment_date)}</span>
                  <Badge value={t.outcome} />
                </div>
              </div>
              <p className="mt-1 text-neutral-600">{t.diagnosis}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
