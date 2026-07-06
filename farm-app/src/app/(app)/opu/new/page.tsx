"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createOpuSession, listAnimals, listProfiles } from "@/lib/data";
import { Animal, Profile } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { EarTagPicker } from "@/components/EarTagPicker";

export default function NewOpuSessionPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    donor_animal_id: "",
    session_date: new Date().toISOString().slice(0, 10),
    session_time: new Date().toTimeString().slice(0, 5),
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
      session_time: form.session_time || null,
      technician_name: form.technician_name.trim() || null,
      follicle_count_right: form.follicle_count_right ? Number(form.follicle_count_right) : null,
      follicle_count_left: form.follicle_count_left ? Number(form.follicle_count_left) : null,
      oocyte_count: null,
      oocyte_grade_a: null,
      oocyte_grade_b: null,
      oocyte_grade_c: null,
      oocyte_grade_d: null,
      cleaved_count: null,
      fertilization_bull_id: null,
      fertilization_semen_type: null,
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
          <EarTagPicker
            animals={animals}
            selectedId={form.donor_animal_id || null}
            onSelect={(id) => update("donor_animal_id", id)}
            onClear={() => update("donor_animal_id", "")}
          />
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
          <Field label="Saat (opsiyonel)">
            <input
              type="time"
              value={form.session_time}
              onChange={(e) => update("session_time", e.target.value)}
              className="input"
            />
          </Field>
        </div>

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
