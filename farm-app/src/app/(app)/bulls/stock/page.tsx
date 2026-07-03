"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { listBulls, listSemenInventory, setSemenStock } from "@/lib/data";
import { Bull, SemenInventory, SemenType } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/format";

export default function BullStockPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Yükleniyor...</p>}>
      <BullStockContent />
    </Suspense>
  );
}

function BullStockContent() {
  const params = useSearchParams();
  const bullId = params.get("bullId");
  const [bull, setBull] = useState<Bull | null>(null);
  const [conventionalStock, setConventionalStock] = useState<SemenInventory | null>(null);
  const [sexedStock, setSexedStock] = useState<SemenInventory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bullId) return;
    Promise.all([listBulls(), listSemenInventory()]).then(([bulls, inventory]) => {
      setBull(bulls.find((b) => b.id === bullId) ?? null);
      setConventionalStock(
        inventory.find((i) => i.bull_id === bullId && i.semen_type === "konvansiyonel") ?? null
      );
      setSexedStock(inventory.find((i) => i.bull_id === bullId && i.semen_type === "disi") ?? null);
      setLoading(false);
    });
  }, [bullId]);

  if (!bullId) return <p className="text-sm text-red-600">Boğa belirtilmedi.</p>;
  if (loading) return <p className="text-sm text-neutral-500">Yükleniyor...</p>;
  if (!bull) return <p className="text-sm text-red-600">Boğa bulunamadı.</p>;

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">
        {bull.name} {bull.code && <span className="text-neutral-500">({bull.code})</span>}
      </h1>

      <SemenTypeCard
        bullId={bullId}
        semenType="konvansiyonel"
        stock={conventionalStock}
        onSaved={setConventionalStock}
      />
      <SemenTypeCard bullId={bullId} semenType="disi" stock={sexedStock} onSaved={setSexedStock} />
    </div>
  );
}

function SemenTypeCard({
  bullId,
  semenType,
  stock,
  onSaved,
}: {
  bullId: string;
  semenType: SemenType;
  stock: SemenInventory | null;
  onSaved: (s: SemenInventory) => void;
}) {
  const [strawCount, setStrawCount] = useState(String(stock?.straw_count ?? 0));
  const [tankLocation, setTankLocation] = useState(stock?.tank_location ?? "");
  const [notes, setNotes] = useState(stock?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const updated = await setSemenStock(bullId, semenType, {
      straw_count: Math.max(0, Number(strawCount) || 0),
      tank_location: tankLocation.trim() || null,
      notes: notes.trim() || null,
    });
    onSaved(updated);
    setSaving(false);
  }

  async function quickAdjust(delta: number) {
    const nextCount = Math.max(0, (stock?.straw_count ?? 0) + delta);
    setStrawCount(String(nextCount));
    const updated = await setSemenStock(bullId, semenType, { straw_count: nextCount });
    onSaved(updated);
  }

  return (
    <div className="card space-y-3">
      <Badge value={semenType} />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-semibold text-neutral-900">{stock?.straw_count ?? 0}</p>
          <p className="text-xs text-neutral-400">
            straw {stock?.updated_at && `· son güncelleme ${formatDate(stock.updated_at.slice(0, 10))}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => quickAdjust(-1)}
            className="h-10 w-10 rounded-md border border-neutral-300 text-lg shadow-sm transition-colors hover:bg-neutral-50"
          >
            -1
          </button>
          <button
            type="button"
            onClick={() => quickAdjust(1)}
            className="h-10 w-10 rounded-md border border-neutral-300 text-lg shadow-sm transition-colors hover:bg-neutral-50"
          >
            +1
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-3">
        <Field label="Kesin straw sayısı">
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
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} />
        </Field>
        <button type="submit" disabled={saving} className="btn-primary">
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
