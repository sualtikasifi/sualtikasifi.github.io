"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  deleteOpuSession,
  getAnimal,
  getOpuSession,
  listBulls,
  listEmbryos,
  listOpuSessions,
  listSemenInventory,
  updateOpuSession,
} from "@/lib/data";
import { Animal, Bull, Embryo, OpuSession, SemenInventory, SemenType } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { OpuFunnel } from "@/components/OpuFunnel";
import { formatDate } from "@/lib/format";
import { OPU_STAGE_INFO, OpuStage as Stage, opuStageFor as stageFor } from "@/lib/opuStage";

export default function OpuSessionDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Yükleniyor...</p>}>
      <OpuSessionDetailContent />
    </Suspense>
  );
}

function OpuSessionDetailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const [session, setSession] = useState<OpuSession | null>(null);
  const [donor, setDonor] = useState<Animal | null>(null);
  const [embryos, setEmbryos] = useState<Embryo[]>([]);
  const [priorSessions, setPriorSessions] = useState<OpuSession[]>([]);
  const [bulls, setBulls] = useState<Bull[]>([]);
  const [inventory, setInventory] = useState<SemenInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!session) return;
    setDeleting(true);
    await deleteOpuSession(session.id);
    router.push("/opu");
  }

  useEffect(() => {
    if (!id) return;
    getOpuSession(id).then((s) => {
      if (!s) {
        setLoading(false);
        return;
      }
      setSession(s);
      Promise.all([
        getAnimal(s.donor_animal_id),
        listEmbryos(s.id),
        listOpuSessions(),
        listBulls(),
        listSemenInventory(),
      ]).then(([d, e, allSessions, b, inv]) => {
        setDonor(d ?? null);
        setEmbryos(e);
        setPriorSessions(
          allSessions
            .filter((other) => other.donor_animal_id === s.donor_animal_id && other.id !== s.id)
            .sort((a, b) => b.session_date.localeCompare(a.session_date))
        );
        setBulls(b);
        setInventory(inv);
        setLoading(false);
      });
    });
  }, [id]);

  if (!id) return <p className="text-sm text-red-600">OPU seansı belirtilmedi.</p>;
  if (loading) return <p className="text-sm text-neutral-500">Yükleniyor...</p>;
  if (!session) return <p className="text-sm text-red-600">Kayıt bulunamadı.</p>;

  const stage = stageFor(session);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">
            OPU: {donor?.ear_tag ?? "?"} {donor?.name && <span className="text-neutral-500">({donor.name})</span>}
          </h1>
          <p className="text-sm text-neutral-500">
            {formatDate(session.session_date)}
            {session.session_time && ` · ${session.session_time.slice(0, 5)}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-xs font-medium text-red-600 hover:underline"
          >
            Sil
          </button>
          <Link
            href={`/opu/embryos/new?sessionId=${session.id}`}
            className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-800"
          >
            Embriyo ekle
          </Link>
        </div>
      </div>

      {confirmingDelete && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">
            Bu OPU seansını ve bağlı embriyo kayıtlarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? "Siliniyor..." : "Evet, sil"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs transition-colors hover:bg-neutral-50"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      <OpuFunnel session={session} />

      {editing ? (
        <EditAllForm
          session={session}
          bulls={bulls}
          inventory={inventory}
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
          bulls={bulls}
          inventory={inventory}
          onSaved={(updated) => setSession(updated)}
          onEditAll={() => setEditing(true)}
        />
      )}

      <div className="card">
        <h2 className="mb-2 text-sm font-semibold text-neutral-800">
          Embriyolar (tek tek etiketlenenler) &middot; {embryos.length}
        </h2>
        {embryos.length === 0 ? (
          <p className="text-sm text-neutral-400">Henüz embriyo eklenmedi.</p>
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

      {priorSessions.length > 0 && (
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold text-neutral-800">
            {donor?.ear_tag ?? "Bu hayvan"}&apos;ın Önceki OPU Kayıtları &middot; {priorSessions.length}
          </h2>
          <div className="divide-y divide-neutral-100">
            {priorSessions.map((p) => {
              const totalFollicles =
                p.follicle_count_right !== null || p.follicle_count_left !== null
                  ? (p.follicle_count_right ?? 0) + (p.follicle_count_left ?? 0)
                  : null;
              return (
                <Link
                  key={p.id}
                  href={`/opu/detail?id=${p.id}`}
                  className="flex items-center justify-between py-2 text-sm hover:bg-neutral-50"
                >
                  <span className="text-neutral-600">
                    {totalFollicles ?? "-"} folikül &middot; {p.oocyte_count ?? "-"} oosit &middot;{" "}
                    {p.cleaved_count ?? "-"} bölünen &middot; {p.embryo_count ?? "-"} embriyo
                  </span>
                  <span className="text-xs text-neutral-400">
                    {formatDate(p.session_date)}
                    {p.session_time && ` · ${p.session_time.slice(0, 5)}`}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SemenPicker({
  bulls,
  inventory,
  bullId,
  semenType,
  onChangeBull,
  onChangeSemenType,
}: {
  bulls: Bull[];
  inventory: SemenInventory[];
  bullId: string;
  semenType: SemenType;
  onChangeBull: (id: string) => void;
  onChangeSemenType: (t: SemenType) => void;
}) {
  function stockFor(id: string, type: SemenType) {
    const row = inventory.find((i) => i.bull_id === id && i.semen_type === type);
    return (row?.straw_count ?? 0) + (row?.tank_straw_count ?? 0);
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">Boğa</span>
        <select value={bullId} onChange={(e) => onChangeBull(e.target.value)} className="input">
          <option value="">Seçilmedi</option>
          {bulls.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.breed && `(${b.breed})`}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">Sperma türü</span>
        <select
          value={semenType}
          onChange={(e) => onChangeSemenType(e.target.value as SemenType)}
          disabled={!bullId}
          className="input"
        >
          <option value="konvansiyonel">Konvansiyonel {bullId && `(${stockFor(bullId, "konvansiyonel")} straw)`}</option>
          <option value="disi">Dişi {bullId && `(${stockFor(bullId, "disi")} straw)`}</option>
        </select>
      </label>
    </div>
  );
}

function StageCard({
  session,
  stage,
  bulls,
  inventory,
  onSaved,
  onEditAll,
}: {
  session: OpuSession;
  stage: Stage;
  bulls: Bull[];
  inventory: SemenInventory[];
  onSaved: (s: OpuSession) => void;
  onEditAll: () => void;
}) {
  const [value, setValue] = useState("");
  const [gradeA, setGradeA] = useState("");
  const [gradeB, setGradeB] = useState("");
  const [gradeC, setGradeC] = useState("");
  const [gradeD, setGradeD] = useState("");
  const [fertilizationBullId, setFertilizationBullId] = useState(session.fertilization_bull_id ?? "");
  const [fertilizationSemenType, setFertilizationSemenType] = useState<SemenType>(
    session.fertilization_semen_type ?? "konvansiyonel"
  );
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

  function toNullableNumber(v: string): number | null {
    return v.trim() === "" ? null : Number(v);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim() === "") return;
    setSaving(true);
    const updated = await updateOpuSession(session.id, {
      [q.field]: Number(value),
      ...(stage === "oocyte"
        ? {
            oocyte_grade_a: toNullableNumber(gradeA),
            oocyte_grade_b: toNullableNumber(gradeB),
            oocyte_grade_c: toNullableNumber(gradeC),
            oocyte_grade_d: toNullableNumber(gradeD),
          }
        : {}),
      ...(stage === "cleaved"
        ? {
            fertilization_bull_id: fertilizationBullId || null,
            fertilization_semen_type: fertilizationBullId ? fertilizationSemenType : null,
          }
        : {}),
      notes: notes.trim() || null,
    });
    if (updated) onSaved(updated);
    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
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
        placeholder="Sayı gir"
      />

      {stage === "oocyte" && (
        <div>
          <span className="mb-1 block text-xs font-medium text-neutral-600">Oosit kalitesi (opsiyonel)</span>
          <div className="grid grid-cols-4 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-500">A Kalite</span>
              <input type="number" min={0} value={gradeA} onChange={(e) => setGradeA(e.target.value)} className="input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-500">B Kalite</span>
              <input type="number" min={0} value={gradeB} onChange={(e) => setGradeB(e.target.value)} className="input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-500">C Kalite</span>
              <input type="number" min={0} value={gradeC} onChange={(e) => setGradeC(e.target.value)} className="input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-500">D Kalite</span>
              <input type="number" min={0} value={gradeD} onChange={(e) => setGradeD(e.target.value)} className="input" />
            </label>
          </div>
        </div>
      )}

      {stage === "cleaved" && value.trim() !== "" && (
        <div>
          <span className="mb-1 block text-xs font-medium text-neutral-600">Hangi sperma ile fertilize edildi?</span>
          <SemenPicker
            bulls={bulls}
            inventory={inventory}
            bullId={fertilizationBullId}
            semenType={fertilizationSemenType}
            onChangeBull={setFertilizationBullId}
            onChangeSemenType={setFertilizationSemenType}
          />
        </div>
      )}

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">Not (opsiyonel)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving || value.trim() === ""} className="btn-primary">
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
        <button type="button" onClick={onEditAll} className="text-xs text-neutral-500 underline hover:no-underline">
          Tüm bilgileri düzenle
        </button>
      </div>
    </form>
  );
}

function EditAllForm({
  session,
  bulls,
  inventory,
  onCancel,
  onSaved,
}: {
  session: OpuSession;
  bulls: Bull[];
  inventory: SemenInventory[];
  onCancel: () => void;
  onSaved: (s: OpuSession) => void;
}) {
  const [sessionDate, setSessionDate] = useState(session.session_date);
  const [sessionTime, setSessionTime] = useState(session.session_time ?? "");
  const [technicianName, setTechnicianName] = useState(session.technician_name ?? "");
  const [follicleRight, setFollicleRight] = useState(
    session.follicle_count_right !== null ? String(session.follicle_count_right) : ""
  );
  const [follicleLeft, setFollicleLeft] = useState(
    session.follicle_count_left !== null ? String(session.follicle_count_left) : ""
  );
  const [oocyteCount, setOocyteCount] = useState(session.oocyte_count !== null ? String(session.oocyte_count) : "");
  const [gradeA, setGradeA] = useState(session.oocyte_grade_a !== null ? String(session.oocyte_grade_a) : "");
  const [gradeB, setGradeB] = useState(session.oocyte_grade_b !== null ? String(session.oocyte_grade_b) : "");
  const [gradeC, setGradeC] = useState(session.oocyte_grade_c !== null ? String(session.oocyte_grade_c) : "");
  const [gradeD, setGradeD] = useState(session.oocyte_grade_d !== null ? String(session.oocyte_grade_d) : "");
  const [cleavedCount, setCleavedCount] = useState(
    session.cleaved_count !== null ? String(session.cleaved_count) : ""
  );
  const [fertilizationBullId, setFertilizationBullId] = useState(session.fertilization_bull_id ?? "");
  const [fertilizationSemenType, setFertilizationSemenType] = useState<SemenType>(
    session.fertilization_semen_type ?? "konvansiyonel"
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
      session_date: sessionDate,
      session_time: sessionTime || null,
      technician_name: technicianName.trim() || null,
      follicle_count_right: toNullableNumber(follicleRight),
      follicle_count_left: toNullableNumber(follicleLeft),
      oocyte_count: toNullableNumber(oocyteCount),
      oocyte_grade_a: toNullableNumber(gradeA),
      oocyte_grade_b: toNullableNumber(gradeB),
      oocyte_grade_c: toNullableNumber(gradeC),
      oocyte_grade_d: toNullableNumber(gradeD),
      cleaved_count: toNullableNumber(cleavedCount),
      fertilization_bull_id: fertilizationBullId || null,
      fertilization_semen_type: fertilizationBullId ? fertilizationSemenType : null,
      embryo_count: toNullableNumber(embryoCount),
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (updated) onSaved(updated);
  }

  return (
    <form onSubmit={handleSave} className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800">Tüm bilgileri düzenle</h2>
        <button type="button" onClick={onCancel} className="text-xs text-neutral-500 underline hover:no-underline">
          Geri dön
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tarih">
          <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="input" />
        </Field>
        <Field label="Saat (opsiyonel)">
          <input type="time" value={sessionTime} onChange={(e) => setSessionTime(e.target.value)} className="input" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Sol folikül">
          <input type="number" min={0} value={follicleLeft} onChange={(e) => setFollicleLeft(e.target.value)} className="input" />
        </Field>
        <Field label="Sağ folikül">
          <input type="number" min={0} value={follicleRight} onChange={(e) => setFollicleRight(e.target.value)} className="input" />
        </Field>
      </div>

      <Field label="Toplanan oosit sayısı">
        <input type="number" min={0} value={oocyteCount} onChange={(e) => setOocyteCount(e.target.value)} className="input" />
      </Field>

      <div className="grid grid-cols-4 gap-3">
        <Field label="A Kalite">
          <input type="number" min={0} value={gradeA} onChange={(e) => setGradeA(e.target.value)} className="input" />
        </Field>
        <Field label="B Kalite">
          <input type="number" min={0} value={gradeB} onChange={(e) => setGradeB(e.target.value)} className="input" />
        </Field>
        <Field label="C Kalite">
          <input type="number" min={0} value={gradeC} onChange={(e) => setGradeC(e.target.value)} className="input" />
        </Field>
        <Field label="D Kalite">
          <input type="number" min={0} value={gradeD} onChange={(e) => setGradeD(e.target.value)} className="input" />
        </Field>
      </div>

      <Field label="Bölünen (cleavage) sayısı">
        <input type="number" min={0} value={cleavedCount} onChange={(e) => setCleavedCount(e.target.value)} className="input" />
      </Field>

      <Field label="Hangi sperma ile fertilize edildi?">
        <SemenPicker
          bulls={bulls}
          inventory={inventory}
          bullId={fertilizationBullId}
          semenType={fertilizationSemenType}
          onChangeBull={setFertilizationBullId}
          onChangeSemenType={setFertilizationSemenType}
        />
      </Field>

      <Field label="Embriyoya dönüşen sayı">
        <input type="number" min={0} value={embryoCount} onChange={(e) => setEmbryoCount(e.target.value)} className="input" />
      </Field>

      <Field label="Teknisyen">
        <input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} className="input" />
      </Field>

      <Field label="Notlar">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={3} />
      </Field>

      <button type="submit" disabled={saving} className="btn-primary">
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
