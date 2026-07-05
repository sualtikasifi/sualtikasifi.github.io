"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const params = useSearchParams();
  const bullId = params.get("bullId");
  const [allBulls, setAllBulls] = useState<Bull[]>([]);
  const [bullSearch, setBullSearch] = useState("");
  const [bull, setBull] = useState<Bull | null>(null);
  const [conventionalStock, setConventionalStock] = useState<SemenInventory | null>(null);
  const [sexedStock, setSexedStock] = useState<SemenInventory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listBulls().then(setAllBulls);
  }, []);

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

  const filteredBulls = useMemo(() => {
    const q = bullSearch.trim().toLowerCase();
    if (!q) return allBulls;
    return allBulls.filter(
      (b) => b.name.toLowerCase().includes(q) || (b.code ?? "").toLowerCase().includes(q)
    );
  }, [allBulls, bullSearch]);

  if (!bullId) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="text-lg font-semibold text-neutral-900">Stok Düzenle</h1>
        <div className="card space-y-3">
          <input
            placeholder="Boğa adı veya kodu ile ara..."
            value={bullSearch}
            onChange={(e) => setBullSearch(e.target.value)}
            className="input"
            autoComplete="off"
          />
          <div className="max-h-80 overflow-y-auto rounded-md border border-neutral-200">
            {filteredBulls.length === 0 ? (
              <p className="px-3 py-2 text-sm text-neutral-400">Boğa bulunamadı.</p>
            ) : (
              filteredBulls.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => router.push(`/bulls/stock?bullId=${b.id}`)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                >
                  <span className="font-medium text-neutral-900">{b.name}</span>
                  {b.code && <span className="ml-2 text-neutral-500">{b.code}</span>}
                  {b.breed && <span className="ml-2 text-neutral-400">{b.breed}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <p className="text-sm text-neutral-500">Yükleniyor...</p>;
  if (!bull) return <p className="text-sm text-red-600">Boğa bulunamadı.</p>;

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">
          {bull.name} {bull.code && <span className="text-neutral-500">({bull.code})</span>}
        </h1>
        <button
          type="button"
          onClick={() => router.push("/bulls/stock")}
          className="text-xs font-medium text-green-700 hover:underline"
        >
          Başka boğa seç
        </button>
      </div>

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
  const [tankStrawCount, setTankStrawCount] = useState(String(stock?.tank_straw_count ?? 0));
  const [tankLocation, setTankLocation] = useState(stock?.tank_location ?? "");
  const [notes, setNotes] = useState(stock?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [transferAmount, setTransferAmount] = useState("1");
  const [transferring, setTransferring] = useState(false);

  const depoTotal = stock?.straw_count ?? 0;
  const tankTotal = stock?.tank_straw_count ?? 0;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const updated = await setSemenStock(bullId, semenType, {
      straw_count: Math.max(0, Number(strawCount) || 0),
      tank_straw_count: Math.max(0, Number(tankStrawCount) || 0),
      tank_location: tankLocation.trim() || null,
      notes: notes.trim() || null,
    });
    onSaved(updated);
    setSaving(false);
  }

  async function transfer(direction: "depo_to_tank" | "tank_to_depo") {
    const amount = Math.max(0, Number(transferAmount) || 0);
    if (amount === 0) return;
    const available = direction === "depo_to_tank" ? depoTotal : tankTotal;
    const move = Math.min(amount, available);
    if (move === 0) return;
    setTransferring(true);
    const nextDepo = direction === "depo_to_tank" ? depoTotal - move : depoTotal + move;
    const nextTank = direction === "depo_to_tank" ? tankTotal + move : tankTotal - move;
    const updated = await setSemenStock(bullId, semenType, {
      straw_count: nextDepo,
      tank_straw_count: nextTank,
    });
    setStrawCount(String(nextDepo));
    setTankStrawCount(String(nextTank));
    onSaved(updated);
    setTransferring(false);
  }

  return (
    <div className="card space-y-3">
      <Badge value={semenType} />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border border-neutral-200 p-3">
          <p className="text-2xl font-semibold text-neutral-900">{depoTotal}</p>
          <p className="text-xs text-neutral-400">straw · Depo</p>
        </div>
        <div className="rounded-md border border-neutral-200 p-3">
          <p className="text-2xl font-semibold text-neutral-900">{tankTotal}</p>
          <p className="text-xs text-neutral-400">straw · Tank</p>
        </div>
      </div>
      <p className="text-xs text-neutral-400">
        Toplam {depoTotal + tankTotal} straw
        {stock?.updated_at && ` · son güncelleme ${formatDate(stock.updated_at.slice(0, 10))}`}
      </p>

      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
        <p className="mb-2 text-xs font-medium text-neutral-600">Depo ⇄ Tank aktarımı</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            className="input w-20"
          />
          <button
            type="button"
            onClick={() => transfer("depo_to_tank")}
            disabled={transferring || depoTotal === 0}
            className="rounded-md border border-green-600 px-3 py-1.5 text-xs font-medium text-green-700 shadow-sm transition-colors hover:bg-green-50 disabled:opacity-50"
          >
            Depodan Tanka →
          </button>
          <button
            type="button"
            onClick={() => transfer("tank_to_depo")}
            disabled={transferring || tankTotal === 0}
            className="rounded-md border border-green-600 px-3 py-1.5 text-xs font-medium text-green-700 shadow-sm transition-colors hover:bg-green-50 disabled:opacity-50"
          >
            ← Tanktan Depoya
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kesin depo straw sayısı">
            <input
              type="number"
              min={0}
              value={strawCount}
              onChange={(e) => setStrawCount(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Kesin tank straw sayısı">
            <input
              type="number"
              min={0}
              value={tankStrawCount}
              onChange={(e) => setTankStrawCount(e.target.value)}
              className="input"
            />
          </Field>
        </div>
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
