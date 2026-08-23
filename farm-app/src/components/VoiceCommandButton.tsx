"use client";

import { useRef, useState } from "react";
import {
  createCalfTreatmentCourse,
  createTask,
  listAnimals,
  listCalfProtocols,
  listCalfTreatmentCourses,
  requestVoiceCommand,
} from "@/lib/data";
import { Animal, CalfProtocol, VoiceCommandResult } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { describeError } from "@/lib/errors";
import { todayIso } from "@/lib/format";

// Tarayicinin yerlesik konusma-tanima API'si icin minimal tipler (resmi
// TypeScript lib'lerinde henuz yok, sadece Chrome/Android Chrome'da mevcut).
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResultList {
  [index: number]: { [index: number]: SpeechRecognitionAlternative };
}
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.webkitSpeechRecognition ?? w.SpeechRecognition ?? null;
}

type PendingAction =
  | { action: "start_calf_protocol"; animal: Animal; protocol: CalfProtocol; summary: string }
  | { action: "create_task"; title: string; dueDate: string; description: string | null; summary: string };

export function VoiceCommandButton() {
  const { profile } = useAuth();
  const canUse = hasPermission(profile, "can_manage_calves") || hasPermission(profile, "can_manage_tasks");

  const [open, setOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Bu buton sadece kullanici panel'i actiginda (client-only bir etkilesim
  // sonrasi) DOM'a giriyor, bu yuzden window'a erisim icin useEffect yerine
  // lazy state initializer kullanmak hydration uyumsuzlugu yaratmiyor.
  const [speechSupported] = useState(() => getSpeechRecognitionCtor() !== null);

  function resetPanel() {
    setTranscript("");
    setError(null);
    setNotice(null);
    setPending(null);
    setDoneMessage(null);
  }

  function openPanel() {
    resetPanel();
    setOpen(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function closePanel() {
    stopListening();
    setOpen(false);
  }

  function startListening() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = "tr-TR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setTranscript((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  async function resolveResult(result: VoiceCommandResult, animals: Animal[], protocols: CalfProtocol[]) {
    if (result.action === "unrecognized") {
      setNotice(result.summary);
      return;
    }
    if (result.action === "start_calf_protocol") {
      const animal = animals.find((a) => a.ear_tag === result.animalEarTag);
      const protocol = protocols.find((p) => p.name === result.protocolName);
      if (!animal || !protocol) {
        setNotice("Hayvan veya protokol sistemde bulunamadı, lütfen tekrar deneyin.");
        return;
      }
      const courses = await listCalfTreatmentCourses();
      const hasActive = courses.some((c) => c.animal_id === animal.id && c.status === "aktif");
      if (hasActive) {
        setNotice(`${animal.ear_tag} numaralı hayvanın zaten aktif bir tedavisi var. Önce onu tamamlayın veya iptal edin.`);
        return;
      }
      setPending({ action: "start_calf_protocol", animal, protocol, summary: result.summary });
      return;
    }
    setPending({
      action: "create_task",
      title: result.title,
      dueDate: result.dueDate,
      description: result.description,
      summary: result.summary,
    });
  }

  async function handleSubmitTranscript() {
    if (!transcript.trim()) return;
    stopListening();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const [animals, protocols] = await Promise.all([listAnimals(), listCalfProtocols()]);
      const result = await requestVoiceCommand({
        transcript: transcript.trim(),
        todayIso: todayIso(),
        animalEarTags: animals.map((a) => a.ear_tag),
        calfProtocolNames: protocols.map((p) => p.name),
      });
      await resolveResult(result, animals, protocols);
    } catch (err) {
      setError(describeError(err, "Komut işlenemedi, tekrar deneyin."));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!pending || !profile) return;
    setBusy(true);
    setError(null);
    try {
      if (pending.action === "start_calf_protocol") {
        await createCalfTreatmentCourse({
          animal_id: pending.animal.id,
          protocol_id: pending.protocol.id,
          start_date: todayIso(),
          created_by: profile.id,
        });
        setDoneMessage(`${pending.animal.ear_tag} numaralı hayvana ${pending.protocol.name} tedavisi başlatıldı.`);
      } else {
        await createTask({
          title: pending.title,
          description: pending.description,
          assigned_to: profile.id,
          assigned_by: profile.id,
          due_date: pending.dueDate,
          due_time: null,
          status: "bekliyor",
          image_url: null,
          completed_by: null,
          completed_at: null,
          completion_note: null,
          completion_image_url: null,
        });
        setDoneMessage(`"${pending.title}" görevi oluşturuldu.`);
      }
      setPending(null);
      setTranscript("");
    } catch (err) {
      setError(describeError(err, "İşlem gerçekleştirilemedi."));
    } finally {
      setBusy(false);
    }
  }

  if (!canUse) return null;

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className="fixed bottom-5 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-2xl text-white shadow-lg shadow-green-900/30 transition-transform hover:scale-105"
        aria-label="Sesli komut"
      >
        🎤
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={closePanel}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-800">🎤 Sesli Komut</h2>
              <button type="button" onClick={closePanel} className="text-xs text-neutral-500 underline">
                Kapat
              </button>
            </div>

            {doneMessage ? (
              <div className="space-y-3">
                <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{doneMessage}</p>
                <button type="button" onClick={resetPanel} className="btn-secondary w-full">
                  Yeni Komut
                </button>
              </div>
            ) : pending ? (
              <div className="space-y-3">
                <p className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800">
                  🎤 Anladığım: {pending.summary}
                </p>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={handleConfirm} className="btn-primary flex-1">
                    {busy ? "Uygulanıyor..." : "Onayla"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPending(null)}
                    className="btn-secondary flex-1"
                  >
                    İptal
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Örn: 81 numaralı hayvana Pnömoni Tedavisi başla"
                  className="input"
                  rows={3}
                />
                {speechSupported && (
                  <button
                    type="button"
                    onClick={listening ? stopListening : startListening}
                    className={`w-full rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      listening ? "border-red-300 bg-red-50 text-red-700" : "border-neutral-300 text-neutral-700"
                    }`}
                  >
                    {listening ? "🎙️ Dinleniyor... (durdurmak için dokun)" : "🎤 Sesle Söyle"}
                  </button>
                )}
                {notice && <p className="text-sm text-amber-700">{notice}</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="button"
                  disabled={loading || !transcript.trim()}
                  onClick={handleSubmitTranscript}
                  className="btn-primary w-full"
                >
                  {loading ? "İşleniyor..." : "Gönder"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
