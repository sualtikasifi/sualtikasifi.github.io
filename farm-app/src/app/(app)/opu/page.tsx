"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listAnimals, listEmbryos, listOpuSessions } from "@/lib/data";
import { Animal, Embryo, OpuSession } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function OpuSessionsPage() {
  const [sessions, setSessions] = useState<OpuSession[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [embryos, setEmbryos] = useState<Embryo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listOpuSessions(), listAnimals(), listEmbryos()]).then(([s, a, e]) => {
      setSessions(s);
      setAnimals(a);
      setEmbryos(e);
      setLoading(false);
    });
  }, []);

  const earTagFor = (animalId: string) => animals.find((a) => a.id === animalId)?.ear_tag ?? "?";
  const embryoCountFor = (sessionId: string) => embryos.filter((e) => e.opu_session_id === sessionId).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">OPU Seanslari</h1>
        <Link href="/opu/new" className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800">
          Yeni OPU seansi
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Yukleniyor...</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-neutral-400">Kayit yok.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/opu/detail?id=${s.id}`}
              className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0 hover:bg-neutral-50"
            >
              <div>
                <span className="font-medium text-neutral-900">{earTagFor(s.donor_animal_id)}</span>
                <span className="ml-2 text-neutral-500">(donor)</span>
                {s.technician_name && <p className="text-xs text-neutral-400">{s.technician_name}</p>}
              </div>
              <div className="text-right">
                <p className="text-neutral-600">{s.oocyte_count ?? "-"} oosit &middot; {embryoCountFor(s.id)} embriyo</p>
                <p className="text-xs text-neutral-400">{formatDate(s.session_date)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
