"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAnimal } from "@/lib/data";
import { useAuth } from "@/lib/auth";

export default function NewAnimalPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    ear_tag: "",
    name: "",
    birth_date: "",
    breed: "",
    gender: "disi" as "disi" | "erkek",
    mother_ear_tag: "",
    notes: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ear_tag.trim()) return;
    setSubmitting(true);
    await createAnimal({
      ear_tag: form.ear_tag.trim(),
      name: form.name.trim() || null,
      birth_date: form.birth_date || null,
      breed: form.breed.trim() || null,
      gender: form.gender,
      status: "aktif",
      mother_ear_tag: form.mother_ear_tag.trim() || null,
      weaned_at: null,
      notes: form.notes.trim() || null,
      created_by: profile?.id ?? null,
    });
    setSubmitting(false);
    router.push("/animals");
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Yeni hayvan</h1>
      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <Field label="Kupe no *">
          <input
            required
            value={form.ear_tag}
            onChange={(e) => update("ear_tag", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Isim">
          <input value={form.name} onChange={(e) => update("name", e.target.value)} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dogum tarihi">
            <input
              type="date"
              value={form.birth_date}
              onChange={(e) => update("birth_date", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Irk">
            <input value={form.breed} onChange={(e) => update("breed", e.target.value)} className="input" />
          </Field>
        </div>
        <Field label="Cinsiyet">
          <select value={form.gender} onChange={(e) => update("gender", e.target.value as "disi" | "erkek")} className="input">
            <option value="disi">Disi</option>
            <option value="erkek">Erkek</option>
          </select>
        </Field>
        <Field label="Anne kupe no">
          <input
            value={form.mother_ear_tag}
            onChange={(e) => update("mother_ear_tag", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Notlar">
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            className="input"
            rows={3}
          />
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
