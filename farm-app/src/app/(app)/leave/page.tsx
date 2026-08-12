"use client";

import { useEffect, useMemo, useState } from "react";
import { createLeaveRequest, deleteLeaveRequest, listLeaveRequests, listProfiles, updateLeaveRequest } from "@/lib/data";
import { LeaveRequest, Profile } from "@/lib/types";
import { todayIso } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";

const WEEKDAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Ayin gorunecegi haftalik izgarayi (Pazartesi baslangicli) uretir - onceki/
// sonraki aydan tasan gunler de dolgu olarak eklenir, satir sayisi o ayin
// gercekte kac hafta surdugune gore degisir (her zaman 6 satir degil).
function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  const gridStart = new Date(year, month, 1 - startWeekday);
  return Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

const STATUS_LABELS: Record<LeaveRequest["status"], string> = {
  bekliyor: "Bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
};

const STATUS_BADGE: Record<LeaveRequest["status"], string> = {
  bekliyor: "bg-amber-100 text-amber-800",
  onaylandi: "bg-green-100 text-green-800",
  reddedildi: "bg-neutral-200 text-neutral-500",
};

export default function LeaveCalendarPage() {
  const { profile } = useAuth();
  const canApprove = hasPermission(profile, "can_approve_leave");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [showForm, setShowForm] = useState(false);
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function refresh() {
    return Promise.all([listLeaveRequests(), listProfiles()]).then(([r, p]) => {
      setRequests(r);
      setProfiles(p);
      setLoading(false);
    });
  }

  useEffect(() => {
    refresh();
  }, []);

  const nameFor = (userId: string) => profiles.find((p) => p.id === userId)?.full_name ?? "?";

  const grid = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const monthLabel = cursor.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  const todayStr = todayIso();

  const visibleRequests = useMemo(() => requests.filter((r) => r.status !== "reddedildi"), [requests]);
  const requestsByDay = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>();
    for (const r of visibleRequests) {
      const cursorD = new Date(r.start_date + "T00:00:00");
      const end = new Date(r.end_date + "T00:00:00");
      while (cursorD <= end) {
        const key = toIso(cursorD);
        const list = map.get(key) ?? [];
        list.push(r);
        map.set(key, list);
        cursorD.setDate(cursorD.getDate() + 1);
      }
    }
    return map;
  }, [visibleRequests]);

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "bekliyor").sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [requests]
  );
  const decidedRequests = useMemo(
    () =>
      requests
        .filter((r) => r.status !== "bekliyor")
        .sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [requests]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || startDate > endDate) return;
    setSubmitting(true);
    try {
      await createLeaveRequest({
        user_id: profile.id,
        start_date: startDate,
        end_date: endDate,
        note: note.trim() || null,
      });
      setNote("");
      setShowForm(false);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecision(id: string, status: "onaylandi" | "reddedildi") {
    if (!profile) return;
    setBusyId(id);
    try {
      await updateLeaveRequest(id, { status, reviewed_by: profile.id, reviewed_at: new Date().toISOString() });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(id: string) {
    setBusyId(id);
    try {
      await deleteLeaveRequest(id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon="🗓️"
        title="İzin Takvimi"
        subtitle="İzin taleplerini takvimde görün, oluşturun ve onaylayın"
        color="teal"
        actions={
          <button type="button" onClick={() => setShowForm((v) => !v)} className="btn-primary">
            + Yeni İzin Talebi
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Başlangıç</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) setEndDate(e.target.value);
                }}
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Bitiş</span>
              <input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Not (opsiyonel)</span>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="Örn. Aile ziyareti" />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Gönderiliyor..." : "Talebi Gönder"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm transition-colors hover:bg-neutral-50">
              Vazgeç
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : (
        <>
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
                className="rounded-lg border border-neutral-300 px-2.5 py-1 text-sm hover:bg-neutral-50"
              >
                ‹
              </button>
              <div className="text-center">
                <p className="text-sm font-semibold capitalize text-neutral-900">{monthLabel}</p>
                <button
                  type="button"
                  onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
                  className="text-xs text-green-700 hover:underline"
                >
                  Bugün
                </button>
              </div>
              <button
                type="button"
                onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
                className="rounded-lg border border-neutral-300 px-2.5 py-1 text-sm hover:bg-neutral-50"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-neutral-400">
              {WEEKDAY_LABELS.map((w) => (
                <div key={w} className="pb-1">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {grid.map((d) => {
                const dayIso = toIso(d);
                const isCurrentMonth = d.getMonth() === cursor.getMonth();
                const isToday = dayIso === todayStr;
                const dayRequests = requestsByDay.get(dayIso) ?? [];
                const Cell = dayRequests.length > 0 ? "button" : "div";
                return (
                  <Cell
                    key={dayIso}
                    type={dayRequests.length > 0 ? "button" : undefined}
                    onClick={dayRequests.length > 0 ? () => setDetailDate(dayIso) : undefined}
                    className={`min-h-[62px] rounded-lg border p-1 text-xs ${dayRequests.length > 0 ? "text-left" : ""} ${
                      isCurrentMonth ? "border-neutral-200 bg-white" : "border-neutral-100 bg-neutral-50"
                    } ${isToday ? "ring-2 ring-green-500" : ""}`}
                  >
                    <div className={`text-right font-medium ${isCurrentMonth ? "text-neutral-700" : "text-neutral-300"}`}>
                      {d.getDate()}
                    </div>
                    {/* Mobilde hucreler isim sigdiramayacak kadar dar - sadece
                        durum rengini gosteren noktalar cizilir, tum isimler
                        hucreye dokununca acilan pencerede gorunur. sm ve
                        uzerinde hucreler yeterince genis oldugu icin isimler
                        dogrudan gosterilir. */}
                    <div className="mt-0.5 flex flex-wrap justify-end gap-0.5 sm:hidden">
                      {dayRequests.map((r) => (
                        <span
                          key={r.id}
                          className={`h-2 w-2 rounded-full ${r.status === "onaylandi" ? "bg-green-500" : "bg-amber-500"}`}
                        />
                      ))}
                    </div>
                    <div className="mt-0.5 hidden space-y-0.5 sm:block">
                      {dayRequests.map((r) => (
                        <div
                          key={r.id}
                          title={`${nameFor(r.user_id)} · ${STATUS_LABELS[r.status]}`}
                          className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${STATUS_BADGE[r.status]}`}
                        >
                          {nameFor(r.user_id)}
                        </div>
                      ))}
                    </div>
                  </Cell>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-amber-200" /> Bekliyor
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-green-200" /> Onaylandı
              </span>
            </div>
          </div>

          {pendingRequests.length > 0 && (
            <div className="card">
              <h2 className="mb-2 text-sm font-semibold text-neutral-800">Bekleyen Talepler &middot; {pendingRequests.length}</h2>
              <div className="divide-y divide-neutral-100">
                {pendingRequests.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <div>
                      <p className="font-medium text-neutral-900">{nameFor(r.user_id)}</p>
                      <p className="text-xs text-neutral-500">
                        {r.start_date === r.end_date ? r.start_date : `${r.start_date} → ${r.end_date}`}
                        {r.note && ` · ${r.note}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {canApprove && (
                        <>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => handleDecision(r.id, "onaylandi")}
                            className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-60"
                          >
                            Onayla
                          </button>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => handleDecision(r.id, "reddedildi")}
                            className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
                          >
                            Reddet
                          </button>
                        </>
                      )}
                      {r.user_id === profile?.id && (
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => handleCancel(r.id)}
                          className="text-xs font-medium text-neutral-500 underline hover:no-underline disabled:opacity-60"
                        >
                          Vazgeç
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {decidedRequests.length > 0 && (
            <div className="card">
              <h2 className="mb-2 text-sm font-semibold text-neutral-800">Geçmiş Talepler &middot; {decidedRequests.length}</h2>
              <div className="divide-y divide-neutral-100">
                {decidedRequests.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <div>
                      <p className="font-medium text-neutral-900">{nameFor(r.user_id)}</p>
                      <p className="text-xs text-neutral-500">
                        {r.start_date === r.end_date ? r.start_date : `${r.start_date} → ${r.end_date}`}
                        {r.note && ` · ${r.note}`}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {detailDate && (
        <div
          className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={() => setDetailDate(null)}
        >
          <div
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-lg sm:max-w-sm sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold capitalize text-neutral-900">
                {new Date(detailDate + "T00:00:00").toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  weekday: "long",
                })}
              </p>
              <button type="button" onClick={() => setDetailDate(null)} className="text-xs text-neutral-500 underline hover:no-underline">
                Kapat
              </button>
            </div>
            <div className="space-y-2">
              {(requestsByDay.get(detailDate) ?? []).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-neutral-100 p-2 text-sm">
                  <div>
                    <p className="font-medium text-neutral-900">{nameFor(r.user_id)}</p>
                    <p className="text-xs text-neutral-500">
                      {r.start_date === r.end_date ? r.start_date : `${r.start_date} → ${r.end_date}`}
                      {r.note && ` · ${r.note}`}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
