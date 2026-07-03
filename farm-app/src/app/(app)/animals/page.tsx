"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listAnimals } from "@/lib/data";
import { Animal } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/format";

export default function AnimalsPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listAnimals().then((data) => {
      setAnimals(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return animals;
    return animals.filter(
      (a) => a.ear_tag.toLowerCase().includes(q) || (a.name ?? "").toLowerCase().includes(q)
    );
  }, [animals, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Hayvanlar</h1>
        <Link href="/animals/new" className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800">
          Yeni hayvan
        </Link>
      </div>

      <input
        type="text"
        placeholder="Kupe no veya isim ile ara..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
      />

      {loading ? (
        <p className="text-sm text-neutral-500">Yukleniyor...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-neutral-400">Kayit bulunamadi.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {filtered.map((a) => (
            <Link
              key={a.id}
              href={`/animals/detail?id=${a.id}`}
              className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0 hover:bg-neutral-50"
            >
              <div>
                <span className="font-medium text-neutral-900">{a.ear_tag}</span>
                {a.name && <span className="ml-2 text-neutral-500">{a.name}</span>}
              </div>
              <div className="flex items-center gap-3 text-neutral-400">
                <span>{a.breed ?? "-"}</span>
                <span>{formatDate(a.birth_date)}</span>
                <Badge value={a.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
