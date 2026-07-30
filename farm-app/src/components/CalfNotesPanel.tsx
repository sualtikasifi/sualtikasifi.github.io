"use client";

import { useEffect, useState } from "react";
import { createShiftNote, listProfiles, listShiftNotes } from "@/lib/data";
import { Profile, ShiftNote } from "@/lib/types";
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

// Vardiya devir notlari. (Buzagiya ozel notlar artik kulubeye tiklanarak
// hayvanin kendi penceresinden ekleniyor.)
export function CalfNotesPanel() {
  const { profile } = useAuth();
  const [shiftNotes, setShiftNotes] = useState<ShiftNote[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [shiftNoteDraft, setShiftNoteDraft] = useState("");
  const [savingShiftNote, setSavingShiftNote] = useState(false);

  useEffect(() => {
    Promise.all([listShiftNotes(), listProfiles()]).then(([sn, p]) => {
      setShiftNotes(sn);
      setProfiles(p);
      setLoading(false);
    });
  }, []);

  const nameFor = (id: string | null) => (id ? profiles.find((p) => p.id === id)?.full_name : null);

  async function handleShiftNoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !shiftNoteDraft.trim()) return;
    setSavingShiftNote(true);
    await createShiftNote(shiftNoteDraft.trim(), profile.id);
    setShiftNoteDraft("");
    setShiftNotes(await listShiftNotes());
    setSavingShiftNote(false);
  }

  if (loading) return <p className="text-sm text-neutral-500">Yükleniyor...</p>;

  return (
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
  );
}
