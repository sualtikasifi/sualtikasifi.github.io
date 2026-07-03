"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getAnimal,
  listAnimals,
  listBulls,
  listCalfFeedings,
  listEmbryosForRecipient,
  listInseminations,
  listMastitisTreatments,
  listOpuSessions,
  listProfiles,
  updateAnimal,
} from "@/lib/data";
import { Animal, AnimalStatus, Bull, CalfFeeding, Embryo, Insemination, MastitisTreatment, OpuSession, Profile } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { MastitisTreatmentCard } from "@/components/MastitisTreatmentCard";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export default function AnimalDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Yukleniyor...</p>}>
      <AnimalDetailContent />
    </Suspense>
  );
}

function AnimalDetailContent() {
  const { profile } = useAuth();
  const params = useSearchParams();
  const id = params.get("id");
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [mastitisTreatments, setMastitisTreatments] = useState<MastitisTreatment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [inseminations, setInseminations] = useState<Insemination[]>([]);
  const [bulls, setBulls] = useState<Bull[]>([]);
  const [donorSessions, setDonorSessions] = useState<OpuSession[]>([]);
  const [receivedEmbryos, setReceivedEmbryos] = useState<Embryo[]>([]);
  const [opuSessions, setOpuSessions] = useState<OpuSession[]>([]);
  const [allAnimals, setAllAnimals] = useState<Animal[]>([]);
  const [feedings, setFeedings] = useState<CalfFeeding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getAnimal(id),
      listMastitisTreatments(id),
      listProfiles(),
      listInseminations(id),
      listBulls(),
      listOpuSessions(),
      listEmbryosForRecipient(id),
      listAnimals(),
      listCalfFeedings(id),
    ]).then(([a, mt, p, ins, b, sessions, received, animals, feed]) => {
      setAnimal(a ?? null);
      setMastitisTreatments(mt);
      setProfiles(p);
      setInseminations(ins);
      setBulls(b);
      setOpuSessions(sessions);
      setDonorSessions(sessions.filter((s) => s.donor_animal_id === id));
      setReceivedEmbryos(received);
      setAllAnimals(animals);
      setFeedings(feed);
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
            Mastitis kaydi ekle
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

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-800">Mastitis gecmisi</h2>
        {mastitisTreatments.length === 0 ? (
          <p className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-400">Kayit yok.</p>
        ) : (
          mastitisTreatments.map((t) => (
            <MastitisTreatmentCard
              key={t.id}
              treatmentId={t.id}
              profiles={profiles}
              currentProfileId={profile?.id ?? null}
            />
          ))
        )}
      </div>

      {!animal.weaned_at && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-800">Mama icme gecmisi</h2>
            <Link href="/calves" className="text-xs font-medium text-green-700 hover:underline">
              Buzagilar sayfasina git
            </Link>
          </div>
          {feedings.length === 0 ? (
            <p className="text-sm text-neutral-400">Kayit yok.</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {feedings.map((f) => (
                <div key={f.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          f.drank ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                        }`}
                      >
                        {f.drank ? "✓" : "✗"}
                      </span>
                      <span className="text-neutral-700">{f.drank ? "Icti" : "Icmedi"}</span>
                      {f.notes && <span className="text-neutral-400">- {f.notes}</span>}
                    </div>
                    <span className="text-neutral-400">
                    {new Date(f.fed_at).toLocaleString("tr-TR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    </span>
                  </div>
                  {f.exam_result && (
                    <p className="mt-1 rounded-md bg-neutral-50 px-2 py-1 text-xs text-neutral-600">
                      Muayene sonucu: {f.exam_result}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-800">Tohumlama gecmisi</h2>
        {inseminations.length === 0 ? (
          <p className="text-sm text-neutral-400">Kayit yok.</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {inseminations.map((i) => (
              <div key={i.id} className="py-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-700">
                      {bulls.find((b) => b.id === i.bull_id)?.name ?? "-"}
                    </span>
                    {i.semen_type && <Badge value={i.semen_type} />}
                  </div>
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

function InfoItem({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "col-span-2 sm:col-span-4" : undefined}>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="text-neutral-800">{value}</p>
    </div>
  );
}
