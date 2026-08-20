// Supabase Edge Function: opu-ai-assist
//
// Proxies an OPU-day decision-support request to OpenRouter, comparing a
// day's oocyte collection (overall and per-donor) against historical
// averages. See ai-assist/index.ts for the full explanation of why this
// lives server-side (the OpenRouter key must never reach the browser) and
// the auth pattern used below.
//
// Required secrets (set with `supabase secrets set NAME=value`):
//   OPENROUTER_API_KEY - never commit this, keep it only in Supabase secrets
//   OPENROUTER_MODEL    - optional, defaults to google/gemini-2.5-flash-lite
//                          (shared with ai-assist - same secret name)
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

const DISCLAIMER = "\n\n(Bu analiz geçmiş verilerle karşılaştırmaya dayanır, saha gözlemlerinizle birlikte değerlendirin.)";

interface DonorInput {
  earTag: string;
  oocyteCount: number;
  gradeA: number;
  gradeB: number;
  gradeC: number;
  gradeD: number;
  historicalAvgOocytes: number | null;
  historicalSessionCount: number;
  // Son 3 OPU seansinda (bugun dahil) hep 2 veya daha az oosit verdiyse true -
  // client tarafinda kesin sayimla hesaplanir, AI'nin yanlis sayabilecegi bir
  // sey degildir, sadece bunu vurgulamasi isteniyor.
  lowYieldStreak: boolean;
}

interface HistoricalAverages {
  batchCount: number;
  avgOocytesPerDonor: number | null;
  avgGradeAPct: number | null;
  avgGradeBPct: number | null;
  avgGradeCPct: number | null;
  avgGradeDPct: number | null;
  avgMaturationRate: number | null;
  avgEmbryoRate: number | null;
}

interface OpuAiAssistRequest {
  batchDate: string;
  donorCount: number;
  totalOocytes: number;
  gradeTotals: { a: number; b: number; c: number; d: number };
  maturationCount: number | null;
  maturationRate: number | null;
  embryoCount: number | null;
  embryoRate: number | null;
  donors: DonorInput[];
  historicalAverages: HistoricalAverages;
}

function pct(v: number | null): string {
  return v != null ? `%${Math.round(v * 100)}` : "bilinmiyor";
}

// LLM'ler kucuk sayisal farklarda (orn. 3 ile 3.7) yon hesaplamasini
// (ustunde mi altinda mi) yanlis yapabiliyor - bu yuzden yon+fark burada
// deterministik olarak hesaplanip prompt'a hazir etiket olarak veriliyor;
// modelin kendi hesap yapmasina gerek birakilmiyor.
function compareCount(today: number, hist: number | null): string {
  if (hist == null) return "";
  const diff = today - hist;
  if (Math.abs(diff) < 0.05) return "(ortalamayla aynı)";
  const diffStr = `${diff > 0 ? "+" : ""}${diff.toFixed(1)} oosit`;
  return diff > 0 ? `(ortalamanın ÜZERİNDE, fark: ${diffStr})` : `(ortalamanın ALTINDA, fark: ${diffStr})`;
}

function comparePct(todayFrac: number, histFrac: number | null): string {
  if (histFrac == null) return "";
  const diff = Math.round(todayFrac * 100) - Math.round(histFrac * 100);
  if (diff === 0) return "(ortalamayla aynı)";
  return diff > 0 ? `(ortalamanın ÜZERİNDE, fark: +${diff} puan)` : `(ortalamanın ALTINDA, fark: ${diff} puan)`;
}

