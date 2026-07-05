"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adjustMedicineStock, createMedicine, listMedicines } from "@/lib/data";
import { Medicine } from "@/lib/types";
import { useAuth } from "@/lib/auth";

export default function NewMedicinePage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    quantity: "0",
    notes: "",
  });

  useEffect(() => {
    listMedicines().then(setMedicines);
  }, []);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const existing = medicines.find((m) => m.name.trim().toLowerCase() === form.name.trim().toLowerCase());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    const quantity = Math.max(0, Number(form.quantity) || 0);
    if (existing) {
      await adjustMedicineStock(existing.id, quantity);
    } else {
      await createMedicine({
        name: form.name.trim(),
        unit: "adet",
        stock_count: quantity,
        notes: form.notes.trim() || null,
        created_by: profile?.id ?? null,
      });
    }
    setSubmitting(false);
    router.push("/medicines");
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Yeni ilaç/aşı ekle</h1>
      <form onSubmit={handleSubmit} className="card space-y-3">
        <Field label="İlaç/Aşı adı *">
          <input required value={form.name} onChange={(e) => update("name", e.target.value)} className="input" />
          {existing && (
            <p className="mt-1 text-xs text-amber-700">
              Bu isimde bir kayıt zaten var (mevcut stok: {existing.stock_count} adet). Girdiğiniz miktar bu stoğun
              üstüne eklenecek.
            </p>
          )}
        </Field>
        <Field label="Adet">
          <input
            type="number"
            min={0}
            value={form.quantity}
            onChange={(e) => update("quantity", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Notlar">
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="input" rows={3} />
        </Field>
        <button type="submit" disabled={submitting || !form.name.trim()} className="btn-primary">
          {submitting ? "Kaydediliyor..." : "Kaydet"}
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
