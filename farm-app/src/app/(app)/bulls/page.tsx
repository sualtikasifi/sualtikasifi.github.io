"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listBulls, listSemenInventory } from "@/lib/data";
import { Bull, SemenInventory } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function BullsPage() {
  const [bulls, setBulls] = useState<Bull[]>([]);
  const [inventory, setInventory] = useState<SemenInventory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listBulls(), listSemenInventory()]).then(([b, i]) => {
      setBulls(b);
      setInventory(i);
      setLoading(false);
    });
  }, []);

  const stockFor = (bullId: string) => inventory.find((i) => i.bull_id === bullId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Bogalar ve Sperma Stogu</h1>
        <Link href="/bulls/new" className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800">
          Yeni boga
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Yukleniyor...</p>
      ) : bulls.length === 0 ? (
        <p className="text-sm text-neutral-400">Kayit yok.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {bulls.map((b) => {
            const stock = stockFor(b.id);
            const low = (stock?.straw_count ?? 0) <= 5;
            return (
              <Link
                key={b.id}
                href={`/bulls/stock?bullId=${b.id}`}
                className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0 hover:bg-neutral-50"
              >
                <div>
                  <span className="font-medium text-neutral-900">{b.name}</span>
                  {b.code && <span className="ml-2 text-neutral-500">{b.code}</span>}
                  <p className="text-xs text-neutral-400">{b.breed ?? "-"} &middot; {stock?.tank_location ?? "konum girilmemis"}</p>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-semibold ${low ? "text-red-600" : "text-neutral-900"}`}>
                    {stock?.straw_count ?? 0}
                  </span>
                  <p className="text-xs text-neutral-400">straw {low && "(dusuk stok)"}</p>
                  {stock?.updated_at && <p className="text-xs text-neutral-300">{formatDate(stock.updated_at.slice(0, 10))}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
