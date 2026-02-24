# Stripe ödeme altyapısı

Kişisel ve Marka planları için Stripe Checkout ile abonelik ödemesi kullanılır. Kurumsal ve Free planları Stripe üzerinden değil, kayıt/iletişim ile ilerler.

## 1. Stripe Dashboard

1. [Stripe Dashboard](https://dashboard.stripe.com) → **Products** → Kişisel ve Marka için iki ürün oluşturun (ör. "Katalogo Kişisel", "Katalogo Marka").
2. Her ürün için **Recurring** fiyat ekleyin:
   - Kişisel: aylık ($7) ve yıllık ($70) price
   - Marka: aylık ($20) ve yıllık ($200) price
3. Her fiyatın **Price ID** değerini kopyalayın (ör. `price_1ABC...`).

## 2. Supabase secrets

Edge Function'lar şu secret'ları kullanır:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxx
supabase secrets set STRIPE_PRICE_INDIVIDUAL_MONTHLY=price_xxxx
supabase secrets set STRIPE_PRICE_INDIVIDUAL_YEARLY=price_xxxx
supabase secrets set STRIPE_PRICE_BRAND_MONTHLY=price_xxxx
supabase secrets set STRIPE_PRICE_BRAND_YEARLY=price_xxxx
```

Opsiyonel (ödeme sonrası yönlendirme):

```bash
supabase secrets set SITE_URL=https://katalogo.co
```

## 3. Webhook

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**.
2. Endpoint URL: `https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`
3. Dinlenecek olaylar: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. **Signing secret**’ı kopyalayıp `STRIPE_WEBHOOK_SECRET` olarak yukarıdaki gibi set edin.

`supabase/config.toml` içinde webhook için JWT kapalı olmalı (zaten ayarlı):

```toml
[functions.stripe-webhook]
verify_jwt = false
```

## 4. Akış

- Kullanıcı Fiyat sayfasında Kişisel veya Marka’ya tıklar → giriş yoksa `/auth`’a gider.
- Giriş varsa `create-checkout-session` Edge Function çağrılır → Stripe Checkout sayfasına yönlendirilir.
- Ödeme tamamlanınca Stripe `checkout.session.completed` ile webhook’u tetikler → `stripe-webhook` function `user_memberships` tablosunu günceller (plan: individual veya brand).
- Abonelik iptal/bitişte `customer.subscription.deleted` ile plan tekrar `free` yapılabilir.

## 5. Yerel test

Stripe CLI ile webhook’u yerelde dinleyebilirsiniz:

```bash
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
```

Verdiği `whsec_...` değerini `STRIPE_WEBHOOK_SECRET` olarak kullanın (sadece yerel için).
