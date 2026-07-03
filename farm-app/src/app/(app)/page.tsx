"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listAnimals, listTasks, listTreatments } from "@/lib/data";
import { Animal, Task, Treatment } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { formatDate, todayIso } from "@/lib/format";

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listTasks(), listTreatments(), listAnimals()]).then(([t, tr, a]) => {
      setTasks(t);
      setTreatments(tr);
      setAnimals(a);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <p className="text-sm text-neutral-500">Yukleniyor...</p>;
  }

  const today = todayIso();
  const pending = tasks.filter((t) => t.status === "bekliyor");
  const todayTasks = pending.filter((t) => t.due_date === today);
  const overdueTasks = pending.filter((t) => t.due_date < today);
  const activeAnimals = animals.filter((a) => a.status === "aktif");
  const inTreatment = treatments.filter((t) => t.outcome === "devam_ediyor");

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-neutral-900">Panel</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Aktif hayvan" value={activeAnimals.length} />
        <StatCard label="Bugunku gorev" value={todayTasks.length} />
        <StatCard label="Geciken gorev" value={overdueTasks.length} tone={overdueTasks.length > 0 ? "warn" : undefined} />
        <StatCard label="Devam eden tedavi" value={inTreatment.length} />
      </div>

      <Section title="Bugunun gorevleri" href="/tasks">
        {todayTasks.length === 0 ? (
          <EmptyRow text="Bugun icin bekleyen gorev yok." />
        ) : (
          todayTasks.map((t) => <TaskRow key={t.id} task={t} />)
        )}
      </Section>

      <Section title="Geciken gorevler" href="/tasks">
        {overdueTasks.length === 0 ? (
          <EmptyRow text="Geciken gorev yok." />
        ) : (
          overdueTasks.map((t) => <TaskRow key={t.id} task={t} />)
        )}
      </Section>

      <Section title="Son tedavi kayitlari" href="/treatments">
        {treatments.length === 0 ? (
          <EmptyRow text="Henuz tedavi kaydi yok." />
        ) : (
          treatments.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <span className="font-medium">{animals.find((a) => a.id === t.animal_id)?.ear_tag ?? "?"}</span>
                <span className="ml-2 text-neutral-500">{t.diagnosis ?? t.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">{formatDate(t.treatment_date)}</span>
                <Badge value={t.outcome} />
              </div>
            </div>
          ))
        )}
      </Section>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <div className={`rounded-lg border p-3 ${tone === "warn" && value > 0 ? "border-amber-300 bg-amber-50" : "border-neutral-200 bg-white"}`}>
      <p className="text-2xl font-semibold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800">{title}</h2>
        <Link href={href} className="text-xs text-green-700 hover:underline">Tumunu gor</Link>
      </div>
      <div className="divide-y divide-neutral-100">{children}</div>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <div>
        <span className="font-medium">{task.title}</span>
        {task.due_time && <span className="ml-2 text-neutral-400">{task.due_time}</span>}
      </div>
      <span className="text-neutral-400">{formatDate(task.due_date)}</span>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="py-2 text-sm text-neutral-400">{text}</p>;
}
