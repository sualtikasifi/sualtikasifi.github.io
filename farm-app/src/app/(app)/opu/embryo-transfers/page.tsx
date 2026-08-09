"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  createPlannedEmbryoTransfer,
  createTask,
  createTaskAnimals,
  deletePlannedEmbryoTransfer,
  listAnimals,
  listEmbryos,
  listPlannedEmbryoTransfers,
  sendPushNotification,
  updateEmbryo,
  updateTaskStatus,
} from "@/lib/data";
import { Animal, Embryo, PlannedEmbryoTransfer, PregnancyResult } from "@/lib/types";
import { formatDate, ageInDays, todayIso } from "@/lib/format";
import { exportRowsToExcel } from "@/lib/excelExport";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { EarTagPicker } from "@/components/EarTagPicker";

const RESULT_LABELS: Record<PregnancyResult, string> = {
  bekleniyor: "Bekleniyor",
  gebe: "Gebe",
  gebe_degil: "Gebe değil",
};

const ROW_CLASSES: Record<PregnancyResult, string> = {
  bekleniyor: "",
  gebe: "bg-green-50",
  gebe_degil: "bg-red-50",
};

interface TransferGroup {
  key: string;
  recipientAnimalId: string;
  transferDate: string;
  technicianName: string | null;
  embryoIds: string[];
  seedCount: number;
  pregnancyResult: PregnancyResult;
  pregnancyCheckDate: string | null;
}

