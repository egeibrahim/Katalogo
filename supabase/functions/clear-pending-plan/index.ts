// Stripe Checkout iptal edildiğinde veya ödeme başarılı olduğunda pending_plan temizlenir.
// Pricing sayfası ?canceled=true veya ?success=true ile yüklendiğinde bu fonksiyon çağrılır.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { session_id?: string };
    const sessionId = String(body.session_id ?? "").trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const authedClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await authedClient.auth.getUser();

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Success dönüşünde session_id varsa Stripe üzerinden doğrulayıp üyeliği netleştir.
    let syncedUserIdFromStripe: string | null = null;
    if (sessionId) {
      const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
      if (stripeSecret) {
        const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });
        try {
          const checkout = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ["subscription"],
          });

          const checkoutUserId = checkout.client_reference_id || checkout.metadata?.user_id || null;
          const checkoutPlan = checkout.metadata?.plan?.toLowerCase();
          const allowedPlan = checkoutPlan === "brand" || checkoutPlan === "individual" ? checkoutPlan : null;
          const isSuccess =
            checkout.payment_status === "paid" ||
            checkout.status === "complete" ||
            checkout.amount_total === 0;

          if (checkoutUserId && allowedPlan && isSuccess) {
            syncedUserIdFromStripe = checkoutUserId;
            const { error: syncErr } = await adminClient
              .from("user_memberships")
              .upsert(
                {
                  user_id: checkoutUserId,
                  plan: allowedPlan,
                  status: "active",
                  pending_plan: null,
                  pending_interval: null,
                },
                { onConflict: "user_id" },
              );
            if (syncErr) {
              console.error("clear-pending-plan membership sync upsert failed:", syncErr.message);
            }
          }
        } catch (stripeErr) {
          console.error("clear-pending-plan stripe sync failed:", stripeErr);
        }
      }
    }

    // Oturum açıksa kendi kullanıcısının pending alanlarını temizle.
    if (user?.id) {
      const { error: clearOwnErr } = await adminClient
        .from("user_memberships")
        .update({ pending_plan: null, pending_interval: null })
        .eq("user_id", user.id);
      if (clearOwnErr) {
        console.error("clear-pending-plan clear own pending failed:", clearOwnErr.message);
      }
    }

    // session_id ile sync olduysa onun da pending alanlarını temizle.
    if (syncedUserIdFromStripe) {
      const { error: clearSyncedErr } = await adminClient
        .from("user_memberships")
        .update({ pending_plan: null, pending_interval: null })
        .eq("user_id", syncedUserIdFromStripe);
      if (clearSyncedErr) {
        console.error("clear-pending-plan clear synced pending failed:", clearSyncedErr.message);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
