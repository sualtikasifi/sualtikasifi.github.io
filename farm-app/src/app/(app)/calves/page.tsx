"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createAnimal,
  createCalfFeeding,
  createCalfNote,
  createShiftNote,
  deleteCalfFeeding,
  deleteCalfNote,
  listAnimals,
  listCalfFeedings,
  listCalfNotes,
  listProfiles,
  listShiftNotes,
  setCalfFeedingExam,
} from "@/lib/data";
import { Animal, CalfFeeding, CalfNote, Profile, ShiftNote } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { EarTagPicker } from "@/components/EarTagPicker";
import { todayIso } from "@/lib/format";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DAILY_FEEDING_TARGET = 4;

type Severity = "none" | "warning" | "urgent";

interface CalfStatus {
  streak: number;
  last3: CalfFeeding[];
  severity: Severity;
  latestMissed: CalfFeeding | null;
  examMissing: boolean;
}

function computeStatus(feedings: CalfFeeding[]): CalfStatus {
  const sorted = [...feedings].sort((a, b) => b.fed_at.localeCompare(a.fed_at));
  let streak = 0;
  for (const f of sorted) {
    if (!f.drank) streak++;
    else break;
  }
  const latestMissed = streak > 0 ? sorted[0] : null;
  const severity: Severity = streak >= 3 ? "urgent" : streak === 2 ? "warning" : "none";
  const examMissing = severity !== "none" && !!latestMissed && !latestMissed.exam_result;
  return { streak, last3: sorted.slice(0, 3), severity, latestMissed, examMissing };
}

