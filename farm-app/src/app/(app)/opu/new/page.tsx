"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createOpuSession, listAnimals } from "@/lib/data";
import { Animal } from "@/lib/types";
import { useAuth } from "@/lib/auth";

export default function NewOpuSessionPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [animalSearch, setAnimalSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    donor_animal_id: "",
    session_date: new Date().toISOString().slice(0, 10),
    technician_name: "",
    oocyte_count: "",
    notes: "",
  });

  useEffect(() => {
    listAnimals().then(setAnimals);
  }, []);

  const filteredAnimals = useMemo(() => {
    const q = animalSearch.trim().toLowerCase();
    if (!q) return animals;
    return animals.filter((a) => a.ear_tag.toLowerCase().includes(q));
  }, [animals, animalSearch]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.donor_animal_id) return;
    setSubmitting(true);
    const session = await createOpuSession({
      donor_animal_id: form.donor_animal_id,
      session_date: form.session_date,
      technician_name: form.technician_name.trim() || null,
      oocyte_count: form.oocyte_count ? Number(form.oocyte_count) : null,
      notes: form.notes.trim() || null,
      created_by: profile?.id ?? null,
    });
    setSubmitting(false);
    router.push(`/opu/detail?id=${session.id}`);
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Yeni OPU seansi</h1>
      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <FieldBlock label="Donor hayvan *">
          {form.donor_animal_id ? (
            <div className="flex items-center justify-between rounded-md border border-neutral-300 px-3 py-2 text-sm">
              <span>{animals.find((a) => a.id === form.donor_animal_id)?.ear_tag}</span>
              <button type="button" onClick={() => update("donor_animal_id", "")} className="text-xs text-green-700">
                Degistir
              </button>
            </div>
          ) : (
            <div>
              <input
                placeholder="Kupe no ile ara..."
                value={animalSearch}
                onChange={(e) => setAnimalSearch(e.target.value)}
                className="input"
              />
              <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-neutral-200">
                {filteredAnimals.slice(0, 20).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => update("donor_animal_id", a.id)}
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-50"
                  >
                    {a.ear_tag} {a.name && `(${a.name})`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </FieldBlock>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tarih">
            <input
              type="date"
              value={form.session_date}
              onChange={(e) => update("session_date", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Toplanan oosit sayisi">
            <input
              type="number"
              min={0}
              value={form.oocyte_count}
              onChange={(e) => update("oocyte_count", e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <Field label="Teknisyen">
          <input value={form.technician_name} onChange={(e) => update("technician_name", e.target.value)} className="input" />
        </Field>

        <Field label="Notlar">
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="input" rows={3} />
        </Field>

        <button
          type="submit"
          disabled={submitting || !form.donor_animal_id}
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

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </div>
  );
}