function groupTransfers(embryos: Embryo[]): TransferGroup[] {
  const groups = new Map<string, TransferGroup>();
  for (const e of embryos) {
    if (e.status !== "transfer_edildi" || !e.recipient_animal_id || !e.transfer_date) continue;
    const key = `${e.recipient_animal_id}|${e.transfer_date}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        key,
        recipientAnimalId: e.recipient_animal_id,
        transferDate: e.transfer_date,
        technicianName: e.transfer_technician_name,
        embryoIds: [e.id],
        seedCount: 1,
        pregnancyResult: e.pregnancy_result,
        pregnancyCheckDate: e.pregnancy_check_date,
      });
      continue;
    }
    existing.embryoIds.push(e.id);
    existing.seedCount += 1;
    existing.technicianName = existing.technicianName ?? e.transfer_technician_name;
    // Grup icindeki embriyolardan herhangi biri "gebe" ya da "gebe_degil"
    // ise sonuc onu yansitir - hepsi ayni alicidaki gebeligi temsil eder,
    // teshis her embriyoya ayri ayri girilmis olsa bile tutarli gorunur.
    if (existing.pregnancyResult === "bekleniyor" && e.pregnancy_result !== "bekleniyor") {
      existing.pregnancyResult = e.pregnancy_result;
    }
    if (!existing.pregnancyCheckDate || (e.pregnancy_check_date && e.pregnancy_check_date > existing.pregnancyCheckDate)) {
      existing.pregnancyCheckDate = e.pregnancy_check_date ?? existing.pregnancyCheckDate;
    }
  }
  return Array.from(groups.values()).sort((a, b) => b.transferDate.localeCompare(a.transferDate));
}

export default function EmbryoTransfersPage() {
  const { profile } = useAuth();
  const canManage = hasPermission(profile, "can_manage_opu");
  const [embryos, setEmbryos] = useState<Embryo[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [planned, setPlanned] = useState<PlannedEmbryoTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planRecipientId, setPlanRecipientId] = useState<string | null>(null);
  const [planDate, setPlanDate] = useState(todayIso());
  const [planNotes, setPlanNotes] = useState("");
  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  function refresh() {
    return Promise.all([listEmbryos(), listAnimals(), listPlannedEmbryoTransfers()])
      .then(([e, a, p]) => {
        setEmbryos(e);
        setAnimals(a);
        setPlanned(p);
        setLoadError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        // planned_embryo_transfers tablosu/embryos'un yeni sutunlari henuz
        // Supabase'e uygulanmamis olabilir (schema.sql tekrar calistirilmadan) -
        // sonsuza kadar "Yukleniyor..." gostermek yerine bunu acikca soyle.
        setLoadError(err instanceof Error ? err.message : "Veriler yüklenemedi.");
        setLoading(false);
      });
  }

  useEffect(() => {
    refresh();
  }, []);

  const earTagFor = (animalId: string) => animals.find((a) => a.id === animalId)?.ear_tag ?? "?";
  const groups = useMemo(() => groupTransfers(embryos), [embryos]);

  async function handlePregnancyChange(group: TransferGroup, result: PregnancyResult) {
    setSavingKey(group.key);
    const checkDate = result === "bekleniyor" ? null : new Date().toISOString().slice(0, 10);
    await Promise.all(
      group.embryoIds.map((id) => updateEmbryo(id, { pregnancy_result: result, pregnancy_check_date: checkDate }))
    );
    setEmbryos((prev) =>
      prev.map((e) =>
        group.embryoIds.includes(e.id) ? { ...e, pregnancy_result: result, pregnancy_check_date: checkDate } : e
      )
    );
    setSavingKey(null);
  }

  async function handlePlanSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!planRecipientId || !planDate) return;
    setPlanSubmitting(true);
    try {
      const earTag = earTagFor(planRecipientId);
      const task = await createTask({
        title: `Embriyo transferi: ${earTag}`,
        description: planNotes.trim() || null,
        assigned_to: null,
        assigned_by: profile?.id ?? null,
        due_date: planDate,
        due_time: null,
        status: "bekliyor",
        image_url: null,
        completed_by: null,
        completed_at: null,
        completion_note: null,
        completion_image_url: null,
      });
      await createTaskAnimals(task.id, [planRecipientId]);
      await createPlannedEmbryoTransfer({
        recipient_animal_id: planRecipientId,
        planned_date: planDate,
        notes: planNotes.trim() || null,
        task_id: task.id,
        created_by: profile?.id ?? null,
      });
      try {
        await sendPushNotification({
          title: "Embriyo transferi planlandı",
          body: `${earTag} · ${formatDate(planDate)}`,
          targetProfileIds: null,
          url: "/opu/embryo-transfers",
          kind: "task",
        });
      } catch {
        // Bildirim gönderimi planlamayı engellemez.
      }
      setPlanRecipientId(null);
      setPlanDate(todayIso());
      setPlanNotes("");
      setShowPlanForm(false);
      await refresh();
    } finally {
      setPlanSubmitting(false);
    }
  }

  async function handleDeletePlanned(p: PlannedEmbryoTransfer) {
    setDeletingPlanId(p.id);
    try {
      if (p.task_id) await updateTaskStatus(p.task_id, "iptal");
      await deletePlannedEmbryoTransfer(p.id);
      setPlanned((prev) => prev.filter((x) => x.id !== p.id));
    } finally {
      setDeletingPlanId(null);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const headers = ["Küpe No", "Tohum Sayısı", "Tohumlayıcı", "Transfer Tarihi", "Geçen Gün", "Gebelik Durumu"];
      const rows = groups.map((g) => [
        earTagFor(g.recipientAnimalId),
        g.seedCount,
        g.technicianName ?? "-",
        formatDate(g.transferDate),
        ageInDays(g.transferDate) ?? "-",
        RESULT_LABELS[g.pregnancyResult],
      ]);
      await exportRowsToExcel(
        `embriyo-transferleri-${new Date().toISOString().slice(0, 10)}.xlsx`,
        "Embriyo Transferleri",
        headers,
        rows,
        [14, 14, 20, 16, 12, 16]
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon="🐣"
        title="Embriyo Transferleri"
        subtitle="Alıcı hayvanlar ve gebelik teşhis takibi"
        color="purple"
        backHref="/opu"
        actions={
          <>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || groups.length === 0}
              className="btn-secondary"
            >
              {exporting ? "Hazırlanıyor..." : "Excel'e Aktar"}
            </button>
            {canManage && (
              <button type="button" onClick={() => setShowPlanForm((v) => !v)} className="btn-primary">
                + İleri Tarihli Transfer Planla
              </button>
            )}
          </>
        }
      />

      {showPlanForm && (
        <form onSubmit={handlePlanSubmit} className="card space-y-3">
          <h2 className="text-sm font-semibold text-neutral-800">İleri tarihli transfer planla</h2>
          <p className="text-xs text-neutral-500">
            Eklediğiniz hayvan, seçtiğiniz tarihte hatırlatma olarak Görevler sayfasına da düşer.
          </p>
          <div>
            <span className="mb-1 block text-sm font-medium text-neutral-700">Alıcı hayvan</span>
            <EarTagPicker
              animals={animals}
              selectedId={planRecipientId}
              onSelect={setPlanRecipientId}
              onClear={() => setPlanRecipientId(null)}
            />
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Planlanan tarih</span>
            <input type="date" required value={planDate} onChange={(e) => setPlanDate(e.target.value)} className="input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Notlar (opsiyonel)</span>
            <textarea value={planNotes} onChange={(e) => setPlanNotes(e.target.value)} className="input" rows={2} />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={planSubmitting || !planRecipientId} className="btn-primary">
              {planSubmitting ? "Kaydediliyor..." : "Planla"}
            </button>
            <button
              type="button"
              onClick={() => setShowPlanForm(false)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm transition-colors hover:bg-neutral-50"
            >
              Vazgeç
            </button>
          </div>
        </form>
      )}

      {loadError && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">Veriler yüklenemedi: {loadError}</p>
          <p className="mt-1 text-xs text-red-700">
            Supabase&apos;de &quot;planned_embryo_transfers&quot; tablosu ya da embriyo alanları henüz eklenmemiş
            olabilir — <code className="rounded bg-red-100 px-1">farm-app/supabase/schema.sql</code> dosyasını
            Supabase SQL Editor&apos;da tekrar çalıştırın, sonra sayfayı yenileyin.
          </p>
        </div>
      )}

      {!loading && !loadError && planned.length > 0 && (
        <div>
          <h2 className="mb-1 text-sm font-semibold text-neutral-800">Planlanan Transferler &middot; {planned.length}</h2>
          <div className="card-list">
            {planned.map((p) => {
              const days = ageInDays(p.planned_date);
              const dueLabel = days === null ? "-" : days < 0 ? `${Math.abs(days)} gün kaldı` : days === 0 ? "Bugün" : `${days} gün gecikti`;
              return (
                <div key={p.id} className="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0">
                  <div>
                    <span className="font-medium text-neutral-900">{earTagFor(p.recipient_animal_id)}</span>
                    <span className="ml-2 text-neutral-500">(Alıcı, planlanan)</span>
                    {p.notes && <p className="text-xs text-neutral-400">{p.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-neutral-600">{formatDate(p.planned_date)}</p>
                      <p className="text-xs text-neutral-400">{dueLabel}</p>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleDeletePlanned(p)}
                        disabled={deletingPlanId === p.id}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : loadError ? null : groups.length === 0 ? (
        <p className="text-sm text-neutral-400">Henüz transfer edilmiş embriyo yok.</p>
      ) : (
        <div>
          <h2 className="mb-1 text-sm font-semibold text-neutral-800">Yapılan Transferler &middot; {groups.length}</h2>
          <div className="card-list">
            {groups.map((g) => {
              const days = ageInDays(g.transferDate);
              return (
                <div key={g.key} className={`border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0 ${ROW_CLASSES[g.pregnancyResult]}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link href={`/animals/detail?id=${g.recipientAnimalId}`} className="font-medium text-neutral-900 hover:underline">
                        {earTagFor(g.recipientAnimalId)}
                      </Link>
                      <span className="ml-2 text-neutral-500">(Alıcı)</span>
                      {g.technicianName && <p className="text-xs text-neutral-400">{g.technicianName}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-neutral-600">
                        {g.seedCount} tohum &middot; {formatDate(g.transferDate)}
                      </p>
                      <p className="text-xs text-neutral-400">{days !== null ? `${days} gün geçti` : "-"}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {canManage ? (
                      <select
                        value={g.pregnancyResult}
                        disabled={savingKey === g.key}
                        onChange={(e) => handlePregnancyChange(g, e.target.value as PregnancyResult)}
                        className="input w-auto py-1 text-xs"
                      >
                        <option value="bekleniyor">Bekleniyor</option>
                        <option value="gebe">Gebe</option>
                        <option value="gebe_degil">Gebe değil</option>
                      </select>
                    ) : (
                      <span className="text-xs font-medium text-neutral-600">{RESULT_LABELS[g.pregnancyResult]}</span>
                    )}
                    {g.pregnancyCheckDate && (
                      <span className="text-xs text-neutral-400">Teşhis: {formatDate(g.pregnancyCheckDate)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
