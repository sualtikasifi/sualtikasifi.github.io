"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listAnimals, listEmbryos, listOpuSessions } from "@/lib/data";
import { Animal, Embryo, OpuSession } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { OPU_STAGE_INFO, opuStageFor } from "@/lib/opuStage";

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
  const totalFollicles = (s: OpuSession) =>
    s.follicle_count_right !== null || s.follicle_count_left !== null
      ? (s.follicle_count_right ?? 0) + (s.follicle_count_left ?? 0)
      : null;

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
          {sessions.map((s) => {
            const stage = opuStageFor(s);
            return (
              <Link
                key={s.id}
                href={`/opu/detail?id=${s.id}`}
                className="block border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0 hover:bg-neutral-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-neutral-900">{earTagFor(s.donor_animal_id)}</span>
                    <span className="ml-2 text-neutral-500">(donor)</span>
                    {s.technician_name && <p className="text-xs text-neutral-400">{s.technician_name}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-neutral-600">
                      {totalFollicles(s) ?? "-"} folikul &middot; {s.oocyte_count ?? "-"} oosit &middot;{" "}
                      {s.cleaved_count ?? "-"} bolunen &middot; {s.embryo_count ?? embryoCountFor(s.id)} embriyo
                    </p>
                    <p className="text-xs text-neutral-400">{formatDate(s.session_date)}</p>
                  </div>
                </div>
                <div className="mt-2">
                  {stage === "done" ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Tum asamalar tamamlandi
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Siradaki soru: {OPU_STAGE_INFO[stage].question}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
