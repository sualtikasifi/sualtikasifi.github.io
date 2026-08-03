"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listAllMastitisDoses, listAnimals, listMastitisTreatments, listTasks } from "@/lib/data";
import { Animal, MastitisDose, MastitisTreatment, Task } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { formatDate, todayIso } from "@/lib/format";
import { getTodaysMastitisReminders, isMastitisReminderActive, isMastitisWarningActive } from "@/lib/mastitisReminder";
import { MastitisReminderCard } from "@/components/MastitisReminderCard";

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mastitisTreatments, setMastitisTreatments] = useState<MastitisTreatment[]>([]);
  const [mastitisDoses, setMastitisDoses] = useState<MastitisDose[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listTasks(), listMastitisTreatments(), listAllMastitisDoses(), listAnimals()]).then(
      ([t, mt, doses, a]) => {
        setTasks(t);
        setMastitisTreatments(mt);
        setMastitisDoses(doses);
        setAnimals(a);
        setLoading(false);
      }
    );
  }, []);

  if (loading) {
    return <p className="text-sm text-neutral-500">Yükleniyor...</p>;
  }

  const today = todayIso();
  const pending = tasks.filter((t) => t.status === "bekliyor");
  const todayTasks = pending.filter((t) => t.due_date === today);
  const overdueTasks = pending.filter((t) => t.due_date < today);
  const inTreatment = mastitisTreatments.filter((t) => !t.ended_at);
  const mastitisReminders = getTodaysMastitisReminders(mastitisTreatments, mastitisDoses, animals);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <span className="page-header-icon bg-gradient-to-br from-green-500 to-green-700 text-white">🌾</span>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Panel</h1>
          <p className="text-xs text-neutral-500">Çiftliğin bugünkü genel durumu</p>
        </div>
      </div>

      {isMastitisReminderActive() && mastitisReminders.length > 0 && (
        <MastitisReminderCard reminders={mastitisReminders} warning={isMastitisWarningActive()} />
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon="📅" label="Bugünkü görev" value={todayTasks.length} color="sky" />
        <StatCard icon="⏰" label="Geciken görev" value={overdueTasks.length} color={overdueTasks.length > 0 ? "amber" : "neutral"} />
        <StatCard icon="💉" label="Devam eden mastitis" value={inTreatment.length} color="rose" />
      </div>

      <Section title="Bugünün görevleri" icon="📅" href="/tasks">
        {todayTasks.length === 0 ? (
          <EmptyRow text="Bugün için bekleyen görev yok." />
        ) : (
          todayTasks.map((t) => <TaskRow key={t.id} task={t} />)
        )}
      </Section>

      <Section title="Geciken görevler" icon="⏰" href="/tasks">
        {overdueTasks.length === 0 ? (
          <EmptyRow text="Geciken görev yok." />
        ) : (
          overdueTasks.map((t) => <TaskRow key={t.id} task={t} />)
        )}
      </Section>

      <Section title="Son mastitis kayıtları" icon="💉" href="/treatments">
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

const STAT_COLORS = {
  green: "border-green-200 bg-green-50/70 text-green-900",
  sky: "border-sky-200 bg-sky-50/70 text-sky-900",
  amber: "border-amber-300 bg-amber-50 text-amber-900",
  rose: "border-rose-200 bg-rose-50/70 text-rose-900",
  purple: "border-purple-200 bg-purple-50/70 text-purple-900",
  neutral: "border-neutral-200 bg-white text-neutral-900",
} as const;

function StatCard({
  icon,
  label,
  value,
  color = "neutral",
}: {
  icon: string;
  label: string;
  value: number;
  color?: keyof typeof STAT_COLORS;
}) {
  return (
    <div className={`stat-tile ${STAT_COLORS[color]}`}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-lg">{icon}</span>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <p className="text-xs font-medium opacity-80">{label}</p>
    </div>
  );
}

function Section({
  title,
  icon,
  href,
  children,
}: {
  title: string;
  icon: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
          <span aria-hidden>{icon}</span>
          {title}
        </h2>
        <Link href={href} className="text-xs font-semibold text-green-700 hover:underline">
          Tümünü gör →
        </Link>
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