export default function CalvesPage() {
  const { profile } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [feedings, setFeedings] = useState<CalfFeeding[]>([]);
  const [shiftNotes, setShiftNotes] = useState<ShiftNote[]>([]);
  const [calfNotes, setCalfNotes] = useState<CalfNote[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [examDrafts, setExamDrafts] = useState<Record<string, string>>({});
  const [savingExamId, setSavingExamId] = useState<string | null>(null);
  const [confirmDeleteFeedingId, setConfirmDeleteFeedingId] = useState<string | null>(null);
  const [deletingFeedingId, setDeletingFeedingId] = useState<string | null>(null);

  const [quickEarTag, setQuickEarTag] = useState("");
  const [quickAdding, setQuickAdding] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [confirmingNewTag, setConfirmingNewTag] = useState<string | null>(null);

  const [shiftNoteDraft, setShiftNoteDraft] = useState("");
  const [savingShiftNote, setSavingShiftNote] = useState(false);

  const [noteAnimalId, setNoteAnimalId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingCalfNote, setSavingCalfNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  function loadData() {
    return Promise.all([listAnimals(), listCalfFeedings(), listShiftNotes(), listCalfNotes(), listProfiles()]);
  }

  useEffect(() => {
    loadData().then(([a, f, sn, cn, p]) => {
      setAnimals(a);
      setFeedings(f);
      setShiftNotes(sn);
      setCalfNotes(cn);
      setProfiles(p);
      setLoading(false);
    });
  }, []);

  async function refresh() {
    const [a, f, sn, cn, p] = await loadData();
    setAnimals(a);
    setFeedings(f);
    setShiftNotes(sn);
    setCalfNotes(cn);
    setProfiles(p);
  }

  const calves = useMemo(() => animals.filter((a) => a.weaned_at === null), [animals]);

  const statuses = useMemo(() => {
    const map = new Map<string, CalfStatus>();
    for (const c of calves) {
      map.set(c.id, computeStatus(feedings.filter((f) => f.animal_id === c.id)));
    }
    return map;
  }, [calves, feedings]);

  const flagged = useMemo(
    () => calves.filter((c) => statuses.get(c.id)?.examMissing),
    [calves, statuses]
  );

  const missedLastFeeding = useMemo(
    () => calves.filter((c) => (statuses.get(c.id)?.streak ?? 0) >= 1),
    [calves, statuses]
  );

  const today = todayIso();
  const todaysFeedingsByCalf = useMemo(() => {
    const map = new Map<string, CalfFeeding[]>();
    for (const c of calves) {
      const todays = feedings
        .filter((f) => f.animal_id === c.id && f.fed_at.slice(0, 10) === today)
        .sort((a, b) => a.fed_at.localeCompare(b.fed_at));
      map.set(c.id, todays);
    }
    return map;
  }, [calves, feedings, today]);

  const earTagFor = (animalId: string) => animals.find((a) => a.id === animalId)?.ear_tag ?? "?";
  const nameFor = (id: string | null) => (id ? profiles.find((p) => p.id === id)?.full_name : null);

  async function logFeeding(animalId: string, drank: boolean) {
    if (!profile) return;
    setLoggingId(animalId);
    await createCalfFeeding({
      animal_id: animalId,
      fed_at: new Date().toISOString(),
      drank,
      notes: null,
      created_by: profile.id,
    });
    await refresh();
    setLoggingId(null);
  }

  async function saveExam(feedingId: string) {
    const text = (examDrafts[feedingId] ?? "").trim();
    if (!text || !profile) return;
    setSavingExamId(feedingId);
    await setCalfFeedingExam(feedingId, text, profile.id);
    await refresh();
    setSavingExamId(null);
  }

  async function handleDeleteFeeding(feedingId: string) {
    setDeletingFeedingId(feedingId);
    await deleteCalfFeeding(feedingId);
    setDeletingFeedingId(null);
    setConfirmDeleteFeedingId(null);
    await refresh();
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const tag = quickEarTag.trim();
    if (!tag) return;
    setQuickError(null);

    const existing = animals.find((c) => c.ear_tag.toLowerCase() === tag.toLowerCase());
    if (!existing) {
      setConfirmingNewTag(tag);
      return;
    }
    await logMissedFeedingFor(existing.id);
  }

  async function logMissedFeedingFor(animalId: string) {
    if (!profile) return;
    setQuickAdding(true);
    try {
      await createCalfFeeding({
        animal_id: animalId,
        fed_at: new Date().toISOString(),
        drank: false,
        notes: null,
        created_by: profile.id,
      });
      await refresh();
      setQuickEarTag("");
      setConfirmingNewTag(null);
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : "Eklenirken bir hata oluştu.");
    } finally {
      setQuickAdding(false);
    }
  }

  async function confirmCreateNewCalf() {
    if (!profile || !confirmingNewTag) return;
    setQuickAdding(true);
    setQuickError(null);
    try {
      const calf = await createAnimal({
        ear_tag: confirmingNewTag,
        name: null,
        birth_date: null,
        breed: null,
        gender: null,
        status: "aktif",
        mother_ear_tag: null,
        weaned_at: null,
        notes: null,
        created_by: profile.id,
      });
      await logMissedFeedingFor(calf.id);
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : "Eklenirken bir hata oluştu.");
      setQuickAdding(false);
    }
  }

  async function handleShiftNoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !shiftNoteDraft.trim()) return;
    setSavingShiftNote(true);
    await createShiftNote(shiftNoteDraft.trim(), profile.id);
    setShiftNoteDraft("");
    await refresh();
    setSavingShiftNote(false);
  }

  async function handleCalfNoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !noteAnimalId || !noteDraft.trim()) return;
    setSavingCalfNote(true);
    await createCalfNote(noteAnimalId, noteDraft.trim(), profile.id);
    setNoteDraft("");
    setNoteAnimalId(null);
    await refresh();
    setSavingCalfNote(false);
  }

  async function handleDeleteCalfNote(id: string) {
    setDeletingNoteId(id);
    await deleteCalfNote(id);
    await refresh();
    setDeletingNoteId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Buzağılar</h1>
      </div>

      <section className="card space-y-2">
        <h2 className="text-sm font-semibold text-neutral-800">Vardiya Devir Notu</h2>
        <form onSubmit={handleShiftNoteSubmit} className="flex gap-2">
          <input
            value={shiftNoteDraft}
            onChange={(e) => setShiftNoteDraft(e.target.value)}
            placeholder="örn. TR-1042 bugün az içti, takip edilsin"
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={savingShiftNote || !shiftNoteDraft.trim()}
            className="btn-primary shrink-0"
          >
            {savingShiftNote ? "Kaydediliyor..." : "Not Bırak"}
          </button>
        </form>
        {shiftNotes.length === 0 ? (
          <p className="text-sm text-neutral-400">Henüz devir notu yok.</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {shiftNotes.slice(0, 5).map((n) => (
              <div key={n.id} className="py-1.5 text-sm">
                <p className="text-neutral-800">{n.note}</p>
                <p className="text-xs text-neutral-400">
                  {nameFor(n.created_by) ?? "-"} &middot; {formatDateTime(n.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 shadow-sm">
        <p className="text-sm font-medium text-red-800">🍼❌ Sütünü içmeyen buzağı ekle</p>
        <form onSubmit={handleQuickAdd} className="flex gap-2">
          <input
            value={quickEarTag}
            onChange={(e) => {
              setQuickEarTag(e.target.value);
              setQuickError(null);
            }}
            placeholder="Küpe no"
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={quickAdding || !quickEarTag.trim()}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {quickAdding ? "Ekleniyor..." : "Ekle"}
          </button>
        </form>
        {quickError && <p className="text-xs text-red-700">{quickError}</p>}
        {confirmingNewTag && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-800">
              &quot;{confirmingNewTag}&quot; küpe numarası kayıtlı değil. Yeni buzağı olarak eklensin mi?
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={confirmCreateNewCalf}
                disabled={quickAdding}
                className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-800 disabled:opacity-60"
              >
                {quickAdding ? "Ekleniyor..." : "Evet, yeni buzağı ekle"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingNewTag(null)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs transition-colors hover:bg-neutral-100"
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-700">Son Öğünde Mamasını İçmeyenler</h2>
        {loading ? (
          <p className="text-sm text-neutral-500">Yükleniyor...</p>
        ) : missedLastFeeding.length === 0 ? (
          <p className="text-sm text-neutral-400">Son öğünde mamasını içmeyen buzağı yok.</p>
        ) : (
          <div className="card-list">
            {missedLastFeeding.map((c) => {
              const s = statuses.get(c.id)!;
              return (
                <div key={c.id} className="border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-neutral-900">{c.ear_tag}</span>
                      {c.name && <span className="ml-2 text-neutral-500">{c.name}</span>}
                      <span className="ml-2 text-xs text-red-600">
                        Son öğünde içmedi {s.streak > 1 && `(${s.streak}. kez üst üste)`}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => logFeeding(c.id, true)}
                        disabled={loggingId === c.id}
                        className="rounded-md border border-green-600 px-3 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
                      >
                        İçti
                      </button>
                      <button
                        onClick={() => logFeeding(c.id, false)}
                        disabled={loggingId === c.id}
                        className="rounded-md border border-red-500 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        İçmedi
                      </button>
                    </div>
                  </div>

                  {confirmDeleteFeedingId === s.latestMissed?.id ? (
                    <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                      <p className="text-xs font-medium text-red-800">
                        Bu kaydı silmek istediğinize emin misiniz? (yanlış girildiyse kullanın)
                      </p>
                      <div className="mt-1.5 flex gap-2">
                        <button
                          onClick={() => handleDeleteFeeding(s.latestMissed!.id)}
                          disabled={deletingFeedingId === s.latestMissed?.id}
                          className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60"
                        >
                          {deletingFeedingId === s.latestMissed?.id ? "Siliniyor..." : "Evet, sil"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteFeedingId(null)}
                          className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs transition-colors hover:bg-neutral-100"
                        >
                          Vazgeç
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteFeedingId(s.latestMissed!.id)}
                      className="mt-1 text-xs font-medium text-red-600 hover:underline"
                    >
                      Kaydı sil
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-700">
          Dikkat Gereken Buzağılar (son 3 öğün)
        </h2>
        {loading ? (
          <p className="text-sm text-neutral-500">Yükleniyor...</p>
        ) : flagged.length === 0 ? (
          <p className="text-sm text-neutral-400">Şu an uyarı veren buzağı yok.</p>
        ) : (
          <div className="space-y-2">
            {flagged.map((c) => {
              const s = statuses.get(c.id)!;
              const urgent = s.severity === "urgent";
              return (
                <div
                  key={c.id}
                  className={`rounded-xl border p-3 shadow-sm ${
                    urgent ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-neutral-900">{c.ear_tag}</span>
                      {c.name && <span className="ml-2 text-neutral-500">{c.name}</span>}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        urgent ? "bg-red-200 text-red-900" : "bg-amber-200 text-amber-900"
                      }`}
                    >
                      {urgent
                        ? `Acil muayene gerekli (${s.streak} öğün üst üste içmedi)`
                        : `Uyarı: 2. kez içmedi, muayene edilmeli`}
                    </span>
                  </div>

                  <div className="mt-2 flex gap-1">
                    {[...s.last3].reverse().map((f) => (
                      <span
                        key={f.id}
                        title={formatDateTime(f.fed_at)}
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          f.drank ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                        }`}
                      >
                        {f.drank ? "✓" : "✗"}
                      </span>
                    ))}
                  </div>

                  {s.latestMissed && (
                    <div className="mt-3 rounded-md border border-neutral-200 bg-white p-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-neutral-600">
                          Muayene sonucu (zorunlu, doldurulmadan uyarı kalkmaz)
                        </span>
                        <textarea
                          value={examDrafts[s.latestMissed.id] ?? ""}
                          onChange={(e) =>
                            setExamDrafts((prev) => ({ ...prev, [s.latestMissed!.id]: e.target.value }))
                          }
                          className="input"
                          rows={2}
                        />
                      </label>
                      <button
                        onClick={() => saveExam(s.latestMissed!.id)}
                        disabled={
                          savingExamId === s.latestMissed.id ||
                          !(examDrafts[s.latestMissed.id] ?? "").trim()
                        }
                        className="mt-2 rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-800 disabled:opacity-50"
                      >
                        {savingExamId === s.latestMissed.id ? "Kaydediliyor..." : "Muayene sonucunu kaydet"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-neutral-800">Bugünün Öğün Takibi</h2>
        {loading ? (
          <p className="text-sm text-neutral-500">Yükleniyor...</p>
        ) : calves.length === 0 ? (
          <p className="text-sm text-neutral-400">Buzağı yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                  <th className="py-1.5 pr-2">Buzağı</th>
                  {Array.from({ length: DAILY_FEEDING_TARGET }, (_, i) => (
                    <th key={i} className="px-1 py-1.5 text-center">
                      Öğün {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {calves.map((c) => {
                  const todays = todaysFeedingsByCalf.get(c.id) ?? [];
                  return (
                    <tr key={c.id}>
                      <td className="py-1.5 pr-2 font-medium text-neutral-900">{c.ear_tag}</td>
                      {Array.from({ length: DAILY_FEEDING_TARGET }, (_, i) => {
                        const f = todays[i];
                        const isNextSlot = !f && i === todays.length;
                        return (
                          <td key={i} className="px-1 py-1.5 text-center">
                            {f ? (
                              <span
                                title={formatDateTime(f.fed_at)}
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                  f.drank ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                                }`}
                              >
                                {f.drank ? "✓" : "✗"}
                              </span>
                            ) : isNextSlot ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => logFeeding(c.id, true)}
                                  disabled={loggingId === c.id}
                                  title="İçti"
                                  className="flex h-6 w-6 items-center justify-center rounded-full border border-green-600 text-xs text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => logFeeding(c.id, false)}
                                  disabled={loggingId === c.id}
                                  title="İçmedi"
                                  className="flex h-6 w-6 items-center justify-center rounded-full border border-red-500 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                                >
                                  ✗
                                </button>
                              </div>
                            ) : (
                              <span className="text-neutral-300">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-neutral-800">Buzağı Notu Ekle</h2>
        <form onSubmit={handleCalfNoteSubmit} className="space-y-2">
          <EarTagPicker
            animals={calves}
            selectedId={noteAnimalId}
            onSelect={(id) => setNoteAnimalId(id)}
            onClear={() => setNoteAnimalId(null)}
          />
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="örn. Hafif öksürük var, gözlemleniyor"
            className="input"
            rows={2}
          />
          <button
            type="submit"
            disabled={savingCalfNote || !noteAnimalId || !noteDraft.trim()}
            className="btn-primary"
          >
            {savingCalfNote ? "Kaydediliyor..." : "Not Ekle"}
          </button>
        </form>

        {calfNotes.length === 0 ? (
          <p className="text-sm text-neutral-400">Henüz gözlem notu yok.</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {calfNotes.slice(0, 8).map((n) => (
              <div key={n.id} className="py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-medium text-neutral-900">{earTagFor(n.animal_id)}</span>
                    <span className="ml-2 text-neutral-700">{n.note}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteCalfNote(n.id)}
                    disabled={deletingNoteId === n.id}
                    className="shrink-0 text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
                  >
                    {deletingNoteId === n.id ? "Siliniyor..." : "Sil"}
                  </button>
                </div>
                <p className="text-xs text-neutral-400">
                  {nameFor(n.created_by) ?? "-"} &middot; {formatDateTime(n.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
