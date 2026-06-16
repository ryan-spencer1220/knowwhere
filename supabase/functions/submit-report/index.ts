// Supabase Edge Function: records a user's report of objectionable content and
// notifies the moderator. The report row is written with the service-role key
// (the `reports` table is write-only for normal users); the caller is
// authenticated from their own JWT so reports are always attributable.
//
// Deploy:  supabase functions deploy submit-report
// Optional email notifications: supabase secrets set RESEND_API_KEY=<key>
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODERATOR_EMAIL = "ryan.spencer1220@gmail.com";
const VALID_TYPES = new Set(["list", "user", "place"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Best-effort moderator email via Resend (no-op if the key isn't set).
async function notify(report: { id: string; targetType: string; targetId: string; reason: string; details?: string; reporterId: string }) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "KnowWhere <onboarding@resend.dev>",
        to: [MODERATOR_EMAIL],
        subject: `New report: ${report.targetType} (${report.reason})`,
        text:
          `A ${report.targetType} was reported.\n\n` +
          `Reason: ${report.reason}\n` +
          `Details: ${report.details ?? "—"}\n` +
          `Target type: ${report.targetType}\n` +
          `Target id: ${report.targetId}\n` +
          `Reporter id: ${report.reporterId}\n` +
          `Report id: ${report.id}\n`,
      }),
    });
  } catch (_) {
    // Notification is non-blocking; the report is already stored.
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json({ error: "Function is missing required environment configuration." }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Not authenticated." }, 401);

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Not authenticated." }, 401);

    const body = await req.json().catch(() => ({}));
    const targetType: string = body.targetType ?? "";
    const targetId: string = body.targetId ?? "";
    const reason: string = (body.reason ?? "").toString().slice(0, 80);
    const details: string | null = body.details ? body.details.toString().slice(0, 1000) : null;

    if (!VALID_TYPES.has(targetType) || !targetId || !reason) {
      return json({ error: "Invalid report." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: inserted, error: insErr } = await admin
      .from("reports")
      .insert({
        reporter_id: userData.user.id,
        target_type: targetType,
        target_id: targetId,
        reason,
        details,
      })
      .select("id")
      .single();
    if (insErr) return json({ error: insErr.message }, 500);

    await notify({ id: inserted.id, targetType, targetId, reason, details: details ?? undefined, reporterId: userData.user.id });

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error." }, 500);
  }
});
