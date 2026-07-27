"use client";

import { useEffect, useState } from "react";
import {
  createCalfNote,
  createShiftNote,
  deleteCalfNote,
  listAnimals,
  listCalfNotes,
  listProfiles,
  listShiftNotes,
} from "@/lib/data";
import { Animal, CalfNote, Profile, ShiftNote } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { EarTagPicker } from "@/components/EarTagPicker";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CalfNotesPanel() {
  const { profile } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [shiftNotes, setShiftNotes] = useState<ShiftNote[]>([]);
  const [calfNotes, setCalfNotes] = useState<CalfNote[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [shiftNoteDraft, setShiftNoteDraft] = useState("");
  const [savingShiftNote, setSavingShiftNote] = useState(false);

  const [noteAnimalId, setNoteAnimalId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingCalfNote, setSavingCalfNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  function loadData() {
    return Promise.all([listAnimals(), listShiftNotes(), listCalfNotes(), listProfiles()]);
  }

  useEffect(() => {
    loadData().then(([a, sn, cn, p]) => {
      setAnimals(a);
      setShiftNotes(sn);
      setCalfNotes(cn);
      setProfiles(p);
      setLoading(false);
    });
  }, []);

  async function refresh() {
    const [a, sn, cn, p] = await loadData();
    setAnimals(a);
    setShiftNotes(sn);
    setCalfNotes(cn);
    setProfiles(p);
  }

  const calves = animals.filter((a) => a.weaned_at === null);
  const earTagFor = (animalId: string) => animals.find((a) => a.id === animalId)?.ear_tag ?? "?";
  const nameFor = (id: string | null) => (id ? profiles.find((p) => p.id === id)?.full_name : null);

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

  if (loading) return <p className="text-sm text-neutral-500">Yükleniyor...</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <section className="card space-y-2">
        <h2 className="text-sm font-semibold text-neutral-800">Vardiya Devir Notu</h2>
        <form onSubmit={handleShiftNoteSubmit} className="flex gap-2">
          <input
            value={shiftNoteDraft}
            onChange={(e) => setShiftNoteDraft(e.target.value)}
            placeholder="örn. TR-1042 bugün az içti, takip edilsin"
            className="input flex-1"
          />
          <button type="submit" disabled={savingShiftNote || !shiftNoteDraft.trim()} className="btn-primary shrink-0">
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

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-neutral-800">Buzağı Notu Ekle</h2>
        {hasPermission(profile, "can_manage_calves") && (
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
            <button type="submit" disabled={savingCalfNote || !noteAnimalId || !noteDraft.trim()} className="btn-primary">
              {savingCalfNote ? "Kaydediliyor..." : "Not Ekle"}
            </button>
          </form>
        )}

        {calfNotes.length === 0 ? (
          <p className="text-sm text-neutral-400">Henüz gözlem notu yok.</p>
        ) : (
          <div className="max-h-56 divide-y divide-neutral-100 overflow-y-auto">
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