function buildPrompt(input: OpuAiAssistRequest): string {
  const h = input.historicalAverages;
  const lines: string[] = [];
  lines.push(`OPU Günü: ${input.batchDate}`);
  lines.push(`Donör sayısı: ${input.donorCount}`);
  lines.push(`Toplam oosit: ${input.totalOocytes}`);
  lines.push(
    `Kalite dağılımı: A ${input.gradeTotals.a} · B ${input.gradeTotals.b} · C ${input.gradeTotals.c} · D ${input.gradeTotals.d}`
  );
  lines.push(`Maturasyona konulan: ${input.maturationCount ?? "-"} (oran: ${pct(input.maturationRate)})`);
  lines.push(`Embriyoya dönüşen: ${input.embryoCount ?? "-"} (oran: ${pct(input.embryoRate)})`);
  lines.push("");
  lines.push(`Geçmiş ${h.batchCount} OPU gününün ortalamaları:`);
  lines.push(`- Donör başı ortalama oosit: ${h.avgOocytesPerDonor?.toFixed(1) ?? "veri yok"}`);
  lines.push(
    `- Ortalama kalite dağılımı: A ${pct(h.avgGradeAPct)} · B ${pct(h.avgGradeBPct)} · C ${pct(h.avgGradeCPct)} · D ${pct(h.avgGradeDPct)}`
  );
  lines.push(`- Ortalama maturasyon oranı: ${pct(h.avgMaturationRate)}`);
  lines.push(`- Ortalama embriyoya dönüşme oranı: ${pct(h.avgEmbryoRate)}`);
  if (input.totalOocytes > 0) {
    const todayA = input.gradeTotals.a / input.totalOocytes;
    const todayB = input.gradeTotals.b / input.totalOocytes;
    const todayC = input.gradeTotals.c / input.totalOocytes;
    const todayD = input.gradeTotals.d / input.totalOocytes;
    lines.push("");
    lines.push(
      "Kalite karşılaştırması (bugün vs geçmiş ortalama, yön ve fark ÖNCEDEN HESAPLANMIŞ - AYNEN kullan, kendin yeniden hesaplama):"
    );
    lines.push(`- A: bugün ${pct(todayA)} ${comparePct(todayA, h.avgGradeAPct)}`);
    lines.push(`- B: bugün ${pct(todayB)} ${comparePct(todayB, h.avgGradeBPct)}`);
    lines.push(`- C: bugün ${pct(todayC)} ${comparePct(todayC, h.avgGradeCPct)}`);
    lines.push(`- D: bugün ${pct(todayD)} ${comparePct(todayD, h.avgGradeDPct)}`);
  }
  lines.push("");
  lines.push(
    "Donör bazlı (bugün vs. o donörün kendi geçmiş ortalaması - yön ve fark ÖNCEDEN HESAPLANMIŞ, AYNEN kullan):"
  );
  for (const d of input.donors) {
    const hist =
      d.historicalAvgOocytes != null
        ? `geçmiş ort. ${d.historicalAvgOocytes.toFixed(1)} oosit (${d.historicalSessionCount} kayıt) ${compareCount(d.oocyteCount, d.historicalAvgOocytes)}`
        : "geçmiş kaydı yok";
    const streak = d.lowYieldStreak ? " [SON 3 SEANSTIR ≤2 OOSİT]" : "";
    lines.push(
      `- ${d.earTag}: bugün ${d.oocyteCount} oosit (A${d.gradeA} B${d.gradeB} C${d.gradeC} D${d.gradeD}), ${hist}${streak}`
    );
  }
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
      .select("is_admin, can_manage_opu")
      .eq("id", user.id)
      .single();
    if (!callerProfile?.is_admin && !callerProfile?.can_manage_opu) {
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

    const input = (await req.json()) as OpuAiAssistRequest;
    if (!input.batchDate || !Array.isArray(input.donors)) {
      return new Response(JSON.stringify({ error: "batchDate ve donors zorunlu" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt =
      "Sen bir çiftlik yönetim uygulamasında OPU (Ovum Pick-Up) günlerini analiz eden bir veri asistanısın. " +
      "Sana bugünkü OPU gününün donör bazlı ve toplam oosit/kalite verileri, ayrıca geçmiş OPU günlerinin " +
      "ortalamaları verilecek.\n\n" +
      "ÖNEMLİ - kalite notasyonu: Oosit kalitesi A > B > C > D şeklinde sıralanır; A en iyi, D en kötü " +
      "kalitedir. Bu yüzden A ve B oranının ARTMASI iyi, C ve D oranının ARTMASI kötüdür - C veya D " +
      "oranının AZALMASI ise her zaman olumlu bir sonuçtur, asla 'kötü' olarak yorumlama. Her kalite " +
      "harfini bu sıralamaya göre ayrı ayrı değerlendir, tek bir yönde (hep 'artış iyi' ya da hep 'artış " +
      "kötü') genelleme yapma.\n\n" +
      "ÖNEMLİ - karşılaştırma yönleri: Kalite yüzdeleri ve donör bazlı oosit sayıları için 'bugün vs geçmiş " +
      "ortalama' karşılaştırmaları (ÜZERİNDE/ALTINDA ve fark miktarı) sana veride HAZIR ETİKET olarak " +
      "veriliyor. Bu etiketleri AYNEN kullan - kendi kafandan üstünde mi altında mı olduğunu yeniden hesaplama " +
      "veya veride yazandan farklı bir yön belirtme; küçük sayısal farklarda (örn. 3 oosit ile 3.7 ortalama) " +
      "yön hesabını yanlış yapma riski vardır, bu yüzden hesaplama senin için önceden yapıldı.\n\n" +
      "Görevin: (1) bugünkü günü 1-2 cümlede özetlemek, (2) toplam oosit sayısını ve kalite dağılımını " +
      "(A/B/C/D, yukarıdaki notasyona göre) geçmiş ortalamalarla karşılaştırmak (verilen ÜZERİNDE/ALTINDA " +
      "etiketlerini ve puan farklarını kullanarak), (3) varsa maturasyon ve embriyoya dönüşme oranlarını " +
      "geçmiş ortalamalarla karşılaştırmak, (4) donör bazında öne çıkanları belirtmek - hangi donörler kendi " +
      "geçmiş ortalamasının (verilen etikete göre) belirgin şekilde üstünde ya da altında performans gösterdi, " +
      "(5) '[SON 3 SEANSTIR ≤2 OOSİT]' etiketli bir donör varsa, bunu ayrı bir maddede vurgulayıp bu hayvanın " +
      "donörlükten çıkarılıp çıkarılmayacağının değerlendirilmesini öner. Kısa, net, Türkçe ve madde işaretli " +
      "yaz. Sadece veriye dayalı gözlem yap, spekülatif nedensellik kurma veya veterinerlik tavsiyesi verme.";

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
