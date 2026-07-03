"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBull, setSemenStock } from "@/lib/data";
import { useAuth } from "@/lib/auth";

export default function NewBullPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    breed: "",
    notes: "",
    conventional_count: "0",
    conventional_location: "",
    sexed_count: "0",
    sexed_location: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    const bull = await createBull({
      name: form.name.trim(),
      code: form.code.trim() || null,
      breed: form.breed.trim() || null,
      notes: form.notes.trim() || null,
      created_by: profile?.id ?? null,
    });
    await setSemenStock(bull.id, "konvansiyonel", {
      straw_count: Number(form.conventional_count) || 0,
      tank_location: form.conventional_location.trim() || null,
      notes: null,
    });
    await setSemenStock(bull.id, "disi", {
      straw_count: Number(form.sexed_count) || 0,
      tank_location: form.sexed_location.trim() || null,
      notes: null,
    });
    setSubmitting(false);
    router.push("/bulls");
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Yeni boga</h1>
      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <Field label="Isim *">
          <input required value={form.name} onChange={(e) => update("name", e.target.value)} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kod">
            <input value={form.code} onChange={(e) => update("code", e.target.value)} className="input" />
          </Field>
          <Field label="Irk">
            <input value={form.breed} onChange={(e) => update("breed", e.target.value)} className="input" />
          </Field>
        </div>

        <div className="rounded-md border border-neutral-200 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Konvansiyonel sperma</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Baslangic stok (straw)">
              <input
                type="number"
                min={0}
                value={form.conventional_count}
                onChange={(e) => update("conventional_count", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Tank konumu">
              <input
                value={form.conventional_location}
                onChange={(e) => update("conventional_location", e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </div>

        <div className="rounded-md border border-neutral-200 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Disi (cinsiyeti belirlenmis) sperma</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Baslangic stok (straw)">
              <input
                type="number"
                min={0}
                value={form.sexed_count}
                onChange={(e) => update("sexed_count", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Tank konumu">
              <input
                value={form.sexed_location}
                onChange={(e) => update("sexed_location", e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </div>

        <Field label="Notlar">
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="input" rows={3} />
        </Field>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
        >
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
