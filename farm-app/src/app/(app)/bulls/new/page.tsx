"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBull, setSemenStock } from "@/lib/data";
import { SemenType } from "@/lib/types";
import { useAuth } from "@/lib/auth";

export default function NewBullPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [semenType, setSemenType] = useState<SemenType>("konvansiyonel");
  const [form, setForm] = useState({
    name: "",
    code: "",
    breed: "",
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
      notes: null,
      created_by: profile?.id ?? null,
    });
    await setSemenStock(bull.id, semenType, {
      straw_count: 0,
      tank_location: null,
      notes: null,
    });
    setSubmitting(false);
    router.push("/bulls");
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Yeni boğa</h1>
      <form onSubmit={handleSubmit} className="card space-y-3">
        <Field label="İsim *">
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

        <FieldBlock label="Sperma türü">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSemenType("konvansiyonel")}
              className={`chip ${semenType === "konvansiyonel" ? "chip-selected" : "chip-unselected"}`}
            >
              Konvansiyonel
            </button>
            <button
              type="button"
              onClick={() => setSemenType("disi")}
              className={`chip ${semenType === "disi" ? "chip-selected" : "chip-unselected"}`}
            >
              Dişi Sperma
            </button>
          </div>
        </FieldBlock>

        <button type="submit" disabled={submitting} className="btn-primary">
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

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </div>
  );
}
