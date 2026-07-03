"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMedicine } from "@/lib/data";
import { useAuth } from "@/lib/auth";

export default function NewMedicinePage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    unit: "adet",
    stock_count: "0",
    notes: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    await createMedicine({
      name: form.name.trim(),
      unit: form.unit.trim() || "adet",
      stock_count: Math.max(0, Number(form.stock_count) || 0),
      notes: form.notes.trim() || null,
      created_by: profile?.id ?? null,
    });
    setSubmitting(false);
    router.push("/medicines");
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Yeni ilaç/aşı ekle</h1>
      <form onSubmit={handleSubmit} className="card space-y-3">
        <Field label="İlaç/Aşı adı *">
          <input required value={form.name} onChange={(e) => update("name", e.target.value)} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Birim">
            <input
              value={form.unit}
              onChange={(e) => update("unit", e.target.value)}
              placeholder="adet, doz, şişe..."
              className="input"
            />
          </Field>
          <Field label="Başlangıç stoğu">
            <input
              type="number"
              min={0}
              value={form.stock_count}
              onChange={(e) => update("stock_count", e.target.value)}
              className="input"
            />
          </Field>
        </div>
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
