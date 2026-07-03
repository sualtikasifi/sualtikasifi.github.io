"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getAnimal, getOpuSession, listEmbryos, updateOpuSession } from "@/lib/data";
import { Animal, Embryo, OpuSession } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { OpuFunnel } from "@/components/OpuFunnel";
import { formatDate } from "@/lib/format";
import { OPU_STAGE_INFO, OpuStage as Stage, opuStageFor as stageFor } from "@/lib/opuStage";

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
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!id) return;
    getOpuSession(id).then((s) => {
      if (!s) {
        setLoading(false);
        return;
      }
      setSession(s);
      Promise.all([getAnimal(s.donor_animal_id), listEmbryos(s.id)]).then(([d, e]) => {
        setDonor(d ?? null);
        setEmbryos(e);
        setLoading(false);
      });
    });
  }, [id]);

  if (!id) return <p className="text-sm text-red-600">OPU seansi belirtilmedi.</p>;
  if (loading) return <p className="text-sm text-neutral-500">Yukleniyor...</p>;
  if (!session) return <p className="text-sm text-red-600">Kayit bulunamadi.</p>;

  const stage = stageFor(session);

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

      {editing ? (
        <EditAllForm
          session={session}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setSession(updated);
            setEditing(false);
          }}
        />
      ) : (
        <StageCard
          key={stage}
          session={session}
          stage={stage}
          onSaved={(updated) => setSession(updated)}
          onEditAll={() => setEditing(true)}
        />
      )}

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

function StageCard({
  session,
  stage,
  onSaved,
  onEditAll,
}: {
  session: OpuSession;
  stage: Stage;
  onSaved: (s: OpuSession) => void;
  onEditAll: () => void;
}) {
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState(session.notes ?? "");
  const [saving, setSaving] = useState(false);

  if (stage === "done") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="text-sm font-medium text-green-800">Tüm laboratuvar aşamaları tamamlandı.</p>
        <button onClick={onEditAll} className="mt-2 text-xs text-green-700 underline hover:no-underline">
          Bilgileri düzelt
        </button>
      </div>
    );
  }

  const q = OPU_STAGE_INFO[stage];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim() === "") return;
    setSaving(true);
    const updated = await updateOpuSession(session.id, {
      [q.field]: Number(value),
      notes: notes.trim() || null,
    });
    if (updated) onSaved(updated);
    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-amber-700">{q.title}</p>
        <label className="mt-1 block text-sm font-medium text-neutral-800">{q.question}</label>
      </div>
      <input
        type="number"
        min={0}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="input"
        placeholder="Sayi gir"
      />
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">Not (opsiyonel)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || value.trim() === ""}
          className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
        <button type="button" onClick={onEditAll} className="text-xs text-neutral-500 underline hover:no-underline">
          Tum bilgileri duzenle
        </button>
      </div>
    </form>
  );
}

function EditAllForm({
  session,
  onCancel,
  onSaved,
}: {
  session: OpuSession;
  onCancel: () => void;
  onSaved: (s: OpuSession) => void;
}) {
  const [technicianName, setTechnicianName] = useState(session.technician_name ?? "");
  const [follicleRight, setFollicleRight] = useState(
    session.follicle_count_right !== null ? String(session.follicle_count_right) : ""
  );
  const [follicleLeft, setFollicleLeft] = useState(
    session.follicle_count_left !== null ? String(session.follicle_count_left) : ""
  );
  const [oocyteCount, setOocyteCount] = useState(session.oocyte_count !== null ? String(session.oocyte_count) : "");
  const [cleavedCount, setCleavedCount] = useState(
    session.cleaved_count !== null ? String(session.cleaved_count) : ""
  );
  const [embryoCount, setEmbryoCount] = useState(
    session.embryo_count !== null ? String(session.embryo_count) : ""
  );
  const [notes, setNotes] = useState(session.notes ?? "");
  const [saving, setSaving] = useState(false);

  function toNullableNumber(value: string): number | null {
    return value.trim() === "" ? null : Number(value);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
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
    setSaving(false);
    if (updated) onSaved(updated);
  }

  return (
    <form onSubmit={handleSave} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800">Tum bilgileri duzenle</h2>
        <button type="button" onClick={onCancel} className="text-xs text-neutral-500 underline hover:no-underline">
          Geri don
        </button>
      </div>

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
