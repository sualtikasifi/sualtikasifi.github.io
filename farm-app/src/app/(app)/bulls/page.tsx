"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listAnimals, listBulls, listOpuSessions, listSemenInventory } from "@/lib/data";
import { Animal, Bull, OpuSession, SemenInventory, SemenType } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

type ViewMode = "toplam" | "tank";
type SemenFilter = SemenType | "embriyo";

const LOW_STOCK_THRESHOLD = 5;

export default function BullsPage() {
  const { profile } = useAuth();
  const [bulls, setBulls] = useState<Bull[]>([]);
  const [inventory, setInventory] = useState<SemenInventory[]>([]);
  const [opuSessions, setOpuSessions] = useState<OpuSession[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("toplam");
  const [breedFilter, setBreedFilter] = useState("hepsi");
  const [semenFilter, setSemenFilter] = useState<SemenFilter>("konvansiyonel");

  useEffect(() => {
    Promise.all([listBulls(), listSemenInventory(), listOpuSessions(), listAnimals()]).then(
      ([b, i, s, a]) => {
        setBulls(b);
        setInventory(i);
        setOpuSessions(s);
        setAnimals(a);
        setLoading(false);
      }
    );
  }, []);

  const breeds = useMemo(
    () => Array.from(new Set(bulls.map((b) => b.breed).filter((b): b is string => !!b))).sort(),
    [bulls]
  );

  const filteredBulls = useMemo(
    () => bulls.filter((b) => breedFilter === "hepsi" || b.breed === breedFilter),
    [bulls, breedFilter]
  );

  const earTagFor = (animalId: string) => animals.find((a) => a.id === animalId)?.ear_tag ?? "?";

  // Embryos produced from OPU sessions, attributed to the bull whose semen fertilized them.
  const embryoSessionsByBull = useMemo(() => {
    const map = new Map<string, OpuSession[]>();
    for (const s of opuSessions) {
      if (!s.fertilization_bull_id || s.embryo_count === null) continue;
      const arr = map.get(s.fertilization_bull_id) ?? [];
      arr.push(s);
      map.set(s.fertilization_bull_id, arr);
    }
    return map;
  }, [opuSessions]);

  const filteredInventory = useMemo(() => {
    if (semenFilter === "embriyo") return [];
    const bullIds = new Set(filteredBulls.map((b) => b.id));
    return inventory.filter((i) => bullIds.has(i.bull_id) && i.semen_type === semenFilter);
  }, [inventory, filteredBulls, semenFilter]);

  const totalStraws =
    semenFilter === "embriyo"
      ? filteredBulls.reduce(
          (sum, b) => sum + (embryoSessionsByBull.get(b.id) ?? []).reduce((s, o) => s + (o.embryo_count ?? 0), 0),
          0
        )
      : filteredInventory.reduce((sum, i) => sum + i.straw_count + i.tank_straw_count, 0);

  const groups = useMemo(() => {
    if (semenFilter === "embriyo") {
      const map = new Map<string, number>();
      for (const b of filteredBulls) {
        const total = (embryoSessionsByBull.get(b.id) ?? []).reduce((s, o) => s + (o.embryo_count ?? 0), 0);
        if (total === 0) continue;
        const breed = b.breed ?? "Irk belirtilmemiş";
        map.set(breed, (map.get(breed) ?? 0) + total);
      }
      return Array.from(map.entries())
        .map(([breed, total]) => ({ breed, total }))
        .sort((a, b) => a.breed.localeCompare(b.breed));
    }
    const map = new Map<string, number>();
    for (const inv of filteredInventory) {
      const bull = bulls.find((b) => b.id === inv.bull_id);
      const breed = bull?.breed ?? "Irk belirtilmemiş";
      map.set(breed, (map.get(breed) ?? 0) + inv.straw_count + inv.tank_straw_count);
    }
    return Array.from(map.entries())
      .map(([breed, total]) => ({ breed, total }))
      .sort((a, b) => a.breed.localeCompare(b.breed));
  }, [semenFilter, filteredInventory, filteredBulls, embryoSessionsByBull, bulls]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Boğalar ve Sperma Stoğu</h1>
        {hasPermission(profile, "can_manage_bulls_semen") && (
          <div className="flex gap-2">
            <Link href="/bulls/stock" className="rounded-md border border-green-700 px-3 py-1.5 text-sm font-medium text-green-700 shadow-sm transition-colors hover:bg-green-50">
              Stok Düzenle
            </Link>
            <Link href="/bulls/new" className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-800">
              Yeni boğa
            </Link>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-neutral-300 bg-white text-sm shadow-sm">
          <button
            onClick={() => setView("toplam")}
            className={`rounded-l-md px-3 py-1.5 transition-colors ${view === "toplam" ? "bg-green-700 text-white" : "hover:bg-neutral-50"}`}
          >
            Toplam Stok
          </button>
          <button
            onClick={() => setView("tank")}
            className={`rounded-r-md border-l border-neutral-300 px-3 py-1.5 transition-colors ${view === "tank" ? "bg-green-700 text-white" : "hover:bg-neutral-50"}`}
          >
            Tank Görünümü
          </button>
        </div>

        <select value={breedFilter} onChange={(e) => setBreedFilter(e.target.value)} className="input w-auto">
          <option value="hepsi">Tüm ırklar</option>
          {breeds.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          value={semenFilter}
          onChange={(e) => setSemenFilter(e.target.value as SemenFilter)}
          className="input w-auto"
        >
          <option value="konvansiyonel">Konvansiyonel</option>
          <option value="disi">Dişi</option>
          <option value="embriyo">Embriyo</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : bulls.length === 0 ? (
        <p className="text-sm text-neutral-400">Kayıt yok.</p>
      ) : view === "toplam" ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
            <p className="text-2xl font-semibold text-green-900">{totalStraws}</p>
            <p className="text-xs text-green-700">
              Toplam {semenFilter === "embriyo" ? "embriyo" : "straw"} (seçili filtreye göre)
            </p>
          </div>
          {groups.length === 0 ? (
            <p className="text-sm text-neutral-400">Bu filtreye uyan stok yok.</p>
          ) : (
            <div className="card-list">
              {groups.map((g) => (
                <div
                  key={g.breed}
                  className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900">{g.breed}</span>
                    <Badge value={semenFilter} />
                  </div>
                  <span className="text-lg font-semibold text-neutral-900">{g.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card-list">
          {filteredBulls.map((b) => {
            if (semenFilter === "embriyo") {
              const sessions = embryoSessionsByBull.get(b.id) ?? [];
              const total = sessions.reduce((s, o) => s + (o.embryo_count ?? 0), 0);
              if (total === 0) return null;
              return (
                <div key={b.id} className="border-b border-neutral-100 px-4 py-3 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-neutral-900">{b.name}</span>
                      {b.code && <span className="ml-2 text-sm text-neutral-500">{b.code}</span>}
                      <span className="ml-2 text-sm text-neutral-400">{b.breed ?? "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge value="embriyo" />
                      <span className="text-lg font-semibold text-neutral-900">{total}</span>
                    </div>
                  </div>
                  <div className="mt-1 space-y-1">
                    {sessions.map((s) => (
                      <Link
                        key={s.id}
                        href={`/opu/detail?id=${s.id}`}
                        className="flex items-center justify-between rounded-md px-2 py-1 text-sm transition-colors hover:bg-neutral-50"
                      >
                        <span className="text-neutral-600">
                          Donör: {earTagFor(s.donor_animal_id)} &middot; {formatDate(s.session_date)}
                          {s.notes && <span className="text-neutral-400"> &middot; {s.notes}</span>}
                        </span>
                        <span className="font-medium text-neutral-900">{s.embryo_count} embriyo</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }

            const rows = filteredInventory.filter((i) => i.bull_id === b.id);
            if (rows.length === 0) return null;
            return (
              <div key={b.id} className="border-b border-neutral-100 px-4 py-3 last:border-b-0">
                <Link href={`/bulls/stock?bullId=${b.id}`} className="hover:underline">
                  <span className="font-medium text-neutral-900">{b.name}</span>
                  {b.code && <span className="ml-2 text-sm text-neutral-500">{b.code}</span>}
                  <span className="ml-2 text-sm text-neutral-400">{b.breed ?? "-"}</span>
                </Link>
                <div className="mt-1 space-y-1">
                  {rows.map((r) => {
                    const total = r.straw_count + r.tank_straw_count;
                    const low = total <= LOW_STOCK_THRESHOLD;
                    return (
                      <Link
                        key={r.id}
                        href={`/bulls/stock?bullId=${b.id}`}
                        className="flex items-center justify-between rounded-md px-2 py-1 text-sm transition-colors hover:bg-neutral-50"
                      >
                        <div className="flex items-center gap-2">
                          <Badge value={r.semen_type} />
                          <span className="text-neutral-500">{r.tank_location ?? "konum girilmemiş"}</span>
                        </div>
                        <div className="text-right">
                          <span className={`font-semibold ${low ? "text-red-600" : "text-neutral-900"}`}>
                            {total}
                          </span>
                          <span className="ml-1 text-xs text-neutral-400">
                            straw (depo {r.straw_count} + tank {r.tank_straw_count}) {low && "· düşük"}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
