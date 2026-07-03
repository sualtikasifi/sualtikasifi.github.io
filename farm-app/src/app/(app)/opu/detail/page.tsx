"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getAnimal, getOpuSession, listEmbryos } from "@/lib/data";
import { Animal, Embryo, OpuSession } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/format";

export default function OpuSessionDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Yukleniyor...</p>}>
      <OpuSessionDetailContent />
    </Suspense>
  );
}

function OpuSessionDetailContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const [session, setSession] = useState<OpuSession | null>(null);
  const [donor, setDonor] = useState<Animal | null>(null);
  const [embryos, setEmbryos] = useState<Embryo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getOpuSession(id).then(async (s) => {
      setSession(s ?? null);
      if (s) {
        const [d, e] = await Promise.all([getAnimal(s.donor_animal_id), listEmbryos(s.id)]);
        setDonor(d ?? null);
        setEmbryos(e);
      }
      setLoading(false);
    });
  }, [id]);

  if (!id) return <p className="text-sm text-red-600">OPU seansi belirtilmedi.</p>;
  if (loading) return <p className="text-sm text-neutral-500">Yukleniyor...</p>;
  if (!session) return <p className="text-sm text-red-600">Kayit bulunamadi.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">
            OPU: {donor?.ear_tag ?? "?"} {donor?.name && <span className="text-neutral-500">({donor.name})</span>}
          </h1>
          <p className="text-sm text-neutral-500">{formatDate(session.session_date)}</p>
        </div>
        <Link
          href={`/opu/embryos/new?sessionId=${session.id}`}
          className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800"
        >
          Embriyo ekle
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 bg-white p-4 text-sm sm:grid-cols-3">
        <InfoItem label="Teknisyen" value={session.technician_name ?? "-"} />
        <InfoItem label="Toplanan oosit" value={String(session.oocyte_count ?? "-")} />
        <InfoItem label="Embriyo sayisi" value={String(embryos.length)} />
        <InfoItem label="Notlar" value={session.notes ?? "-"} span />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-800">Embriyolar</h2>
        {embryos.length === 0 ? (
          <p className="text-sm text-neutral-400">Henuz embriyo eklenmedi.</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {embryos.map((e) => (
              <Link
                key={e.id}
                href={`/embryos/detail?id=${e.id}`}
                className="flex items-center justify-between py-2 text-sm hover:bg-neutral-50"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{e.label}</span>
                  {e.grade && <span className="text-xs text-neutral-500">Grade {e.grade}</span>}
                  {e.stage && <Badge value={e.stage} />}
                </div>
                <div className="flex items-center gap-2">
                  {e.day_reached && <span className="text-xs text-neutral-400">D{e.day_reached}</span>}
                  <Badge value={e.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "col-span-2 sm:col-span-3" : undefined}>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="text-neutral-800">{value}</p>
    </div>
  );
}
