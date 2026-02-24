// Stripe Checkout Session oluşturur. Giriş yapmış kullanıcı plan + dönem seçer, Stripe ödeme sayfasına yönlendirilir.
// Gerekli secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_INDIVIDUAL_MONTHLY, STRIPE_PRICE_INDIVIDUAL_YEARLY, STRIPE_PRICE_BRAND_MONTHLY, STRIPE_PRICE_BRAND_YEARLY
// Opsiyonel: SITE_URL (başarı/iptal yönlendirme için, yoksa Referer veya env kullanılır)

import Stripe from "https://esm.sh/stripe@14?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

const PLANS = ["individual", "brand"] as const;
const INTERVALS = ["monthly", "yearly"] as const;

type Body = {
  plan?: string;
  interval?: string;
};

function getPriceId(plan: string, interval: string): string | null {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
  return Deno.env.get(key)?.trim() || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
    if (!stripeSecret) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const plan = body.plan?.toLowerCase();
    const interval = body.interval?.toLowerCase();

    if (!plan || !PLANS.includes(plan as typeof PLANS[number]) || !interval || !INTERVALS.includes(interval as typeof INTERVALS[number])) {
      return new Response(JSON.stringify({ error: "Invalid plan or interval" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const priceId = getPriceId(plan, interval);
    if (!priceId) {
      return new Response(JSON.stringify({ error: "Price not configured for this plan" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const siteUrl = Deno.env.get("SITE_URL")?.trim() || req.headers.get("Referer")?.replace(/\/$/, "") || "http://localhost:5173";
    const successUrl = `${siteUrl}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}/pricing?canceled=true`;

    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-11-20" });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan } },
    });

    return new Response(JSON.stringify({ url: session.url }), {
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
