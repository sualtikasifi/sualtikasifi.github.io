"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getAnimal, getOpuSession, listEmbryos, updateOpuSession } from "@/lib/data";
import { Animal, Embryo, OpuSession } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { OpuFunnel } from "@/components/OpuFunnel";
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
  const [saving, setSaving] = useState(false);

  const [technicianName, setTechnicianName] = useState("");
  const [follicleRight, setFollicleRight] = useState("");
  const [follicleLeft, setFollicleLeft] = useState("");
  const [oocyteCount, setOocyteCount] = useState("");
  const [cleavedCount, setCleavedCount] = useState("");
  const [embryoCount, setEmbryoCount] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!id) return;
    getOpuSession(id).then(async (s) => {
      if (!s) {
        setLoading(false);
        return;
      }
      setSession(s);
      setTechnicianName(s.technician_name ?? "");
      setFollicleRight(s.follicle_count_right !== null ? String(s.follicle_count_right) : "");
      setFollicleLeft(s.follicle_count_left !== null ? String(s.follicle_count_left) : "");
      setOocyteCount(s.oocyte_count !== null ? String(s.oocyte_count) : "");
      setCleavedCount(s.cleaved_count !== null ? String(s.cleaved_count) : "");
      setEmbryoCount(s.embryo_count !== null ? String(s.embryo_count) : "");
      setNotes(s.notes ?? "");

      const [d, e] = await Promise.all([getAnimal(s.donor_animal_id), listEmbryos(s.id)]);
      setDonor(d ?? null);
      setEmbryos(e);
      setLoading(false);
    });
  }, [id]);

  function toNullableNumber(value: string): number | null {
    return value.trim() === "" ? null : Number(value);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSaving(true);
    const updated = await updateOpuSession(session.id, {
      technician_name: technicianName.trim() || null,
      follicle_count_right: toNullableNumber(follicleRight),
      follicle_count_left: toNullableNumber(follicleLeft),
      oocyte_count: toNullableNumber(oocyteCount),
      cleaved_count: toNullableNumber(cleavedCount),
      embryo_count: toNullableNumber(embryoCount),
      notes: notes.trim() || null,
    });
    if (updated) setSession(updated);
    setSaving(false);
  }

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

      <OpuFunnel session={session} />

      <form onSubmit={handleSave} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-800">Laboratuvar kayitlari</h2>
        <p className="text-xs text-neutral-400">
          OPU gunu folikul/oosit sayilarini gir, birkac gun sonra bolunme ve embriyo sayilarini geldikce guncelle.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Sag folikul">
            <input type="number" min={0} value={follicleRight} onChange={(e) => setFollicleRight(e.target.value)} className="input" />
          </Field>
          <Field label="Sol folikul">
            <input type="number" min={0} value={follicleLeft} onChange={(e) => setFollicleLeft(e.target.value)} className="input" />
          </Field>
        </div>

        <Field label="Toplanan oosit sayisi">
          <input type="number" min={0} value={oocyteCount} onChange={(e) => setOocyteCount(e.target.value)} className="input" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Bolunen (cleavage) sayisi">
            <input type="number" min={0} value={cleavedCount} onChange={(e) => setCleavedCount(e.target.value)} className="input" />
          </Field>
          <Field label="Embriyoya donusen sayi">
            <input type="number" min={0} value={embryoCount} onChange={(e) => setEmbryoCount(e.target.value)} className="input" />
          </Field>
        </div>

        <Field label="Teknisyen">
          <input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} className="input" />
        </Field>

        <Field label="Notlar">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={3} />
        </Field>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </form>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-800">
          Embriyolar (tek tek etiketlenenler) &middot; {embryos.length}
        </h2>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  );
}
