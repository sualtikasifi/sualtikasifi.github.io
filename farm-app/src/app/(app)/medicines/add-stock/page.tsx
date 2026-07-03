"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adjustMedicineStock, listMedicines } from "@/lib/data";
import { Medicine } from "@/lib/types";

export default function AddMedicineStockPage() {
  const router = useRouter();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Medicine | null>(null);

  useEffect(() => {
    listMedicines().then((m) => {
      setMedicines(m);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return medicines;
    return medicines.filter((m) => m.name.toLowerCase().includes(q));
  }, [medicines, search]);

  const selected = medicines.find((m) => m.id === selectedId) ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !amount.trim()) return;
    setSaving(true);
    const updated = await adjustMedicineStock(selected.id, Math.max(1, Number(amount) || 0));
    setSaving(false);
    if (updated) {
      setSaved(updated);
      setSelectedId(null);
      setAmount("");
      setMedicines((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Stok Ekle</h1>
      <p className="text-sm text-neutral-500">Satın aldığınız ilaç/aşıyı seçip miktarını girin — mevcut stoğun üstüne eklenir.</p>

      <div className="card space-y-3">
        {selected ? (
          <div className="flex items-center justify-between rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <span>
              {selected.name} <span className="text-neutral-400">({selected.stock_count} {selected.unit} mevcut)</span>
            </span>
            <button type="button" onClick={() => setSelectedId(null)} className="text-xs text-green-700">
              Değiştir
            </button>
          </div>
        ) : loading ? (
          <p className="text-sm text-neutral-500">Yükleniyor...</p>
        ) : (
          <div>
            <input
              placeholder="İlaç/aşı ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              autoComplete="off"
            />
            <div className="mt-1 max-h-60 overflow-y-auto rounded-md border border-neutral-200">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-neutral-400">İlaç bulunamadı.</p>
              ) : (
                filtered.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                  >
                    {m.name} <span className="text-neutral-400">({m.stock_count} {m.unit})</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {selected && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">Alınan miktar *</span>
              <input
                type="number"
                min={1}
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input"
              />
            </label>
            <button type="submit" disabled={saving || !amount.trim()} className="btn-primary">
              {saving ? "Kaydediliyor..." : "Stoğa Ekle"}
            </button>
          </form>
        )}

        {saved && (
          <p className="text-sm text-green-700">
            {saved.name} stoğu güncellendi: {saved.stock_count} {saved.unit}.
          </p>
        )}
      </div>

      <button type="button" onClick={() => router.push("/medicines")} className="text-xs font-medium text-green-700 hover:underline">
        İlaç Stoğu sayfasına dön
      </button>
    </div>
  );
}
