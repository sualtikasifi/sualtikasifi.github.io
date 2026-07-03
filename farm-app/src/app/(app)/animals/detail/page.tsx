"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getAnimal,
  listAnimals,
  listBulls,
  listEmbryosForRecipient,
  listInseminations,
  listOpuSessions,
  listTreatments,
  updateAnimal,
} from "@/lib/data";
import { Animal, AnimalStatus, Bull, Embryo, Insemination, OpuSession, Treatment } from "@/lib/types";
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
  const [inseminations, setInseminations] = useState<Insemination[]>([]);
  const [bulls, setBulls] = useState<Bull[]>([]);
  const [donorSessions, setDonorSessions] = useState<OpuSession[]>([]);
  const [receivedEmbryos, setReceivedEmbryos] = useState<Embryo[]>([]);
  const [opuSessions, setOpuSessions] = useState<OpuSession[]>([]);
  const [allAnimals, setAllAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getAnimal(id),
      listTreatments(id),
      listInseminations(id),
      listBulls(),
      listOpuSessions(),
      listEmbryosForRecipient(id),
      listAnimals(),
    ]).then(([a, t, ins, b, sessions, received, animals]) => {
      setAnimal(a ?? null);
      setTreatments(t);
      setInseminations(ins);
      setBulls(b);
      setOpuSessions(sessions);
      setDonorSessions(sessions.filter((s) => s.donor_animal_id === id));
      setReceivedEmbryos(received);
      setAllAnimals(animals);
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
        <div className="flex gap-2">
          <Link
            href={`/inseminations/new?animalId=${animal.id}`}
            className="rounded-md border border-green-700 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50"
          >
            Tohumlama ekle
          </Link>
          <Link
            href={`/treatments/new?animalId=${animal.id}`}
            className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800"
          >
            Tedavi ekle
          </Link>
        </div>
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

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-800">Tohumlama gecmisi</h2>
        {inseminations.length === 0 ? (
          <p className="text-sm text-neutral-400">Kayit yok.</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {inseminations.map((i) => (
              <div key={i.id} className="py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-neutral-700">
                    {bulls.find((b) => b.id === i.bull_id)?.name ?? "-"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400">{formatDate(i.insemination_date)}</span>
                    <Badge value={i.pregnancy_result} />
                  </div>
                </div>
                {i.technician_name && <p className="text-neutral-500">Teknisyen: {i.technician_name}</p>}
                {i.notes && <p className="text-neutral-500">{i.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {donorSessions.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-neutral-800">Donor oldugu OPU seanslari</h2>
          <div className="divide-y divide-neutral-100">
            {donorSessions.map((s) => (
              <Link
                key={s.id}
                href={`/opu/detail?id=${s.id}`}
                className="flex items-center justify-between py-2 text-sm hover:bg-neutral-50"
              >
                <span>{s.oocyte_count ?? "-"} oosit</span>
                <span className="text-neutral-400">{formatDate(s.session_date)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {receivedEmbryos.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-neutral-800">Alici olarak transfer edilen embriyolar</h2>
          <div className="divide-y divide-neutral-100">
            {receivedEmbryos.map((e) => (
              <Link
                key={e.id}
                href={`/embryos/detail?id=${e.id}`}
                className="flex items-center justify-between py-2 text-sm hover:bg-neutral-50"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{e.label}</span>
                  <span className="text-xs text-neutral-500">
                    (donor: {(() => {
                      const session = opuSessions.find((s) => s.id === e.opu_session_id);
                      const donorAnimal = session && allAnimals.find((a) => a.id === session.donor_animal_id);
                      return donorAnimal?.ear_tag ?? "-";
                    })()})
                  </span>
                </div>
                <span className="text-neutral-400">{formatDate(e.transfer_date)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
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
