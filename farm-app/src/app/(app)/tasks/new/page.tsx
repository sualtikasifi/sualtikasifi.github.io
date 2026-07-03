"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createTask, listProfiles } from "@/lib/data";
import { Profile } from "@/lib/types";
import { useAuth } from "@/lib/auth";

export default function NewTaskPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    due_date: new Date().toISOString().slice(0, 10),
    due_time: "",
  });

  useEffect(() => {
    listProfiles().then((p) => {
      setProfiles(p);
      setForm((f) => ({ ...f, assigned_to: f.assigned_to || p[0]?.id || "" }));
    });
  }, []);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.assigned_to) return;
    setSubmitting(true);
    await createTask({
      title: form.title.trim(),
      description: form.description.trim() || null,
      assigned_to: form.assigned_to,
      assigned_by: profile?.id ?? null,
      due_date: form.due_date,
      due_time: form.due_time || null,
      status: "bekliyor",
    });
    setSubmitting(false);
    router.push("/tasks");
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Yeni gorev</h1>
      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <Field label="Baslik *">
          <input required value={form.title} onChange={(e) => update("title", e.target.value)} className="input" />
        </Field>
        <Field label="Aciklama">
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="input" rows={3} />
        </Field>
        <Field label="Kime atanacak">
          <select value={form.assigned_to} onChange={(e) => update("assigned_to", e.target.value)} className="input">
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tarih">
            <input type="date" value={form.due_date} onChange={(e) => update("due_date", e.target.value)} className="input" />
          </Field>
          <Field label="Saat (opsiyonel)">
            <input type="time" value={form.due_time} onChange={(e) => update("due_time", e.target.value)} className="input" />
          </Field>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
        >
          {submitting ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  );
}
