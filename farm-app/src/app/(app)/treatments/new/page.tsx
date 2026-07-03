"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createMastitisTreatment,
  listAnimals,
  listMastitisProtocols,
  listProfiles,
  saveMastitisProtocolIfNew,
} from "@/lib/data";
import { Animal, MastitisProtocol, Profile, UdderQuarter } from "@/lib/types";
import { useAuth } from "@/lib/auth";

const DIAGNOSIS_OPTIONS = ["Mastitis", "Retensiyo Sekundinarium", "Toksikasyon"] as const;
type DiagnosisOption = (typeof DIAGNOSIS_OPTIONS)[number] | "Diger";

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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [protocols, setProtocols] = useState<MastitisProtocol[]>([]);
  const [animalSearch, setAnimalSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [udderQuarters, setUdderQuarters] = useState<UdderQuarter[]>([]);
  const [diagnosisOption, setDiagnosisOption] = useState<DiagnosisOption>("Mastitis");
  const [diagnosisCustom, setDiagnosisCustom] = useState("");
  const [form, setForm] = useState({
    animal_id: preselectedAnimalId,
    start_date: new Date().toISOString().slice(0, 10),
    protocol_days: 4,
    withdrawal_days: 3,
    medication: "",
    vet_name: "",
    notes: "",
  });

  function toggleUdderQuarter(q: UdderQuarter) {
    setUdderQuarters((prev) => (prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]));
  }

  useEffect(() => {
    Promise.all([listAnimals(), listProfiles(), listMastitisProtocols()]).then(([a, p, pr]) => {
      setAnimals(a);
      setProfiles(p);
      setProtocols(pr);
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

  const diagnosis =
    diagnosisOption === "Diger" ? diagnosisCustom.trim() : diagnosisOption;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.animal_id || udderQuarters.length === 0 || !diagnosis) return;
    setSubmitting(true);
    setError(null);
    try {
      const medication = form.medication.trim() || null;
      await Promise.all(
        udderQuarters.map((udder_quarter) =>
          createMastitisTreatment({
            animal_id: form.animal_id,
            udder_quarter,
            start_date: form.start_date,
            protocol_days: form.protocol_days,
            withdrawal_days: form.withdrawal_days,
            diagnosis,
            medication,
            vet_name: form.vet_name.trim() || null,
            notes: form.notes.trim() || null,
            created_by: profile?.id ?? null,
          })
        )
      );
      if (medication) {
        try {
          await saveMastitisProtocolIfNew(medication, profile?.id ?? null);
        } catch {
          // Protokol kaydi ikincil bir islem, tedavi kaydi zaten basarili oldu.
        }
      }
      router.push("/treatments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilirken bir hata olustu.");
      setSubmitting(false);
    }
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

        <FieldBlock label="Meme * (birden fazla secilebilir)">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["on_sol", "On Sol"],
                ["on_sag", "On Sag"],
                ["arka_sol", "Arka Sol"],
                ["arka_sag", "Arka Sag"],
              ] as [UdderQuarter, string][]
            ).map(([value, label]) => (
              <label
                key={value}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  udderQuarters.includes(value)
                    ? "border-green-600 bg-green-50 text-green-800"
                    : "border-neutral-300 text-neutral-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={udderQuarters.includes(value)}
                  onChange={() => toggleUdderQuarter(value)}
                  className="h-4 w-4"
                />
                {label}
              </label>
            ))}
          </div>
          {udderQuarters.length > 1 && (
            <p className="mt-1 text-xs text-neutral-500">
              Secilen her meme icin ayri bir tedavi kaydi olusturulacak.
            </p>
          )}
        </FieldBlock>

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

        <FieldBlock label="Tani *">
          <div className="flex flex-wrap gap-2">
            {[...DIAGNOSIS_OPTIONS, "Diger" as const].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDiagnosisOption(option)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  diagnosisOption === option
                    ? "border-green-600 bg-green-50 text-green-800"
                    : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {option === "Diger" ? "Diger..." : option}
              </button>
            ))}
          </div>
          {diagnosisOption === "Diger" && (
            <input
              value={diagnosisCustom}
              onChange={(e) => setDiagnosisCustom(e.target.value)}
              placeholder="Hastalik adini yazin"
              className="input mt-2"
            />
          )}
        </FieldBlock>

        <FieldBlock label="Ilac / Tedavi Protokolu">
          {protocols.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {protocols.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => update("medication", p.medication)}
                  title={p.medication}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    form.medication === p.medication
                      ? "border-green-600 bg-green-50 text-green-800"
                      : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {p.medication.length > 40 ? `${p.medication.slice(0, 40)}...` : p.medication}
                </button>
              ))}
            </div>
          )}
          <textarea
            value={form.medication}
            onChange={(e) => update("medication", e.target.value)}
            placeholder="Tedavi protokolunu yazin (yeni ise kaydedilip bir sonraki seferde tek tikla secilebilir)"
            className="input"
            rows={2}
          />
        </FieldBlock>

        <FieldBlock label="Veteriner">
          <div className="flex flex-wrap gap-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => update("vet_name", p.full_name)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  form.vet_name === p.full_name
                    ? "border-green-600 bg-green-50 text-green-800"
                    : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {p.full_name}
              </button>
            ))}
          </div>
        </FieldBlock>

        <Field label="Notlar">
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="input" rows={3} />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !form.animal_id || udderQuarters.length === 0 || !diagnosis}
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
