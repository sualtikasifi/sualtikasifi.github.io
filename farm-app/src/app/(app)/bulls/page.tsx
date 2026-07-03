"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listBulls, listSemenInventory } from "@/lib/data";
import { Bull, SemenInventory, SemenType } from "@/lib/types";
import { Badge } from "@/components/Badge";

type ViewMode = "toplam" | "tank";
type SemenFilter = "hepsi" | SemenType;

const LOW_STOCK_THRESHOLD = 5;

export default function BullsPage() {
  const [bulls, setBulls] = useState<Bull[]>([]);
  const [inventory, setInventory] = useState<SemenInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("toplam");
  const [breedFilter, setBreedFilter] = useState("hepsi");
  const [semenFilter, setSemenFilter] = useState<SemenFilter>("hepsi");

  useEffect(() => {
    Promise.all([listBulls(), listSemenInventory()]).then(([b, i]) => {
      setBulls(b);
      setInventory(i);
      setLoading(false);
    });
  }, []);

  const breeds = useMemo(
    () => Array.from(new Set(bulls.map((b) => b.breed).filter((b): b is string => !!b))).sort(),
    [bulls]
  );

  const filteredBulls = useMemo(
    () => bulls.filter((b) => breedFilter === "hepsi" || b.breed === breedFilter),
    [bulls, breedFilter]
  );

  const filteredInventory = useMemo(() => {
    const bullIds = new Set(filteredBulls.map((b) => b.id));
    return inventory.filter(
      (i) => bullIds.has(i.bull_id) && (semenFilter === "hepsi" || i.semen_type === semenFilter)
    );
  }, [inventory, filteredBulls, semenFilter]);

  const totalStraws = filteredInventory.reduce((sum, i) => sum + i.straw_count, 0);

  const groups = useMemo(() => {
    const map = new Map<string, { breed: string; semen_type: SemenType; total: number }>();
    for (const inv of filteredInventory) {
      const bull = bulls.find((b) => b.id === inv.bull_id);
      const breed = bull?.breed ?? "Irk belirtilmemis";
      const key = `${breed}|${inv.semen_type}`;
      const existing = map.get(key);
      if (existing) {
        existing.total += inv.straw_count;
      } else {
        map.set(key, { breed, semen_type: inv.semen_type, total: inv.straw_count });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => a.breed.localeCompare(b.breed) || a.semen_type.localeCompare(b.semen_type)
    );
  }, [filteredInventory, bulls]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Bogalar ve Sperma Stogu</h1>
        <Link href="/bulls/new" className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800">
          Yeni boga
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-neutral-300 text-sm">
          <button
            onClick={() => setView("toplam")}
            className={`rounded-l-md px-3 py-1.5 ${view === "toplam" ? "bg-green-700 text-white" : "hover:bg-neutral-50"}`}
          >
            Toplam Stok
          </button>
          <button
            onClick={() => setView("tank")}
            className={`rounded-r-md border-l border-neutral-300 px-3 py-1.5 ${view === "tank" ? "bg-green-700 text-white" : "hover:bg-neutral-50"}`}
          >
            Tank Gorunumu
          </button>
        </div>

        <select value={breedFilter} onChange={(e) => setBreedFilter(e.target.value)} className="input w-auto">
          <option value="hepsi">Tum irklar</option>
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
          <option value="hepsi">Konvansiyonel + Disi</option>
          <option value="konvansiyonel">Konvansiyonel</option>
          <option value="disi">Disi</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Yukleniyor...</p>
      ) : bulls.length === 0 ? (
        <p className="text-sm text-neutral-400">Kayit yok.</p>
      ) : view === "toplam" ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-2xl font-semibold text-green-900">{totalStraws}</p>
            <p className="text-xs text-green-700">Toplam straw (secili filtreye gore)</p>
          </div>
          {groups.length === 0 ? (
            <p className="text-sm text-neutral-400">Bu filtreye uyan stok yok.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              {groups.map((g) => (
                <div
                  key={`${g.breed}|${g.semen_type}`}
                  className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900">{g.breed}</span>
                    <Badge value={g.semen_type} />
                  </div>
                  <span className="text-lg font-semibold text-neutral-900">{g.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {filteredBulls.map((b) => {
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
                    const low = r.straw_count <= LOW_STOCK_THRESHOLD;
                    return (
                      <Link
                        key={r.id}
                        href={`/bulls/stock?bullId=${b.id}`}
                        className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-neutral-50"
                      >
                        <div className="flex items-center gap-2">
                          <Badge value={r.semen_type} />
                          <span className="text-neutral-500">{r.tank_location ?? "konum girilmemis"}</span>
                        </div>
                        <div className="text-right">
                          <span className={`font-semibold ${low ? "text-red-600" : "text-neutral-900"}`}>
                            {r.straw_count}
                          </span>
                          <span className="ml-1 text-xs text-neutral-400">straw {low && "(dusuk)"}</span>
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
