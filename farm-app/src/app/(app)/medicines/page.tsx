"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adjustMedicineStock, listMedicines } from "@/lib/data";
import { Medicine } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { exportRowsToExcel } from "@/lib/excelExport";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

const LOW_STOCK_THRESHOLD = 5;

export default function MedicinesPage() {
  const { profile } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    listMedicines().then((m) => {
      setMedicines(m);
      setLoading(false);
    });
  }, []);

  function handleUpdated(updated: Medicine) {
    setMedicines((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  const filtered = medicines.filter((m) =>
    !search.trim() || m.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  async function handleExport() {
    setExporting(true);
    try {
      await exportRowsToExcel(
        `ilac-stogu-${new Date().toISOString().slice(0, 10)}.xlsx`,
        "İlaç Stoğu",
        ["İlaç/Aşı Adı", "Birim", "Stok Miktarı", "Notlar", "Son Güncelleme"],
        medicines.map((m) => [m.name, m.unit, m.stock_count, m.notes ?? "", formatDate(m.updated_at.slice(0, 10))])
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Aşı/İlaç Stok Takibi</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || medicines.length === 0}
            className="btn-secondary"
          >
            {exporting ? "Hazırlanıyor..." : "Excel'e Aktar"}
          </button>
          {hasPermission(profile, "can_manage_medicines") && (
            <>
              <Link href="/medicines/add-stock" className="rounded-md border border-green-700 px-3 py-1.5 text-sm font-medium text-green-700 shadow-sm transition-colors hover:bg-green-50">
                Stok Ekle
              </Link>
              <Link href="/medicines/new" className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-800">
                Yeni İlaç Ekle
              </Link>
            </>
          )}
        </div>
      </div>

      <input
        placeholder="İlaç/aşı ara..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input"
        autoComplete="off"
      />

      {loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-neutral-400">Kayıt yok.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <MedicineCard key={m.id} medicine={m} onUpdated={handleUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}

function MedicineCard({
  medicine,
  onUpdated,
}: {
  medicine: Medicine;
  onUpdated: (m: Medicine) => void;
}) {
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const low = medicine.stock_count <= LOW_STOCK_THRESHOLD;

  async function handleUse() {
    const n = Math.max(1, Number(amount) || 1);
    setBusy(true);
    const updated = await adjustMedicineStock(medicine.id, -n);
    if (updated) onUpdated(updated);
    setBusy(false);
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-neutral-900">{medicine.name}</p>
          {medicine.notes && <p className="text-xs text-neutral-500">{medicine.notes}</p>}
          <p className="text-xs text-neutral-400">
            Son güncelleme: {formatDate(medicine.updated_at.slice(0, 10))}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-2xl font-semibold ${low ? "text-red-600" : "text-neutral-900"}`}>
            {medicine.stock_count}
          </p>
          <p className="text-xs text-neutral-400">{medicine.unit} {low && "(düşük)"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input w-20"
        />
        <button
          type="button"
          disabled={busy || medicine.stock_count === 0}
          onClick={handleUse}
          className="rounded-md border border-red-400 px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          Kullanıldı, Düş
        </button>
      </div>
    </div>
  );
}
