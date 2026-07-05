"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listAllMastitisDoses,
  listAnimals,
  listEmbryos,
  listMastitisTreatments,
  listSemenInventory,
  listTasks,
} from "@/lib/data";
import { Animal, Embryo, MastitisDose, MastitisTreatment, SemenInventory, Task } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { formatDate, todayIso } from "@/lib/format";
import { getTodaysMastitisReminders, isMastitisReminderActive, isMastitisWarningActive } from "@/lib/mastitisReminder";
import { MastitisReminderCard } from "@/components/MastitisReminderCard";

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mastitisTreatments, setMastitisTreatments] = useState<MastitisTreatment[]>([]);
  const [mastitisDoses, setMastitisDoses] = useState<MastitisDose[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [inventory, setInventory] = useState<SemenInventory[]>([]);
  const [embryos, setEmbryos] = useState<Embryo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listTasks(),
      listMastitisTreatments(),
      listAllMastitisDoses(),
      listAnimals(),
      listSemenInventory(),
      listEmbryos(),
    ]).then(([t, mt, doses, a, inv, emb]) => {
      setTasks(t);
      setMastitisTreatments(mt);
      setMastitisDoses(doses);
      setAnimals(a);
      setInventory(inv);
      setEmbryos(emb);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <p className="text-sm text-neutral-500">Yükleniyor...</p>;
  }

  const today = todayIso();
  const pending = tasks.filter((t) => t.status === "bekliyor");
  const todayTasks = pending.filter((t) => t.due_date === today);
  const overdueTasks = pending.filter((t) => t.due_date < today);
  const activeAnimals = animals.filter((a) => a.status === "aktif");
  const inTreatment = mastitisTreatments.filter((t) => !t.ended_at);
  const lowStockRows = inventory.filter((i) => i.straw_count + i.tank_straw_count <= 5);
  const developingEmbryos = embryos.filter((e) => e.status === "gelisiyor");
  const mastitisReminders = getTodaysMastitisReminders(mastitisTreatments, mastitisDoses, animals);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-neutral-900">Panel</h1>

      {isMastitisReminderActive() && mastitisReminders.length > 0 && (
        <MastitisReminderCard reminders={mastitisReminders} warning={isMastitisWarningActive()} />
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <StatCard label="Aktif hayvan" value={activeAnimals.length} />
        <StatCard label="Bugünkü görev" value={todayTasks.length} />
        <StatCard label="Geciken görev" value={overdueTasks.length} tone={overdueTasks.length > 0 ? "warn" : undefined} />
        <StatCard label="Devam eden mastitis" value={inTreatment.length} />
        <StatCard label="Düşük sperma stoğu" value={lowStockRows.length} tone={lowStockRows.length > 0 ? "warn" : undefined} />
        <StatCard label="Gelişen embriyo" value={developingEmbryos.length} />
      </div>

      <Section title="Bugünün görevleri" href="/tasks">
        {todayTasks.length === 0 ? (
          <EmptyRow text="Bugün için bekleyen görev yok." />
        ) : (
          todayTasks.map((t) => <TaskRow key={t.id} task={t} />)
        )}
      </Section>

      <Section title="Geciken görevler" href="/tasks">
        {overdueTasks.length === 0 ? (
          <EmptyRow text="Geciken görev yok." />
        ) : (
          overdueTasks.map((t) => <TaskRow key={t.id} task={t} />)
        )}
      </Section>

      <Section title="Son mastitis kayıtları" href="/treatments">
        {mastitisTreatments.length === 0 ? (
          <EmptyRow text="Henüz mastitis kaydı yok." />
        ) : (
          mastitisTreatments.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{animals.find((a) => a.id === t.animal_id)?.ear_tag ?? "?"}</span>
                {t.udder_quarters.map((q) => (
                  <Badge key={q} value={q} />
                ))}
                {t.diagnosis && <span className="text-neutral-500">{t.diagnosis}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">{formatDate(t.start_date)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.ended_at ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {t.ended_at ? "Tamamlandı" : "Devam ediyor"}
                </span>
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
    <div className={`rounded-xl border p-3 shadow-sm transition-colors ${tone === "warn" && value > 0 ? "border-amber-300 bg-amber-50" : "border-neutral-200 bg-white"}`}>
      <p className="text-2xl font-semibold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800">{title}</h2>
        <Link href={href} className="text-xs font-medium text-green-700 hover:underline">Tümünü gör</Link>
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
