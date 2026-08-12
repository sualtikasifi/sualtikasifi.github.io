// Supabase Edge Function: ai-assist
//
// Proxies a calf-health decision-support request to OpenRouter. The
// OpenRouter API key is a paid credential and must never reach the
// browser, so the app calls this function (via
// supabase.functions.invoke("ai-assist", { body: {...} })) instead of
// calling OpenRouter directly, and this function is the only place that
// holds the key.
//
// Every request MUST come from a logged-in app user (checked below using
// the CALLER's own JWT, same pattern as send-push) - an unauthenticated
// caller who merely discovers this function's URL cannot use it, so they
// cannot spend the OpenRouter balance.
//
// Required secrets (set with `supabase secrets set NAME=value`):
//   OPENROUTER_API_KEY - never commit this, keep it only in Supabase secrets
//   OPENROUTER_MODEL    - optional, defaults to anthropic/claude-haiku-4.5
//
// SUPABASE_URL and SUPABASE_ANON_KEY are provided automatically by the
// Edge Functions runtime and do not need to be set manually.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
const OPENROUTER_MODEL = Deno.env.get("OPENROUTER_MODEL") ?? "anthropic/claude-haiku-4.5";

const DISCLAIMER =
  "\n\n⚠️ Bu bir karar destek önerisidir; kesin teşhis ve tedaviye veteriner hekim karar vermelidir.";

interface TreatmentLogInput {
  date: string;
  protocolDay: number | null;
  description: string;
  note: string | null;
}

interface TreatmentCourseInput {
  protocolName: string;
  startDate: string;
  status: string;
  logs: TreatmentLogInput[];
}

interface AiAssistRequest {
  earTag: string;
  ageDays: number | null;
  birthDate: string | null;
  bloodBrix: number | null;
  colostrum1Liters: number | null;
  colostrum1Brix: number | null;
  colostrum2Liters: number | null;
  colostrum2Brix: number | null;
  treatmentHistory: TreatmentCourseInput[];
  selectedDiagnosis: string;
}

function buildPrompt(input: AiAssistRequest): string {
  const lines: string[] = [];
  lines.push(`Küpe No: ${input.earTag}`);
  lines.push(`Yaş: ${input.ageDays != null ? `${input.ageDays} günlük` : "bilinmiyor"}`);
  lines.push(`Doğum tarihi: ${input.birthDate ?? "bilinmiyor"}`);
  lines.push(
    `1. Kolostrum: ${input.colostrum1Liters ?? "-"} litre, Brix ${input.colostrum1Brix ?? "-"}`
  );
  lines.push(
    `2. Kolostrum: ${input.colostrum2Liters ?? "-"} litre, Brix ${input.colostrum2Brix ?? "-"}`
  );
  lines.push(`Kan Brix: ${input.bloodBrix ?? "ölçülmemiş"}`);
  lines.push("");
  if (input.treatmentHistory.length === 0) {
    lines.push("Geçmiş tedavi kaydı yok.");
  } else {
    lines.push("Tedavi geçmişi:");
    for (const course of input.treatmentHistory) {
      lines.push(`- ${course.protocolName} (${course.startDate}, durum: ${course.status})`);
      for (const log of course.logs) {
        lines.push(
          `  · ${log.date}${log.protocolDay != null ? ` gün ${log.protocolDay}` : ""}: ${log.description}${
            log.note ? ` (not: ${log.note})` : ""
          }`
        );
      }
    }
  }
  lines.push("");
  lines.push(`Yeni konulan teşhis: ${input.selectedDiagnosis}`);
  return lines.join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
      return new Response(JSON.stringify({ error: "Giriş yapılmamış" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: callerProfile } = await userClient
      .from("profiles")
      .select("is_admin, can_manage_calves")
      .eq("id", user.id)
      .single();
    if (!callerProfile?.is_admin && !callerProfile?.can_manage_calves) {
      return new Response(JSON.stringify({ error: "Bu işlem için yetkiniz yok" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY tanımlı değil" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const input = (await req.json()) as AiAssistRequest;
    if (!input.earTag || !input.selectedDiagnosis) {
      return new Response(JSON.stringify({ error: "earTag ve selectedDiagnosis zorunlu" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt =
      "Sen bir çiftlik yönetim uygulamasında buzağı sağlığı konusunda karar destek asistanısın. " +
      "Sana bir buzağının doğum/kolostrum/kan brix bilgileri, bugüne kadarki tüm tedavi geçmişi ve yeni " +
      "konulan bir teşhis verilecek. Görevin: (1) hayvanın sağlık geçmişini 1-2 cümlede özetlemek, " +
      "(2) bu teşhis için daha önce denenmiş tedavileri belirtip AYNISINI tekrar önermemek, " +
      "(3) denenmemiş, uygun bir tedavi/protokol önermek, (4) kolostrum/kan brix değerleri düşükse " +
      "(pasif bağışıklık yetersizliği riski) bunu özellikle belirtmek. Kısa, net, Türkçe ve madde " +
      "işaretli yaz. Kesin tıbbi teşhis koyma, bu bir öneri niteliğindedir.";

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
          { role: "user", content: buildPrompt(input) },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: `OpenRouter hatası: ${text}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const answer: string = result?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ answer: answer + DISCLAIMER }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
