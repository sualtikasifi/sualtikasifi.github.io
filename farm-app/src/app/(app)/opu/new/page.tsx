"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createOpuSession, listAnimals, listProfiles } from "@/lib/data";
import { Animal, Profile } from "@/lib/types";
import { useAuth } from "@/lib/auth";

export default function NewOpuSessionPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [animalSearch, setAnimalSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    donor_animal_id: "",
    session_date: new Date().toISOString().slice(0, 10),
    technician_name: "",
    follicle_count_right: "",
    follicle_count_left: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([listAnimals(), listProfiles()]).then(([a, p]) => {
      setAnimals(a);
      setProfiles(p);
    });
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
      follicle_count_right: form.follicle_count_right ? Number(form.follicle_count_right) : null,
      follicle_count_left: form.follicle_count_left ? Number(form.follicle_count_left) : null,
      oocyte_count: null,
      cleaved_count: null,
      embryo_count: null,
      notes: form.notes.trim() || null,
      created_by: profile?.id ?? null,
    });
    setSubmitting(false);
    router.push(`/opu/detail?id=${session.id}`);
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Yeni OPU Ekle</h1>
      <p className="text-sm text-neutral-500">
        Bu ilk kayıt aşaması: donör hayvan ve folikül sayılarını gir. Oosit, bölünme ve embriyo
        sayıları laboratuvar sonuçları geldikçe ayrı ayrı sorulacak.
      </p>
      <form onSubmit={handleSubmit} className="card space-y-3">
        <FieldBlock label="Donör hayvan *">
          {form.donor_animal_id ? (
            <div className="flex items-center justify-between rounded-md border border-neutral-300 px-3 py-2 text-sm">
              <span>{animals.find((a) => a.id === form.donor_animal_id)?.ear_tag}</span>
              <button type="button" onClick={() => update("donor_animal_id", "")} className="text-xs text-green-700">
                Değiştir
              </button>
            </div>
          ) : (
            <div>
              <input
                placeholder="Küpe Numarası"
                value={animalSearch}
                onChange={(e) => setAnimalSearch(e.target.value)}
                className="input"
                autoComplete="off"
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

        <Field label="Tarih">
          <input
            type="date"
            value={form.session_date}
            onChange={(e) => update("session_date", e.target.value)}
            className="input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Sol folikül">
            <input
              type="number"
              min={0}
              value={form.follicle_count_left}
              onChange={(e) => update("follicle_count_left", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Sağ folikül">
            <input
              type="number"
              min={0}
              value={form.follicle_count_right}
              onChange={(e) => update("follicle_count_right", e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <FieldBlock label="Veteriner Hekim/Tekniker">
          <div className="flex flex-wrap gap-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => update("technician_name", p.full_name)}
                className={`chip ${form.technician_name === p.full_name ? "chip-selected" : "chip-unselected"}`}
              >
                {p.full_name}
              </button>
            ))}
          </div>
        </FieldBlock>

        <Field label="Notlar">
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="input" rows={3} />
        </Field>

        <button type="submit" disabled={submitting || !form.donor_animal_id} className="btn-primary">
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
