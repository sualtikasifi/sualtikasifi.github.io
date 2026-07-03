"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getAnimal, listTreatments, updateAnimal } from "@/lib/data";
import { Animal, AnimalStatus, Treatment } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/format";

export default function AnimalDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Yukleniyor...</p>}>
      <AnimalDetailContent />
    </Suspense>
  );
}

function AnimalDetailContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getAnimal(id), listTreatments(id)]).then(([a, t]) => {
      setAnimal(a ?? null);
      setTreatments(t);
      setLoading(false);
    });
  }, [id]);

  async function handleStatusChange(status: AnimalStatus) {
    if (!animal) return;
    const updated = await updateAnimal(animal.id, { status });
    if (updated) setAnimal(updated);
  }

  async function handleWean() {
    if (!animal) return;
    const updated = await updateAnimal(animal.id, { weaned_at: new Date().toISOString().slice(0, 10) });
    if (updated) setAnimal(updated);
  }

  if (!id) return <p className="text-sm text-red-600">Hayvan belirtilmedi.</p>;
  if (loading) return <p className="text-sm text-neutral-500">Yukleniyor...</p>;
  if (!animal) return <p className="text-sm text-red-600">Hayvan bulunamadi.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">
            {animal.ear_tag} {animal.name && <span className="text-neutral-500">({animal.name})</span>}
          </h1>
          <div className="mt-1"><Badge value={animal.status} /></div>
        </div>
        <Link
          href={`/treatments/new?animalId=${animal.id}`}
          className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800"
        >
          Tedavi ekle
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 bg-white p-4 text-sm sm:grid-cols-4">
        <InfoItem label="Dogum tarihi" value={formatDate(animal.birth_date)} />
        <InfoItem label="Irk" value={animal.breed ?? "-"} />
        <InfoItem label="Cinsiyet" value={animal.gender === "erkek" ? "Erkek" : "Disi"} />
        <InfoItem label="Anne kupe no" value={animal.mother_ear_tag ?? "-"} />
        <InfoItem label="Sutten kesim" value={formatDate(animal.weaned_at)} />
        <InfoItem label="Notlar" value={animal.notes ?? "-"} span />
      </div>

      <div className="flex flex-wrap gap-2">
        {!animal.weaned_at && (
          <button onClick={handleWean} className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-50">
            Sutten kesildi olarak isaretle
          </button>
        )}
        {animal.status !== "olu" && (
          <button
            onClick={() => handleStatusChange("olu")}
            className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
          >
            Olum kaydet
          </button>
        )}
        {animal.status !== "satildi" && animal.status === "aktif" && (
          <button
            onClick={() => handleStatusChange("satildi")}
            className="rounded-md border border-blue-300 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50"
          >
            Satildi olarak isaretle
          </button>
        )}
        {animal.status !== "aktif" && (
          <button
            onClick={() => handleStatusChange("aktif")}
            className="rounded-md border border-green-300 px-3 py-1.5 text-xs text-green-700 hover:bg-green-50"
          >
            Aktif yap
          </button>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-800">Tedavi gecmisi</h2>
        {treatments.length === 0 ? (
          <p className="text-sm text-neutral-400">Kayit yok.</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {treatments.map((t) => (
              <div key={t.id} className="py-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge value={t.category} />
                    {t.udder_quarter && <span className="text-xs text-neutral-500">({udderLabel(t.udder_quarter)})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400">{formatDate(t.treatment_date)}</span>
                    <Badge value={t.outcome} />
                  </div>
                </div>
                <p className="mt-1 text-neutral-700">{t.diagnosis}</p>
                {t.medication && <p className="text-neutral-500">Ilac: {t.medication} {t.dose && `(${t.dose})`}</p>}
                {t.notes && <p className="text-neutral-500">{t.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function udderLabel(q: string) {
  return { on_sol: "On Sol", on_sag: "On Sag", arka_sol: "Arka Sol", arka_sag: "Arka Sag" }[q] ?? q;
}

function InfoItem({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "col-span-2 sm:col-span-4" : undefined}>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="text-neutral-800">{value}</p>
    </div>
  );
}
