"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createTask, createTaskAnimals, listAnimals, listProfiles, sendPushNotification } from "@/lib/data";
import { Animal, Profile } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { ImageUploadField } from "@/components/ImageUploadField";
import { EarTagMultiPicker } from "@/components/EarTagMultiPicker";

export default function NewTaskPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [withChecklist, setWithChecklist] = useState(false);
  const [checklistAnimalIds, setChecklistAnimalIds] = useState<string[]>([]);
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
    listAnimals().then(setAnimals);
  }, []);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.assigned_to) return;
    setSubmitting(true);
    const task = await createTask({
      title: form.title.trim(),
      description: form.description.trim() || null,
      assigned_to: form.assigned_to === "herkes" ? null : form.assigned_to,
      assigned_by: profile?.id ?? null,
      due_date: form.due_date,
      due_time: form.due_time || null,
      status: "bekliyor",
      image_url: imageUrl,
      completed_by: null,
      completed_at: null,
      completion_note: null,
      completion_image_url: null,
    });
    if (withChecklist && checklistAnimalIds.length > 0) {
      await createTaskAnimals(task.id, checklistAnimalIds);
    }
    try {
      await sendPushNotification({
        title: task.assigned_to ? "Yeni görev atandı" : "Yeni görev (Herkes)",
        body: task.title,
        targetProfileId: task.assigned_to,
        url: "/tasks",
      });
    } catch {
      // Bildirim gönderimi görev oluşturmayı engellemez.
    }
    setSubmitting(false);
    router.push("/tasks");
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Yeni görev</h1>
      <form onSubmit={handleSubmit} className="card space-y-3">
        <Field label="Başlık *">
          <input required value={form.title} onChange={(e) => update("title", e.target.value)} className="input" />
        </Field>
        <Field label="Açıklama">
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="input" rows={3} />
        </Field>
        <Field label="Kime atanacak">
          <select value={form.assigned_to} onChange={(e) => update("assigned_to", e.target.value)} className="input">
            <option value="herkes">Herkes</option>
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

        <ImageUploadField label="Referans fotoğrafı (opsiyonel)" value={imageUrl} onChange={setImageUrl} />

        <div className="rounded-md border border-neutral-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={withChecklist}
              onChange={(e) => {
                setWithChecklist(e.target.checked);
                if (!e.target.checked) setChecklistAnimalIds([]);
              }}
            />
            Bu göreve hayvan listesi ekle (örn. aşı takibi)
          </label>
          {withChecklist && (
            <div className="mt-3">
              <EarTagMultiPicker animals={animals} selectedIds={checklistAnimalIds} onChange={setChecklistAnimalIds} />
            </div>
          )}
        </div>

        <button type="submit" disabled={submitting} className="btn-primary">
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
