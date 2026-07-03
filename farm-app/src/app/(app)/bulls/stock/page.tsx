"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { listBulls, listSemenInventory, setSemenStock } from "@/lib/data";
import { Bull, SemenInventory } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function BullStockPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Yukleniyor...</p>}>
      <BullStockContent />
    </Suspense>
  );
}

function BullStockContent() {
  const params = useSearchParams();
  const bullId = params.get("bullId");
  const [bull, setBull] = useState<Bull | null>(null);
  const [stock, setStock] = useState<SemenInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [strawCount, setStrawCount] = useState("0");
  const [tankLocation, setTankLocation] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!bullId) return;
    Promise.all([listBulls(), listSemenInventory()]).then(([bulls, inventory]) => {
      const found = bulls.find((b) => b.id === bullId) ?? null;
      const foundStock = inventory.find((i) => i.bull_id === bullId) ?? null;
      setBull(found);
      setStock(foundStock);
      setStrawCount(String(foundStock?.straw_count ?? 0));
      setTankLocation(foundStock?.tank_location ?? "");
      setNotes(foundStock?.notes ?? "");
      setLoading(false);
    });
  }, [bullId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!bullId) return;
    setSaving(true);
    const updated = await setSemenStock(bullId, {
      straw_count: Math.max(0, Number(strawCount) || 0),
      tank_location: tankLocation.trim() || null,
      notes: notes.trim() || null,
    });
    setStock(updated);
    setSaving(false);
  }

  async function quickAdjust(delta: number) {
    if (!bullId) return;
    const nextCount = Math.max(0, (stock?.straw_count ?? 0) + delta);
    setStrawCount(String(nextCount));
    const updated = await setSemenStock(bullId, { straw_count: nextCount });
    setStock(updated);
  }

  if (!bullId) return <p className="text-sm text-red-600">Boga belirtilmedi.</p>;
  if (loading) return <p className="text-sm text-neutral-500">Yukleniyor...</p>;
  if (!bull) return <p className="text-sm text-red-600">Boga bulunamadi.</p>;

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">
        {bull.name} {bull.code && <span className="text-neutral-500">({bull.code})</span>}
      </h1>

      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4">
        <div>
          <p className="text-3xl font-semibold text-neutral-900">{stock?.straw_count ?? 0}</p>
          <p className="text-xs text-neutral-400">
            straw {stock?.updated_at && `· son guncelleme ${formatDate(stock.updated_at.slice(0, 10))}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => quickAdjust(-1)}
            className="h-10 w-10 rounded-md border border-neutral-300 text-lg hover:bg-neutral-50"
          >
            -1
          </button>
          <button
            onClick={() => quickAdjust(1)}
            className="h-10 w-10 rounded-md border border-neutral-300 text-lg hover:bg-neutral-50"
          >
            +1
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <Field label="Kesin straw sayisi">
          <input
            type="number"
            min={0}
            value={strawCount}
            onChange={(e) => setStrawCount(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Tank konumu">
          <input value={tankLocation} onChange={(e) => setTankLocation(e.target.value)} className="input" />
        </Field>
        <Field label="Notlar">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={3} />
        </Field>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  );
}
