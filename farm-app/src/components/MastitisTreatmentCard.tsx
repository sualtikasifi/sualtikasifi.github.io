"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearMastitisWithdrawal,
  completeMastitisDose,
  deleteMastitisTreatment,
  endMastitisTreatment,
  getMastitisTreatment,
  listMastitisDoses,
  reopenMastitisDose,
  updateMastitisTreatment,
} from "@/lib/data";
import { MastitisDose, MastitisTreatment, Profile, UdderQuarter } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/format";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

interface Props {
  treatmentId: string;
  earTag?: string;
  profiles: Profile[];
  currentProfileId: string | null;
  canManage: boolean;
  onDeleted?: () => void;
}

export function MastitisTreatmentCard({ treatmentId, earTag, profiles, currentProfileId, canManage, onDeleted }: Props) {
  const [treatment, setTreatment] = useState<MastitisTreatment | null>(null);
  const [doses, setDoses] = useState<MastitisDose[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingDoseId, setConfirmingDoseId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [savingDoseId, setSavingDoseId] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [clearingWithdrawal, setClearingWithdrawal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    Promise.all([getMastitisTreatment(treatmentId), listMastitisDoses(treatmentId)]).then(([t, d]) => {
      setTreatment(t ?? null);
      setDoses(d);
      setLoading(false);
    });
  }, [treatmentId]);

  async function refresh() {
    const [t, d] = await Promise.all([getMastitisTreatment(treatmentId), listMastitisDoses(treatmentId)]);
    setTreatment(t ?? null);
    setDoses(d);
  }

  const nameFor = (id: string | null) => profiles.find((p) => p.id === id)?.full_name ?? "-";

  const stats = useMemo(() => {
    if (!treatment) return null;
    const completedCount = doses.filter((d) => d.done).length;
    const isEnded = !!treatment.ended_at;
    const remainingDays = isEnded ? 0 : Math.max(0, treatment.protocol_days - completedCount);

    let withdrawalRemaining = 0;
    let withdrawalComplete = false;
    if (treatment.ended_at) {
      const daysSinceEnd = Math.floor((new Date().getTime() - new Date(treatment.ended_at).getTime()) / MS_PER_DAY);
      withdrawalRemaining = Math.max(0, treatment.withdrawal_days - daysSinceEnd);
      withdrawalComplete = daysSinceEnd >= treatment.withdrawal_days;
    }
    const needsWithdrawalExit = isEnded && withdrawalComplete && !treatment.withdrawal_cleared_at;

    return { completedCount, isEnded, remainingDays, withdrawalRemaining, withdrawalComplete, needsWithdrawalExit };
  }, [treatment, doses]);

  async function toggleDose(dose: MastitisDose) {
    if (dose.done) {
      await reopenMastitisDose(dose.id);
      await refresh();
    } else {
      setConfirmingDoseId(dose.id);
      setNote("");
    }
  }

  async function confirmDose(dose: MastitisDose) {
    if (!currentProfileId) return;
    setSavingDoseId(dose.id);
    await completeMastitisDose(dose.id, currentProfileId, note.trim() || null);
    setSavingDoseId(null);
    setConfirmingDoseId(null);
    setNote("");
    await refresh();
  }

  async function handleEndEarly() {
    setEnding(true);
    await endMastitisTreatment(treatmentId);
    setEnding(false);
    await refresh();
  }

  async function handleClearWithdrawal() {
    if (!currentProfileId) return;
    setClearingWithdrawal(true);
    await clearMastitisWithdrawal(treatmentId, currentProfileId);
    setClearingWithdrawal(false);
    await refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    await deleteMastitisTreatment(treatmentId);
    setDeleting(false);
    setConfirmingDelete(false);
    onDeleted?.();
  }

  if (loading || !treatment || !stats) {
    return <p className="text-sm text-neutral-500">Yükleniyor...</p>;
  }

  if (editing) {
    return (
      <EditMastitisTreatmentForm
        treatment={treatment}
        profiles={profiles}
        onCancel={() => setEditing(false)}
        onSaved={(updated) => {
          setTreatment(updated);
          setEditing(false);
        }}
      />
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="card flex w-full flex-wrap items-center justify-between gap-2 text-left transition-colors hover:bg-neutral-50"
      >
        <div className="flex items-center gap-2">
          {earTag && <span className="font-medium text-neutral-900">{earTag}</span>}
          {treatment.udder_quarters.map((q) => (
            <Badge key={q} value={q} />
          ))}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              stats.isEnded ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {stats.isEnded ? "Tedavi tamamlandı" : `Devam ediyor · Gün ${stats.completedCount}/${treatment.protocol_days}`}
          </span>
          {treatment.diagnosis && <span className="text-sm text-neutral-500">{treatment.diagnosis}</span>}
        </div>
        <span className="text-xs text-neutral-400">{formatDate(treatment.start_date)}</span>
      </button>
    );
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {earTag && <span className="font-medium text-neutral-900">{earTag}</span>}
          {treatment.udder_quarters.map((q) => (
            <Badge key={q} value={q} />
          ))}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              stats.isEnded ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {stats.isEnded ? "Tedavi tamamlandı" : "Devam ediyor"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-xs text-neutral-500 underline hover:no-underline"
          >
            Daralt
          </button>
          <span className="text-xs text-neutral-400">Başlangıç: {formatDate(treatment.start_date)}</span>
        </div>
      </div>

      {treatment.diagnosis && <p className="mt-2 text-sm text-neutral-700">{treatment.diagnosis}</p>}
      {treatment.medication && (
        <p className="text-sm text-neutral-500">
          İlaç: {treatment.medication} {treatment.vet_name && `- ${treatment.vet_name}`}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-neutral-400">Protokol</p>
          <p className="text-neutral-800">{treatment.protocol_days} gün</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400">Kalan tedavi günü</p>
          <p className="text-neutral-800">{stats.isEnded ? "-" : `${stats.remainingDays} gün`}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400">Tedavi sona erdi</p>
          <p className="text-neutral-800">{treatment.ended_at ? formatDateTime(treatment.ended_at) : "-"}</p>
        </div>
      </div>

      {!stats.isEnded && (
        <button
          onClick={handleEndEarly}
          disabled={ending}
          className="btn-secondary mt-3 text-xs"
        >
          {ending ? "Kaydediliyor..." : "Tedaviyi erken sonlandır"}
        </button>
      )}

      {stats.isEnded && (
        <div
          className={`mt-3 rounded-md border p-3 text-sm ${
            treatment.withdrawal_cleared_at
              ? "border-green-200 bg-green-50"
              : stats.needsWithdrawalExit
                ? "border-red-300 bg-red-50"
                : "border-amber-200 bg-amber-50"
          }`}
        >
          {treatment.withdrawal_cleared_at ? (
            <p className="text-green-800">
              Arınma tamamlandı: {formatDateTime(treatment.withdrawal_cleared_at)} ({nameFor(treatment.withdrawal_cleared_by)})
            </p>
          ) : stats.needsWithdrawalExit ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-red-800">
                Arınma süresi doldu, arınmadan çıkması gerekiyor.
              </span>
              <button
                onClick={handleClearWithdrawal}
                disabled={clearingWithdrawal}
                className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-800 disabled:opacity-50"
              >
                {clearingWithdrawal ? "Kaydediliyor..." : "Arınmadan çıktı olarak işaretle"}
              </button>
            </div>
          ) : (
            <p className="text-amber-800">
              Arınma sürüyor: {stats.withdrawalRemaining} gün kaldı ({treatment.withdrawal_days} günlük arınma).
            </p>
          )}
        </div>
      )}

      <div className="mt-3 space-y-2">
        <p className="text-xs font-medium text-neutral-500">Günlük tedavi takibi</p>
        {doses.map((dose) => (
          <div key={dose.id} className="rounded-md border border-neutral-100 px-3 py-2 text-sm transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={dose.done}
                  onChange={() => toggleDose(dose)}
                  className="h-4 w-4"
                />
                <span className={dose.done ? "text-neutral-400 line-through" : "text-neutral-800"}>
                  Gün {dose.day_number}
                </span>
              </div>
              {dose.done && dose.done_at && (
                <span className="text-xs text-green-700">
                  {nameFor(dose.done_by)} - {formatDateTime(dose.done_at)}
                  {dose.note && (
                    <span className="ml-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                      Not var
                    </span>
                  )}
                </span>
              )}
            </div>
            {dose.done && dose.note && <p className="mt-1 text-xs text-neutral-500">Not: {dose.note}</p>}

            {confirmingDoseId === dose.id && (
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2">
                <p className="text-xs font-medium text-neutral-800">
                  Gün {dose.day_number} tedavisinin yapıldığını onaylıyor musunuz?
                </p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="input mt-1"
                  rows={2}
                  placeholder="Not (opsiyonel)"
                  autoFocus
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => confirmDose(dose)}
                    disabled={savingDoseId === dose.id}
                    className="rounded-md bg-green-700 px-3 py-1 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-800 disabled:opacity-60"
                  >
                    {savingDoseId === dose.id ? "Kaydediliyor..." : "Onayla"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingDoseId(null);
                      setNote("");
                    }}
                    className="rounded-md border border-neutral-300 px-3 py-1 text-xs transition-colors hover:bg-neutral-100"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {treatment.notes && <p className="mt-3 text-sm text-neutral-500">{treatment.notes}</p>}

      {confirmingDelete ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">Bu mastitis kaydını silmek istediğinize emin misiniz?</p>
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
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs transition-colors hover:bg-neutral-50"
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : canManage ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-green-700 hover:underline"
          >
            Düzenle
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-xs font-medium text-red-600 hover:underline"
          >
            Sil
          </button>
        </div>
      ) : null}
    </div>
  );
}

function EditMastitisTreatmentForm({
  treatment,
  profiles,
  onCancel,
  onSaved,
}: {
  treatment: MastitisTreatment;
  profiles: Profile[];
  onCancel: () => void;
  onSaved: (t: MastitisTreatment) => void;
}) {
  const [udderQuarters, setUdderQuarters] = useState<UdderQuarter[]>(treatment.udder_quarters);
  const [diagnosis, setDiagnosis] = useState(treatment.diagnosis ?? "");
  const [medication, setMedication] = useState(treatment.medication ?? "");
  const [vetName, setVetName] = useState(treatment.vet_name ?? "");
  const [startDate, setStartDate] = useState(treatment.start_date);
  const [protocolDays, setProtocolDays] = useState(String(treatment.protocol_days));
  const [withdrawalDays, setWithdrawalDays] = useState(String(treatment.withdrawal_days));
  const [notes, setNotes] = useState(treatment.notes ?? "");
  const [saving, setSaving] = useState(false);

  function toggleUdderQuarter(q: UdderQuarter) {
    setUdderQuarters((prev) => (prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (udderQuarters.length === 0) return;
    setSaving(true);
    const updated = await updateMastitisTreatment(treatment.id, {
      udder_quarters: udderQuarters,
      diagnosis: diagnosis.trim() || null,
      medication: medication.trim() || null,
      vet_name: vetName.trim() || null,
      start_date: startDate,
      protocol_days: Number(protocolDays),
      withdrawal_days: Number(withdrawalDays),
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (updated) onSaved(updated);
  }

  return (
    <form onSubmit={handleSave} className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800">Mastitis kaydını düzenle</h2>
        <button type="button" onClick={onCancel} className="text-xs text-neutral-500 underline hover:no-underline">
          Vazgeç
        </button>
      </div>

      <div>
        <span className="mb-1 block text-xs font-medium text-neutral-600">Meme (birden fazla seçilebilir)</span>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["on_sol", "Ön Sol"],
              ["on_sag", "Ön Sağ"],
              ["arka_sol", "Arka Sol"],
              ["arka_sag", "Arka Sağ"],
            ] as [UdderQuarter, string][]
          ).map(([value, label]) => (
            <label
              key={value}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                udderQuarters.includes(value)
                  ? "border-green-600 bg-green-50 text-green-800"
                  : "border-neutral-300 text-neutral-700"
              }`}
            >
              <input
                type="checkbox"
                checked={udderQuarters.includes(value)}
                onChange={() => toggleUdderQuarter(value)}
                className="h-4 w-4"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Başlangıç tarihi</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Protokol (gün)</span>
          <input type="number" min={1} value={protocolDays} onChange={(e) => setProtocolDays(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Arınma (gün)</span>
          <input type="number" min={0} value={withdrawalDays} onChange={(e) => setWithdrawalDays(e.target.value)} className="input" />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">Tanı</span>
        <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="input" />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">İlaç / Tedavi Protokolü</span>
        <textarea value={medication} onChange={(e) => setMedication(e.target.value)} className="input" rows={2} />
      </label>

      <div>
        <span className="mb-1 block text-xs font-medium text-neutral-600">Veteriner</span>
        <div className="flex flex-wrap gap-2">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setVetName(p.full_name)}
              className={`chip ${vetName === p.full_name ? "chip-selected" : "chip-unselected"}`}
            >
              {p.full_name}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">Notlar</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={3} />
      </label>

      <button type="submit" disabled={saving || udderQuarters.length === 0} className="btn-primary">
        {saving ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </form>
  );
}
