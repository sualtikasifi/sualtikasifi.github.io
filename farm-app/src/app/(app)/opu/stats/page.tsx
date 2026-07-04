"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listAnimals, listEmbryos, listOpuSessions } from "@/lib/data";
import { Animal, Embryo, OpuSession } from "@/lib/types";

interface Totals {
  sessionCount: number;
  follicles: number;
  oocytes: number;
  cleaved: number;
  embryos: number;
}

function emptyTotals(): Totals {
  return { sessionCount: 0, follicles: 0, oocytes: 0, cleaved: 0, embryos: 0 };
}

function pct(numerator: number, denominator: number): string {
  if (denominator <= 0) return "-";
  return `%${Math.round((numerator / denominator) * 100)}`;
}

export default function OpuStatsPage() {
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

  const embryoCountBySession = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of embryos) {
      map.set(e.opu_session_id, (map.get(e.opu_session_id) ?? 0) + 1);
    }
    return map;
  }, [embryos]);

  const technicianStats = useMemo(() => {
    const map = new Map<string, Totals>();
    for (const s of sessions) {
      const key = s.technician_name?.trim() || "Belirtilmemiş";
      const t = map.get(key) ?? emptyTotals();
      t.sessionCount += 1;
      t.follicles += (s.follicle_count_right ?? 0) + (s.follicle_count_left ?? 0);
      t.oocytes += s.oocyte_count ?? 0;
      t.cleaved += s.cleaved_count ?? 0;
      t.embryos += s.embryo_count ?? embryoCountBySession.get(s.id) ?? 0;
      map.set(key, t);
    }
    return Array.from(map.entries())
      .map(([name, t]) => ({ name, ...t }))
      .sort((a, b) => b.sessionCount - a.sessionCount);
  }, [sessions, embryoCountBySession]);

  const donorStats = useMemo(() => {
    const map = new Map<string, Totals>();
    for (const s of sessions) {
      const t = map.get(s.donor_animal_id) ?? emptyTotals();
      t.sessionCount += 1;
      t.follicles += (s.follicle_count_right ?? 0) + (s.follicle_count_left ?? 0);
      t.oocytes += s.oocyte_count ?? 0;
      t.cleaved += s.cleaved_count ?? 0;
      t.embryos += s.embryo_count ?? embryoCountBySession.get(s.id) ?? 0;
      map.set(s.donor_animal_id, t);
    }
    return Array.from(map.entries())
      .map(([animalId, t]) => ({ animalId, ...t }))
      .sort((a, b) => b.embryos - a.embryos);
  }, [sessions, embryoCountBySession]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">OPU İstatistikleri</h1>
        <Link href="/opu" className="text-xs font-medium text-green-700 hover:underline">
          OPU listesine dön
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-neutral-400">Kayıt yok.</p>
      ) : (
        <>
          <div className="card">
            <h2 className="mb-2 text-sm font-semibold text-neutral-800">
              Veteriner Hekim/Tekniker Başarı Oranları
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                    <th className="py-1.5 pr-2">Veteriner Hekim/Tekniker</th>
                    <th className="py-1.5 pr-2">Seans</th>
                    <th className="py-1.5 pr-2">Folikül</th>
                    <th className="py-1.5 pr-2">Oosit</th>
                    <th className="py-1.5 pr-2">Bölünen</th>
                    <th className="py-1.5 pr-2">Embriyo</th>
                    <th className="py-1.5 pr-2">Oosit/Folikül</th>
                    <th className="py-1.5 pr-2">Embriyo/Oosit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {technicianStats.map((t) => (
                    <tr key={t.name}>
                      <td className="py-1.5 pr-2 font-medium text-neutral-900">{t.name}</td>
                      <td className="py-1.5 pr-2">{t.sessionCount}</td>
                      <td className="py-1.5 pr-2">{t.follicles}</td>
                      <td className="py-1.5 pr-2">{t.oocytes}</td>
                      <td className="py-1.5 pr-2">{t.cleaved}</td>
                      <td className="py-1.5 pr-2">{t.embryos}</td>
                      <td className="py-1.5 pr-2">{pct(t.oocytes, t.follicles)}</td>
                      <td className="py-1.5 pr-2">{pct(t.embryos, t.oocytes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-2 text-sm font-semibold text-neutral-800">Donör Verimleri</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                    <th className="py-1.5 pr-2">Donör</th>
                    <th className="py-1.5 pr-2">Seans</th>
                    <th className="py-1.5 pr-2">Folikül</th>
                    <th className="py-1.5 pr-2">Oosit</th>
                    <th className="py-1.5 pr-2">Bölünen</th>
                    <th className="py-1.5 pr-2">Embriyo</th>
                    <th className="py-1.5 pr-2">Ort. Embriyo/Seans</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {donorStats.map((d) => (
                    <tr key={d.animalId}>
                      <td className="py-1.5 pr-2 font-medium text-neutral-900">{earTagFor(d.animalId)}</td>
                      <td className="py-1.5 pr-2">{d.sessionCount}</td>
                      <td className="py-1.5 pr-2">{d.follicles}</td>
                      <td className="py-1.5 pr-2">{d.oocytes}</td>
                      <td className="py-1.5 pr-2">{d.cleaved}</td>
                      <td className="py-1.5 pr-2">{d.embryos}</td>
                      <td className="py-1.5 pr-2">{(d.embryos / d.sessionCount).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
