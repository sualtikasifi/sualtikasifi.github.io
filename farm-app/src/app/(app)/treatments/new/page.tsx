"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createMastitisTreatment, listAnimals } from "@/lib/data";
import { Animal, UdderQuarter } from "@/lib/types";
import { useAuth } from "@/lib/auth";

export default function NewMastitisPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Yukleniyor...</p>}>
      <NewMastitisContent />
    </Suspense>
  );
}

function NewMastitisContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { profile } = useAuth();
  const preselectedAnimalId = params.get("animalId") ?? "";

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [animalSearch, setAnimalSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    animal_id: preselectedAnimalId,
    udder_quarter: "" as UdderQuarter | "",
    start_date: new Date().toISOString().slice(0, 10),
    protocol_days: 4,
    withdrawal_days: 3,
    diagnosis: "",
    medication: "",
    vet_name: "",
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
    if (!form.animal_id || !form.udder_quarter) return;
    setSubmitting(true);
    await createMastitisTreatment({
      animal_id: form.animal_id,
      udder_quarter: form.udder_quarter,
      start_date: form.start_date,
      protocol_days: form.protocol_days,
      withdrawal_days: form.withdrawal_days,
      diagnosis: form.diagnosis.trim() || null,
      medication: form.medication.trim() || null,
      vet_name: form.vet_name.trim() || null,
      notes: form.notes.trim() || null,
      created_by: profile?.id ?? null,
    });
    setSubmitting(false);
    router.push("/treatments");
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Yeni mastitis kaydi</h1>
      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <FieldBlock label="Hayvan *">
          {form.animal_id ? (
            <div className="flex items-center justify-between rounded-md border border-neutral-300 px-3 py-2 text-sm">
              <span>{animals.find((a) => a.id === form.animal_id)?.ear_tag}</span>
              <button type="button" onClick={() => update("animal_id", "")} className="text-xs text-green-700">
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
                    onClick={() => update("animal_id", a.id)}
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-50"
                  >
                    {a.ear_tag} {a.name && `(${a.name})`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </FieldBlock>

        <Field label="Meme *">
          <select
            value={form.udder_quarter}
            onChange={(e) => update("udder_quarter", e.target.value as UdderQuarter)}
            className="input"
          >
            <option value="">Secin</option>
            <option value="on_sol">On Sol</option>
            <option value="on_sag">On Sag</option>
            <option value="arka_sol">Arka Sol</option>
            <option value="arka_sag">Arka Sag</option>
          </select>
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Baslangic tarihi">
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => update("start_date", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Protokol (gun)">
            <input
              type="number"
              min={1}
              value={form.protocol_days}
              onChange={(e) => update("protocol_days", Number(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="Arinma (gun)">
            <input
              type="number"
              min={0}
              value={form.withdrawal_days}
              onChange={(e) => update("withdrawal_days", Number(e.target.value))}
              className="input"
            />
          </Field>
        </div>

        <Field label="Tani / aciklama">
          <input value={form.diagnosis} onChange={(e) => update("diagnosis", e.target.value)} className="input" />
        </Field>

        <Field label="Ilac">
          <input value={form.medication} onChange={(e) => update("medication", e.target.value)} className="input" />
        </Field>

        <Field label="Veteriner">
          <input value={form.vet_name} onChange={(e) => update("vet_name", e.target.value)} className="input" />
        </Field>

        <Field label="Notlar">
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="input" rows={3} />
        </Field>

        <button
          type="submit"
          disabled={submitting || !form.animal_id || !form.udder_quarter}
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
