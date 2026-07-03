"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listAnimals, listBulls, listInseminations } from "@/lib/data";
import { Animal, Bull, Insemination } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/format";

export default function InseminationsPage() {
  const [inseminations, setInseminations] = useState<Insemination[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [bulls, setBulls] = useState<Bull[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listInseminations(), listAnimals(), listBulls()]).then(([i, a, b]) => {
      setInseminations(i);
      setAnimals(a);
      setBulls(b);
      setLoading(false);
    });
  }, []);

  const earTagFor = (animalId: string) => animals.find((a) => a.id === animalId)?.ear_tag ?? "?";
  const bullNameFor = (bullId: string | null) => (bullId ? bulls.find((b) => b.id === bullId)?.name ?? "?" : "-");

  const sortedInseminations = [...inseminations].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Tohumlamalar</h1>
        <Link href="/inseminations/new" className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-800">
          Yeni tohumlama
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : inseminations.length === 0 ? (
        <p className="text-sm text-neutral-400">Kayıt yok.</p>
      ) : (
        <div className="card-list">
          {sortedInseminations.map((i) => (
            <div key={i.id} className="border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{earTagFor(i.animal_id)}</span>
                  <span className="text-neutral-500">{bullNameFor(i.bull_id)}</span>
                  {i.semen_type && <Badge value={i.semen_type} />}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">{formatDate(i.insemination_date)}</span>
                  {i.pregnancy_result === "gebe" && <Badge value={i.pregnancy_result} />}
                </div>
              </div>
              {i.technician_name && <p className="mt-1 text-neutral-500">Tohumlayıcı: {i.technician_name}</p>}
              {i.pregnancy_check_date && (
                <p className="text-neutral-500">Gebelik kontrol tarihi: {formatDate(i.pregnancy_check_date)}</p>
              )}
              {i.notes && <p className="text-neutral-500">{i.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
