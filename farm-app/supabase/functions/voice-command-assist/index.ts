// Supabase Edge Function: voice-command-assist
//
// Converts a transcribed (speech-to-text) command into a structured action
// the client can execute (start a calf treatment protocol, or create a
// dated task). See ai-assist/index.ts for the full explanation of why this
// lives server-side (the OpenRouter key must never reach the browser) and
// the auth pattern used below.
//
// IMPORTANT - this function only INTERPRETS the command; it never writes to
// the database itself. It returns entity names (ear tag, protocol name) as
// free text, not IDs - the client resolves those against its own
// authoritative animals/protocols list and shows the user a confirmation
// screen before actually executing anything (so a misheard word or a model
// mistake can never silently start the wrong treatment on the wrong
// animal).
//
// Required secrets (set with `supabase secrets set NAME=value`):
//   OPENROUTER_API_KEY - never commit this, keep it only in Supabase secrets
//   OPENROUTER_MODEL    - optional, defaults to google/gemini-2.5-flash-lite
//                          (shared with ai-assist/opu-ai-assist - same secret name)
//
// SUPABASE_URL and SUPABASE_ANON_KEY are provided automatically by the
// Edge Functions runtime and do not need to be set manually.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
const OPENROUTER_MODEL = Deno.env.get("OPENROUTER_MODEL") ?? "google/gemini-2.5-flash-lite";

interface VoiceCommandRequest {
  transcript: string;
  todayIso: string;
  animalEarTags: string[];
  calfProtocolNames: string[];
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Modelin donduryu metinden JSON'u cikarir - bazen ```json ... ``` gibi kod
// bloguna sarilmis olabiliyor.
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  return JSON.parse(candidate.trim());
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "Giriş yapılmamış" }, 401);
    }
    const { data: callerProfile } = await userClient
      .from("profiles")
      .select("is_admin, can_manage_calves, can_manage_tasks")
      .eq("id", user.id)
      .single();
    if (!callerProfile?.is_admin && !callerProfile?.can_manage_calves && !callerProfile?.can_manage_tasks) {
      return jsonResponse({ error: "Bu işlem için yetkiniz yok" }, 403);
    }

    if (!OPENROUTER_API_KEY) {
      return jsonResponse({ error: "OPENROUTER_API_KEY tanımlı değil" }, 500);
    }

    const input = (await req.json()) as VoiceCommandRequest;
    if (!input.transcript?.trim()) {
      return jsonResponse({ error: "transcript zorunlu" }, 400);
    }

    const systemPrompt =
      "Sen bir çiftlik yönetim uygulamasında sesli komutları yorumlayan bir asistansın. Kullanıcı " +
      "konuştu, bu konuşma metne çevrildi ve sana geldi. Görevin bu metni aşağıdaki İKİ işlemden " +
      "birine, ya da hiçbirine uymuyorsa 'unrecognized'e çevirmek. SADECE geçerli JSON döndür, başka " +
      "hiçbir açıklama veya metin ekleme.\n\n" +
      "İşlem 1 - start_calf_protocol: Bir hayvana bir buzağı tedavi protokolü başlatma komutu. " +
      "JSON: {\"action\":\"start_calf_protocol\",\"animalEarTag\":\"<küpe no>\",\"protocolName\":\"<sana " +
      "verilen protokol listesinden EN YAKIN eşleşen protokol adı>\",\"summary\":\"<1 cümlelik Türkçe " +
      "özet, örn: '81 numaralı hayvana Pnömoni Tedavisi protokolü başlatılacak'>\"}\n\n" +
      "İşlem 2 - create_task: Belirli (veya göreceli, örn. 'yarın') bir tarihte yapılacak bir iş için " +
      "görev oluşturma komutu. JSON: {\"action\":\"create_task\",\"title\":\"<kısa görev başlığı>\"," +
      "\"dueDate\":\"<YYYY-MM-DD formatında tarih>\",\"description\":\"<varsa ek detay, yoksa null>\"," +
      "\"animalEarTag\":\"<komutta bir hayvan küpe no geçiyorsa onu, geçmiyorsa null>\",\"summary\":\"<1 " +
      "cümlelik Türkçe özet>\"}\n\n" +
      "Hiçbir işleme uymuyorsa veya hangi hayvan/protokol/tarih olduğu belirsizse: " +
      "{\"action\":\"unrecognized\",\"summary\":\"<neden anlaşılamadığını açıklayan kısa Türkçe not>\"}\n\n" +
      `Bugünün tarihi: ${input.todayIso} (göreceli tarihleri - 'yarın', 'gelecek hafta pazartesi' vb. - buna göre hesapla).\n` +
      `Sistemdeki hayvan küpe numaraları: ${input.animalEarTags.join(", ") || "(kayıt yok)"}\n` +
      `Sistemdeki buzağı tedavi protokolleri: ${input.calfProtocolNames.join(", ") || "(kayıt yok)"}\n\n` +
      "animalEarTag mutlaka yukarıdaki listeden birebir bir küpe numarası olmalı - listede olmayan bir " +
      "numara varsayma. protocolName mutlaka yukarıdaki protokol listesinden biri olmalı - listede iyi " +
      "bir eşleşme yoksa 'unrecognized' döndür, protokol uydurma.";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.transcript },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return jsonResponse({ error: `OpenRouter hatası: ${text}` }, 502);
    }

    const result = await response.json();
    const content: string = result?.choices?.[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = extractJson(content);
    } catch {
      return jsonResponse({ result: { action: "unrecognized", summary: "Komut anlaşılamadı, tekrar deneyin." } });
    }

    return jsonResponse({ result: parsed });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
