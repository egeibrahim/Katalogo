# Teklif bildirim e-postası kurulumu

Teklif formu gönderildiğinde sizin (veya satış ekibinin) e-posta adresine otomatik bildirim gitmesi için aşağıdaki adımları uygulayın.

## 1. Resend hesabı ve API anahtarı

1. [resend.com](https://resend.com) üzerinden ücretsiz hesap oluşturun.
2. **API Keys** bölümünden yeni bir API key oluşturun (örn. `re_xxxxxxxxxx`).
3. Bu anahtarı kopyalayın; bir daha tam olarak gösterilmez.

## 2. Supabase Edge Function secret'ları

1. **Supabase Dashboard** → projenizi seçin.
2. **Edge Functions** menüsüne girin.
3. **send-quote-notification** fonksiyonunu bulun (önce deploy etmeniz gerekir, aşağıda).
4. İlgili fonksiyon için **Secrets** / **Environment variables** kısmına şunları ekleyin:

| Secret adı | Açıklama | Örnek |
|------------|----------|--------|
| `RESEND_API_KEY` | Resend’den aldığınız API key | `re_xxxxxxxxxx` |
| `QUOTE_NOTIFICATION_EMAIL` | Teklif bildirimlerinin gideceği e-posta | `satin@firma.com` |
| `RESEND_FROM_EMAIL` | (İsteğe bağlı) Gönderen adresi. Yoksa Resend varsayılanı kullanılır. | `Teklif <noreply@firma.com>` |

**Not:** Resend ücretsiz planda varsayılan olarak `onboarding@resend.dev` adresinden gönderim yapar. Kendi domain’inizden göndermek için Resend’de domain doğrulama yapmanız gerekir.

## 3. Edge Function’ı deploy etme

Proje kökünde:

```bash
supabase functions deploy send-quote-notification
```

Deploy sonrası secret’ları Supabase Dashboard’dan (Edge Functions → send-quote-notification → Secrets) ekleyin.

## 4. Kontrol

1. Sitede sepete ürün ekleyip **Teklif iste** → formu doldurup **Teklif gönder** deyin.
2. `QUOTE_NOTIFICATION_EMAIL` olarak yazdığınız adrese “Yeni teklif talebi” konulu bir e-posta gelmeli.
3. E-posta gelmiyorsa: Supabase Dashboard → Edge Functions → send-quote-notification → **Logs** kısmından hata mesajını kontrol edin. `RESEND_API_KEY` veya `QUOTE_NOTIFICATION_EMAIL` eksikse fonksiyon hata döner.

## Özet

- **RESEND_API_KEY:** Resend’den alınan API key.  
- **QUOTE_NOTIFICATION_EMAIL:** Bildirimin gideceği e-posta.  
- **RESEND_FROM_EMAIL:** (Opsiyonel) Gönderen adresi; yoksa Resend varsayılanı kullanılır.

Bu üçü (en az ilk ikisi) tanımlı ve Edge Function deploy edilmişse teklif e-postası çalışır.
