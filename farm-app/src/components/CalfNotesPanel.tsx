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
  const [showHistory, setShowHistory] = useState(false);

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

  const [latest, ...older] = shiftNotes;

  return (
    <section className="card space-y-1.5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold text-neutral-800">Vardiya Devir Notu</h2>
        {older.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-[11px] font-medium text-green-700 hover:underline"
          >
            {showHistory ? "Gizle" : `Geçmiş (${older.length})`}
          </button>
        )}
      </div>
      <form onSubmit={handleShiftNoteSubmit} className="flex gap-1.5">
        <input
          value={shiftNoteDraft}
          onChange={(e) => setShiftNoteDraft(e.target.value)}
          placeholder="örn. TR-1042 bugün az içti, takip edilsin"
          className="input flex-1 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={savingShiftNote || !shiftNoteDraft.trim()}
          className="btn-primary shrink-0 px-3 py-1.5 text-sm"
        >
          {savingShiftNote ? "..." : "Not Bırak"}
        </button>
      </form>
      {!latest ? (
        <p className="text-xs text-neutral-400">Henüz devir notu yok.</p>
      ) : (
        <div className="text-xs">
          <p className="text-neutral-700">{latest.note}</p>
          <p className="text-[11px] text-neutral-400">
            {nameFor(latest.created_by) ?? "-"} &middot; {formatDateTime(latest.created_at)}
          </p>
        </div>
      )}
      {showHistory && older.length > 0 && (
        <div className="divide-y divide-neutral-100 border-t border-neutral-100 pt-1">
          {older.slice(0, 4).map((n) => (
            <div key={n.id} className="py-1 text-xs">
              <p className="text-neutral-700">{n.note}</p>
              <p className="text-[11px] text-neutral-400">
                {nameFor(n.created_by) ?? "-"} &middot; {formatDateTime(n.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
