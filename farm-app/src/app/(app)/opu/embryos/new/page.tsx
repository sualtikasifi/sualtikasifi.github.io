"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createEmbryo } from "@/lib/data";
import { EmbryoGrade, EmbryoStage } from "@/lib/types";
import { useAuth } from "@/lib/auth";

export default function NewEmbryoPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Yukleniyor...</p>}>
      <NewEmbryoContent />
    </Suspense>
  );
}

function NewEmbryoContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { profile } = useAuth();
  const sessionId = params.get("sessionId") ?? "";

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    label: "",
    grade: "" as EmbryoGrade | "",
    stage: "" as EmbryoStage | "",
    day_reached: "",
    notes: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || !form.label.trim()) return;
    setSubmitting(true);
    await createEmbryo({
      opu_session_id: sessionId,
      label: form.label.trim(),
      grade: form.grade || null,
      stage: form.stage || null,
      day_reached: form.day_reached ? Number(form.day_reached) : null,
      status: "gelisiyor",
      recipient_animal_id: null,
      transfer_date: null,
      notes: form.notes.trim() || null,
      created_by: profile?.id ?? null,
    });
    setSubmitting(false);
    router.push(`/opu/detail?id=${sessionId}`);
  }

  if (!sessionId) return <p className="text-sm text-red-600">OPU seansi belirtilmedi.</p>;

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Yeni embriyo</h1>
      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <Field label="Etiket *">
          <input
            required
            placeholder="orn. E1"
            value={form.label}
            onChange={(e) => update("label", e.target.value)}
            className="input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Grade (kalite)">
            <select value={form.grade} onChange={(e) => update("grade", e.target.value as EmbryoGrade)} className="input">
              <option value="">Secilmedi</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </Field>
          <Field label="Gun (Dx)">
            <input
              type="number"
              min={0}
              value={form.day_reached}
              onChange={(e) => update("day_reached", e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <Field label="Gelisim asamasi">
          <select value={form.stage} onChange={(e) => update("stage", e.target.value as EmbryoStage)} className="input">
            <option value="">Secilmedi</option>
            <option value="morula">Morula</option>
            <option value="erken_blastosist">Erken Blastosist</option>
            <option value="blastosist">Blastosist</option>
            <option value="genisleyen_blastosist">Genisleyen Blastosist</option>
            <option value="yumurtadan_cikan_blastosist">Yumurtadan Cikan Blastosist</option>
          </select>
        </Field>

        <Field label="Notlar">
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="input" rows={3} />
        </Field>

        <button
          type="submit"
          disabled={submitting || !form.label.trim()}
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
