"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  completeTask,
  listAllMastitisDoses,
  listAnimals,
  listMastitisTreatments,
  listProfiles,
  listTasks,
  reopenTask,
} from "@/lib/data";
import { Animal, MastitisDose, MastitisTreatment, Profile, Task } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { getTodaysMastitisReminders, isMastitisReminderActive, isMastitisWarningActive } from "@/lib/mastitisReminder";
import { MastitisReminderCard } from "@/components/MastitisReminderCard";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByDueDate(list: Task[]): { date: string; tasks: Task[] }[] {
  const map = new Map<string, Task[]>();
  for (const t of list) {
    const arr = map.get(t.due_date) ?? [];
    arr.push(t);
    map.set(t.due_date, arr);
  }
  return Array.from(map.entries()).map(([date, tasks]) => ({ date, tasks }));
}

export default function TasksPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [mastitisTreatments, setMastitisTreatments] = useState<MastitisTreatment[]>([]);
  const [mastitisDoses, setMastitisDoses] = useState<MastitisDose[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  function loadData() {
    return Promise.all([listTasks(), listProfiles(), listMastitisTreatments(), listAllMastitisDoses(), listAnimals()]);
  }

  useEffect(() => {
    loadData().then(([t, p, mt, doses, a]) => {
      setTasks(t);
      setProfiles(p);
      setMastitisTreatments(mt);
      setMastitisDoses(doses);
      setAnimals(a);
      setLoading(false);
    });
  }, []);

  async function refresh() {
    const [t, p, mt, doses, a] = await loadData();
    setTasks(t);
    setProfiles(p);
    setMastitisTreatments(mt);
    setMastitisDoses(doses);
    setAnimals(a);
  }

  function startConfirm(task: Task) {
    setConfirmingId(task.id);
    setNote("");
  }

  function cancelConfirm() {
    setConfirmingId(null);
    setNote("");
  }

  async function confirmDone(task: Task) {
    if (!profile) return;
    setSaving(true);
    await completeTask(task.id, profile.id, note.trim() || null);
    setSaving(false);
    setConfirmingId(null);
    setNote("");
    await refresh();
  }

  async function handleReopen(task: Task) {
    await reopenTask(task.id);
    await refresh();
  }

  const nameFor = (id: string | null) => profiles.find((p) => p.id === id)?.full_name ?? "-";
  const assigneeFor = (id: string | null) => (id === null ? "Herkes" : nameFor(id));

  const pending = [...tasks]
    .filter((t) => t.status !== "yapildi")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const done = [...tasks]
    .filter((t) => t.status === "yapildi")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const pendingGroups = groupByDueDate(pending);
  const doneGroups = groupByDueDate(done);
  const mastitisReminders = getTodaysMastitisReminders(mastitisTreatments, mastitisDoses, animals);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Görevler</h1>
        <Link href="/tasks/new" className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-800">
          Yeni görev
        </Link>
      </div>

      {isMastitisReminderActive() && mastitisReminders.length > 0 && (
        <MastitisReminderCard reminders={mastitisReminders} warning={isMastitisWarningActive()} />
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-neutral-400">Kayıt yok.</p>
      ) : (
        <div className="space-y-5">
          {[...pendingGroups, ...doneGroups].map((group) => (
            <div key={group.date}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {formatDate(group.date)}
              </p>
              <div className="card-list">
                {group.tasks.map((t) => (
                  <div
                    key={t.id}
                    className={`border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0 ${
                      t.status !== "yapildi" ? "bg-red-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className={`font-medium ${t.status === "yapildi" ? "text-neutral-400 line-through" : "text-neutral-900"}`}>
                          {t.title}
                        </p>
                        {t.description && <p className="text-neutral-500">{t.description}</p>}
                        <p className="text-xs text-neutral-400">
                          {assigneeFor(t.assigned_to)} tarafından yapılacak &middot; {nameFor(t.assigned_by)} atadı
                        </p>
                        {t.status === "yapildi" && t.completed_at && (
                          <p className="mt-1 text-xs text-green-700">
                            {nameFor(t.completed_by)} tarafından {formatDateTime(t.completed_at)} tarihinde onaylandı
                            {t.completion_note && (
                              <span className="ml-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                                Not var
                              </span>
                            )}
                          </p>
                        )}
                        {t.status === "yapildi" && t.completion_note && (
                          <p className="mt-0.5 text-xs text-neutral-500">Not: {t.completion_note}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="text-neutral-500">{t.due_time && t.due_time.slice(0, 5)}</span>
                        <Badge value={t.status} />
                        <CompleteButton
                          task={t}
                          onClick={() => (t.status === "yapildi" ? handleReopen(t) : startConfirm(t))}
                        />
                      </div>
                    </div>

                    {confirmingId === t.id && (
                      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                        <p className="text-sm font-medium text-neutral-800">
                          &quot;{t.title}&quot; görevini tamamladığınızı onaylıyor musunuz?
                        </p>
                        <label className="mt-2 block">
                          <span className="mb-1 block text-xs font-medium text-neutral-600">Not (opsiyonel)</span>
                          <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="input"
                            rows={2}
                            autoFocus
                          />
                        </label>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => confirmDone(t)}
                            disabled={saving}
                            className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-800 disabled:opacity-60"
                          >
                            {saving ? "Kaydediliyor..." : "Onayla"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelConfirm}
                            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs transition-colors hover:bg-neutral-50"
                          >
                            Vazgeç
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompleteButton({ task, onClick }: { task: Task; onClick: () => void }) {
  const done = task.status === "yapildi";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        done
          ? "border-green-600 bg-green-600 text-white hover:bg-green-700"
          : "border-neutral-300 text-neutral-600 hover:border-green-600 hover:text-green-700"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
          done ? "border-white text-white" : "border-neutral-400"
        }`}
      >
        {done && "✓"}
      </span>
      {done ? "Tamamlandı" : "Yapıldı olarak işaretle"}
    </button>
  );
}
