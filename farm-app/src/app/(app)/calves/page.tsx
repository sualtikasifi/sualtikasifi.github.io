"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createAnimal, createCalfFeeding, listAnimals, listCalfFeedings, setCalfFeedingExam } from "@/lib/data";
import { Animal, CalfFeeding } from "@/lib/types";
import { useAuth } from "@/lib/auth";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const [loading, setLoading] = useState(true);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [examDrafts, setExamDrafts] = useState<Record<string, string>>({});
  const [savingExamId, setSavingExamId] = useState<string | null>(null);
  const [quickEarTag, setQuickEarTag] = useState("");
  const [quickAdding, setQuickAdding] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  function loadData() {
    return Promise.all([listAnimals(), listCalfFeedings()]);
  }

  useEffect(() => {
    loadData().then(([a, f]) => {
      setAnimals(a);
      setFeedings(f);
      setLoading(false);
    });
  }, []);

  async function refresh() {
    const [a, f] = await loadData();
    setAnimals(a);
    setFeedings(f);
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

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const tag = quickEarTag.trim();
    if (!tag) return;
    setQuickError(null);
    setQuickAdding(true);
    try {
      let calf = animals.find((c) => c.ear_tag.toLowerCase() === tag.toLowerCase());
      if (!calf) {
        calf = await createAnimal({
          ear_tag: tag,
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
      }
      await createCalfFeeding({
        animal_id: calf.id,
        fed_at: new Date().toISOString(),
        drank: false,
        notes: null,
        created_by: profile.id,
      });
      await refresh();
      setQuickEarTag("");
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : "Eklenirken bir hata olustu.");
    } finally {
      setQuickAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Buzagilar</h1>
        <Link href="/animals/import" className="text-xs font-medium text-green-700 hover:underline">
          Excel&apos;den toplu aktar
        </Link>
      </div>

      <section className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
        <p className="text-sm font-medium text-red-800">🍼❌ Sutunu icmeyen buzagi ekle</p>
        <form onSubmit={handleQuickAdd} className="flex gap-2">
          <input
            value={quickEarTag}
            onChange={(e) => {
              setQuickEarTag(e.target.value);
              setQuickError(null);
            }}
            placeholder="Kupe no"
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={quickAdding || !quickEarTag.trim()}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {quickAdding ? "Ekleniyor..." : "Ekle"}
          </button>
        </form>
        {quickError && <p className="text-xs text-red-700">{quickError}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-700">Son Ogunde Mamasini Icmeyenler</h2>
        {loading ? (
          <p className="text-sm text-neutral-500">Yukleniyor...</p>
        ) : missedLastFeeding.length === 0 ? (
          <p className="text-sm text-neutral-400">Son ogunde mamasini icmeyen buzagi yok.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            {missedLastFeeding.map((c) => {
              const s = statuses.get(c.id)!;
              return (
                <div key={c.id} className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0">
                  <div>
                    <span className="font-medium text-neutral-900">{c.ear_tag}</span>
                    {c.name && <span className="ml-2 text-neutral-500">{c.name}</span>}
                    <span className="ml-2 text-xs text-red-600">
                      Son ogunde icmedi {s.streak > 1 && `(${s.streak}. kez ustuste)`}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => logFeeding(c.id, true)}
                      disabled={loggingId === c.id}
                      className="rounded-md border border-green-600 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                    >
                      Icti
                    </button>
                    <button
                      onClick={() => logFeeding(c.id, false)}
                      disabled={loggingId === c.id}
                      className="rounded-md border border-red-500 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Icmedi
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-700">
          Dikkat Gereken Buzagilar (son 3 ogun)
        </h2>
        {loading ? (
          <p className="text-sm text-neutral-500">Yukleniyor...</p>
        ) : flagged.length === 0 ? (
          <p className="text-sm text-neutral-400">Su an uyari veren buzagi yok.</p>
        ) : (
          <div className="space-y-2">
            {flagged.map((c) => {
              const s = statuses.get(c.id)!;
              const urgent = s.severity === "urgent";
              return (
                <div
                  key={c.id}
                  className={`rounded-lg border p-3 ${
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
                        ? `Acil muayene gerekli (${s.streak} ogun ustuste icmedi)`
                        : `Uyari: 2. kez icmedi, muayene edilmeli`}
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
                          Muayene sonucu (zorunlu, doldurulmadan uyari kalkmaz)
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
                        className="mt-2 rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
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
    </div>
  );
}
