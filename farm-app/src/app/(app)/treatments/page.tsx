"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listAnimals, listMastitisTreatments, listProfiles } from "@/lib/data";
import { Animal, MastitisTreatment, Profile } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { MastitisTreatmentCard } from "@/components/MastitisTreatmentCard";
import { PageHeader } from "@/components/PageHeader";

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
      <PageHeader
        icon="💉"
        title="Mastitler"
        subtitle="Meme bazlı tedavi ve arınma takibi"
        color="rose"
        actions={
          hasPermission(profile, "can_manage_mastitis") && (
            <Link href="/treatments/new" className="btn-primary">
              + Yeni mastitis kaydı
            </Link>
          )
        }
      />

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
              canManage={hasPermission(profile, "can_manage_mastitis")}
              onDeleted={() => setTreatments((prev) => prev.filter((x) => x.id !== t.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
