// Stripe webhook: checkout.session.completed ve subscription iptalinde user_memberships günceller.
// Gerekli secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
// Stripe Dashboard → Webhooks → endpoint: https://<project_ref>.supabase.co/functions/v1/stripe-webhook
// JWT doğrulama kapalı olmalı (config.toml: [functions.stripe-webhook] verify_jwt = false)

import Stripe from "https://esm.sh/stripe@14?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const ALLOWED_PLANS = ["individual", "brand"] as const;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")?.trim();

  if (!signature || !webhookSecret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    return new Response((err as Error).message, { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const upsertMembership = async (
    payload: {
      user_id: string;
      plan: "free" | "individual" | "brand";
      status: "active" | "canceled";
      pending_plan: null;
      pending_interval: null;
    },
    reason: string,
  ) => {
    const { error } = await admin
      .from("user_memberships")
      .upsert(payload, { onConflict: "user_id" });
    if (error) {
      console.error(`membership upsert failed (${reason})`, { payload, error: error.message });
      throw new Error(`membership upsert failed (${reason}): ${error.message}`);
    }
  };

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id || session.metadata?.user_id;
      const plan = session.metadata?.plan?.toLowerCase();

      if (userId && plan && ALLOWED_PLANS.includes(plan as typeof ALLOWED_PLANS[number])) {
        await upsertMembership(
          { user_id: userId, plan: plan as "individual" | "brand", status: "active", pending_plan: null, pending_interval: null },
          "checkout.session.completed",
        );
      }
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.updated"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (!userId) return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });

      if (event.type === "customer.subscription.deleted" || sub.status === "canceled" || sub.status === "unpaid") {
        await upsertMembership(
          { user_id: userId, plan: "free", status: "canceled", pending_plan: null, pending_interval: null },
          event.type,
        );
      } else if (sub.status === "active" || sub.status === "trialing") {
        const plan = sub.metadata?.plan?.toLowerCase();
        if (plan && ALLOWED_PLANS.includes(plan as typeof ALLOWED_PLANS[number])) {
          await upsertMembership(
            { user_id: userId, plan: plan as "individual" | "brand", status: "active", pending_plan: null, pending_interval: null },
            event.type,
          );
        }
      }
    }
  } catch (e) {
    console.error("Webhook handler error:", e);
    return new Response("Internal error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
