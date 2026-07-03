"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listAnimals, listMastitisTreatments, listProfiles } from "@/lib/data";
import { Animal, MastitisTreatment, Profile } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { MastitisTreatmentCard } from "@/components/MastitisTreatmentCard";

export default function MastitisPage() {
  const { profile } = useAuth();
  const [treatments, setTreatments] = useState<MastitisTreatment[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listMastitisTreatments(), listAnimals(), listProfiles()]).then(([t, a, p]) => {
      setTreatments(t);
      setAnimals(a);
      setProfiles(p);
      setLoading(false);
    });
  }, []);

  const earTagFor = (animalId: string) => animals.find((a) => a.id === animalId)?.ear_tag ?? "?";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Mastitler</h1>
        <Link href="/treatments/new" className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-800">
          Yeni mastitis kaydı
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : treatments.length === 0 ? (
        <p className="text-sm text-neutral-400">Kayıt yok.</p>
      ) : (
        <div className="space-y-3">
          {treatments.map((t) => (
            <MastitisTreatmentCard
              key={t.id}
              treatmentId={t.id}
              earTag={earTagFor(t.animal_id)}
              profiles={profiles}
              currentProfileId={profile?.id ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
