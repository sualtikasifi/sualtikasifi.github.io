// Supabase Edge Function: send-push
//
// Sends a Web Push notification to one or more profiles' registered devices,
// or to every registered device when targetProfileIds is null ("Herkes").
// Called from the app via supabase.functions.invoke("send-push", { body: {...} }).
//
// kind distinguishes the caller's intent:
//   "task"         - side effect of creating/assigning a task (already gated
//                    by the caller's can_manage_tasks permission via RLS on
//                    the tasks table insert, so no extra check here)
//   "announcement" - manual "Duyuru Gönder" broadcast or task reminder;
//                    requires the caller to have can_send_announcements or
//                    be an admin, checked below using their own JWT.
//
// Required secrets (set with `supabase secrets set NAME=value`):
//   VAPID_PUBLIC_KEY   - same value hardcoded in src/lib/push.ts
//   VAPID_PRIVATE_KEY  - keep this secret, never commit it
//   VAPID_SUBJECT      - optional, e.g. "mailto:destek@example.com"
//
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided
// automatically by the Edge Functions runtime and do not need to be set
// manually.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:destek@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
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
    const { title, body, targetProfileIds, url, kind } = await req.json();
    if (!title || !body) {
      return new Response(JSON.stringify({ error: "title ve body zorunlu" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Announcements/reminders require can_send_announcements (or admin);
    // this is checked using the CALLER's own JWT so RLS applies to them,
    // not with the service role key.
    if (kind !== "task") {
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
        .select("is_admin, can_send_announcements")
        .eq("id", user.id)
        .single();
      if (!callerProfile?.is_admin && !callerProfile?.can_send_announcements) {
        return new Response(JSON.stringify({ error: "Duyuru gönderme yetkiniz yok" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let query = supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth");
    if (Array.isArray(targetProfileIds) && targetProfileIds.length > 0) {
      query = query.in("profile_id", targetProfileIds);
    }
    const { data: subs, error } = await query;
    if (error) throw error;

    const payload = JSON.stringify({ title, body, url: url ?? "/" });

    const results = await Promise.allSettled(
      ((subs ?? []) as PushSubscriptionRow[]).map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
        } catch (err) {
          // 404/410 means the subscription is gone (uninstalled, expired) - clean it up.
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
          throw err;
        }
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return new Response(JSON.stringify({ sent, total: subs?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
