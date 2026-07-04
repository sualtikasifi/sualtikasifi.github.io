"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createInsemination, listAnimals, listBulls, listProfiles, listSemenInventory } from "@/lib/data";
import { Animal, Bull, Profile, SemenInventory, SemenType } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { EarTagPicker } from "@/components/EarTagPicker";

export default function NewInseminationPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Yükleniyor...</p>}>
      <NewInseminationContent />
    </Suspense>
  );
}

function NewInseminationContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { profile } = useAuth();
  const preselectedAnimalId = params.get("animalId") ?? "";

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [bulls, setBulls] = useState<Bull[]>([]);
  const [inventory, setInventory] = useState<SemenInventory[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    animal_id: preselectedAnimalId,
    bull_id: "",
    semen_type: "konvansiyonel" as SemenType,
    insemination_date: new Date().toISOString().slice(0, 10),
    technician_name: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([listAnimals(), listBulls(), listSemenInventory(), listProfiles()]).then(([a, b, i, p]) => {
      setAnimals(a);
      setBulls(b);
      setInventory(i);
      setProfiles(p);
      setForm((f) => ({ ...f, bull_id: f.bull_id || b[0]?.id || "" }));
    });
  }, []);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function stockFor(bullId: string, semenType: SemenType) {
    return inventory.find((i) => i.bull_id === bullId && i.semen_type === semenType)?.straw_count ?? 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.animal_id) return;
    setSubmitting(true);
    await createInsemination({
      animal_id: form.animal_id,
      bull_id: form.bull_id || null,
      semen_type: form.bull_id ? form.semen_type : null,
      insemination_date: form.insemination_date,
      technician_name: form.technician_name.trim() || null,
      pregnancy_check_date: null,
      pregnancy_result: "bekleniyor",
      notes: form.notes.trim() || null,
      created_by: profile?.id ?? null,
    });
    setSubmitting(false);
    router.push(`/animals/detail?id=${form.animal_id}`);
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Yeni tohumlama kaydı</h1>
      <form onSubmit={handleSubmit} className="card space-y-3">
        <FieldBlock label="Hayvan *">
          <EarTagPicker
            animals={animals}
            selectedId={form.animal_id || null}
            onSelect={(id) => update("animal_id", id)}
            onClear={() => update("animal_id", "")}
          />
        </FieldBlock>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Boğa">
            <select value={form.bull_id} onChange={(e) => update("bull_id", e.target.value)} className="input">
              <option value="">Seçilmedi</option>
              {bulls.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.breed && `(${b.breed})`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sperma türü">
            <select
              value={form.semen_type}
              onChange={(e) => update("semen_type", e.target.value as SemenType)}
              disabled={!form.bull_id}
              className="input"
            >
              <option value="konvansiyonel">
                Konvansiyonel {form.bull_id && `(${stockFor(form.bull_id, "konvansiyonel")} straw kaldı)`}
              </option>
              <option value="disi">
                Dişi {form.bull_id && `(${stockFor(form.bull_id, "disi")} straw kaldı)`}
              </option>
            </select>
          </Field>
        </div>

        <Field label="Tarih">
          <input
            type="date"
            value={form.insemination_date}
            onChange={(e) => update("insemination_date", e.target.value)}
            className="input"
          />
        </Field>

        <FieldBlock label="Tohumlayıcı">
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

        <button type="submit" disabled={submitting || !form.animal_id} className="btn-primary">
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
