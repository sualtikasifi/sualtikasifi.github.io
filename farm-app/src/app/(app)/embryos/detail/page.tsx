"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getAnimal, getEmbryo, getOpuSession, listAnimals, updateEmbryo } from "@/lib/data";
import { Animal, Embryo, EmbryoGrade, EmbryoStage, EmbryoStatus, OpuSession } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { EarTagPicker } from "@/components/EarTagPicker";

export default function EmbryoDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Yükleniyor...</p>}>
      <EmbryoDetailContent />
    </Suspense>
  );
}

function EmbryoDetailContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const [embryo, setEmbryo] = useState<Embryo | null>(null);
  const [session, setSession] = useState<OpuSession | null>(null);
  const [donor, setDonor] = useState<Animal | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [grade, setGrade] = useState<EmbryoGrade | "">("");
  const [stage, setStage] = useState<EmbryoStage | "">("");
  const [dayReached, setDayReached] = useState("");
  const [status, setStatus] = useState<EmbryoStatus>("gelisiyor");
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [transferDate, setTransferDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!id) return;
    getEmbryo(id).then(async (e) => {
      if (!e) {
        setLoading(false);
        return;
      }
      setEmbryo(e);
      setGrade(e.grade ?? "");
      setStage(e.stage ?? "");
      setDayReached(e.day_reached ? String(e.day_reached) : "");
      setStatus(e.status);
      setRecipientId(e.recipient_animal_id);
      setTransferDate(e.transfer_date ?? new Date().toISOString().slice(0, 10));
      setNotes(e.notes ?? "");

      const [s, all] = await Promise.all([getOpuSession(e.opu_session_id), listAnimals()]);
      setSession(s ?? null);
      setAnimals(all);
      if (s) setDonor((await getAnimal(s.donor_animal_id)) ?? null);
      setLoading(false);
    });
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!embryo) return;
    setSaving(true);
    const updated = await updateEmbryo(embryo.id, {
      grade: grade || null,
      stage: stage || null,
      day_reached: dayReached ? Number(dayReached) : null,
      status,
      recipient_animal_id: status === "transfer_edildi" ? recipientId : null,
      transfer_date: status === "transfer_edildi" ? transferDate || null : null,
      notes: notes.trim() || null,
    });
    if (updated) setEmbryo(updated);
    setSaving(false);
  }

  if (!id) return <p className="text-sm text-red-600">Embriyo belirtilmedi.</p>;
  if (loading) return <p className="text-sm text-neutral-500">Yükleniyor...</p>;
  if (!embryo) return <p className="text-sm text-red-600">Kayıt bulunamadı.</p>;

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Embriyo {embryo.label}</h1>
        <p className="text-sm text-neutral-500">
          Donör: {donor?.ear_tag ?? "?"} &middot;{" "}
          {session && (
            <Link href={`/opu/detail?id=${session.id}`} className="text-green-700 hover:underline">
              OPU seansına git
            </Link>
          )}
        </p>
        <div className="mt-1">
          <Badge value={embryo.status} />
        </div>
      </div>

      <form onSubmit={handleSave} className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Grade (kalite)">
            <select value={grade} onChange={(e) => setGrade(e.target.value as EmbryoGrade)} className="input">
              <option value="">Seçilmedi</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </Field>
          <Field label="Gün (Dx)">
            <input type="number" min={0} value={dayReached} onChange={(e) => setDayReached(e.target.value)} className="input" />
          </Field>
        </div>

        <Field label="Gelişim aşaması">
          <select value={stage} onChange={(e) => setStage(e.target.value as EmbryoStage)} className="input">
            <option value="">Seçilmedi</option>
            <option value="morula">Morula</option>
            <option value="erken_blastosist">Erken Blastosist</option>
            <option value="blastosist">Blastosist</option>
            <option value="genisleyen_blastosist">Genişleyen Blastosist</option>
            <option value="yumurtadan_cikan_blastosist">Yumurtadan Çıkan Blastosist</option>
          </select>
        </Field>

        <Field label="Durum">
          <select value={status} onChange={(e) => setStatus(e.target.value as EmbryoStatus)} className="input">
            <option value="gelisiyor">Gelişiyor</option>
            <option value="dondu">Donduruldu</option>
            <option value="transfer_edildi">Transfer edildi</option>
            <option value="atildi">Atıldı</option>
          </select>
        </Field>

        {status === "transfer_edildi" && (
          <>
            <FieldBlock label="Alıcı hayvan">
              <EarTagPicker
                animals={animals}
                selectedId={recipientId}
                onSelect={(id) => setRecipientId(id)}
                onClear={() => setRecipientId(null)}
              />
            </FieldBlock>

            <Field label="Transfer tarihi">
              <input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} className="input" />
            </Field>
          </>
        )}

        <Field label="Notlar">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={3} />
        </Field>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Kaydediliyor..." : "Kaydet"}
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
