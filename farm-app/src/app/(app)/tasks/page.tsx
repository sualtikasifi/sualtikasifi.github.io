"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listProfiles, listTasks, updateTaskStatus } from "@/lib/data";
import { Profile, Task } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/format";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  function loadData() {
    return Promise.all([listTasks(), listProfiles()]);
  }

  useEffect(() => {
    loadData().then(([t, p]) => {
      setTasks(t);
      setProfiles(p);
      setLoading(false);
    });
  }, []);

  async function toggleDone(task: Task) {
    const next = task.status === "yapildi" ? "bekliyor" : "yapildi";
    await updateTaskStatus(task.id, next);
    const [t, p] = await loadData();
    setTasks(t);
    setProfiles(p);
  }

  const nameFor = (id: string | null) => profiles.find((p) => p.id === id)?.full_name ?? "-";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Gorevler</h1>
        <Link href="/tasks/new" className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800">
          Yeni gorev
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Yukleniyor...</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-neutral-400">Kayit yok.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={t.status === "yapildi"}
                  onChange={() => toggleDone(t)}
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <p className={`font-medium ${t.status === "yapildi" ? "text-neutral-400 line-through" : "text-neutral-900"}`}>
                    {t.title}
                  </p>
                  {t.description && <p className="text-neutral-500">{t.description}</p>}
                  <p className="text-xs text-neutral-400">
                    {nameFor(t.assigned_to)} tarafindan yapilacak &middot; {nameFor(t.assigned_by)} atadi
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-neutral-500">
                  {formatDate(t.due_date)} {t.due_time && t.due_time.slice(0, 5)}
                </span>
                <Badge value={t.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
