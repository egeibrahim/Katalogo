// Teklif talebi gönderildiğinde ilgili e-posta adresine bildirim gönderir (Resend API).
// Gerekli secrets: RESEND_API_KEY, QUOTE_NOTIFICATION_EMAIL (alıcı adres)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

type QuoteItem = {
  name?: string;
  product_code?: string;
  selectedSize?: string;
  selectedColorName?: string;
  quantity?: number;
  quantityBySize?: Record<string, number>;
  unitPrice?: number;
  lineTotal?: number;
  hasDesign?: boolean;
  designName?: string;
  mockupUrls?: Record<string, string>;
};

type QuotePayload = {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  items?: QuoteItem[];
};

function buildHtmlEmail(p: QuotePayload): string {
  const items = p.items ?? [];
  const rows = items
    .map(
      (i) => {
        let mockupsHtml = "";
        if (i.mockupUrls && Object.keys(i.mockupUrls).length > 0) {
          mockupsHtml = "<br>" + Object.values(i.mockupUrls).map(url => `<img src="${escapeHtml(url)}" style="max-width: 100px; max-height: 100px; margin-top: 4px; margin-right: 4px; border: 1px solid #ddd; border-radius: 4px;" alt="Mockup">`).join("");
        }
        return `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">
        ${escapeHtml(i.name ?? "—")}
        ${mockupsHtml}
      </td>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(i.product_code ?? "—")}</td>
      <td style="padding:8px;border:1px solid #ddd;">${i.selectedSize ?? "—"}</td>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(i.selectedColorName ?? "—")}</td>
      <td style="padding:8px;border:1px solid #ddd;">${i.quantity ?? 0}</td>
      <td style="padding:8px;border:1px solid #ddd;">${i.hasDesign ? "Evet" + (i.designName ? ` (${escapeHtml(i.designName)})` : "") : "Hayır"}</td>
      <td style="padding:8px;border:1px solid #ddd;">${typeof i.lineTotal === "number" ? i.lineTotal.toFixed(2) : "—"}</td>
    </tr>`;
      }
    )
    .join("");

  const total = items.reduce((sum, i) => sum + (typeof i.lineTotal === "number" ? i.lineTotal : 0), 0);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Yeni teklif talebi</title></head>
<body style="font-family:sans-serif;max-width:720px;margin:0 auto;padding:20px;">
  <h1 style="color:#333;">Yeni teklif talebi</h1>
  <p>Aşağıdaki iletişim bilgileri ve ürün detaylarıyla bir teklif talebi alındı.</p>

  <h2 style="color:#555;font-size:1.1rem;">İletişim</h2>
  <ul style="list-style:none;padding:0;">
    <li><strong>Firma:</strong> ${escapeHtml(p.companyName ?? "—")}</li>
    <li><strong>İletişim kişisi:</strong> ${escapeHtml(p.contactName ?? "—")}</li>
    <li><strong>E-posta:</strong> ${escapeHtml(p.email ?? "—")}</li>
    <li><strong>Telefon:</strong> ${escapeHtml(p.phone ?? "—")}</li>
    <li><strong>Adres:</strong> ${escapeHtml(p.address ?? "—")}</li>
    ${p.notes ? `<li><strong>Not:</strong> ${escapeHtml(p.notes)}</li>` : ""}
  </ul>

  <h2 style="color:#555;font-size:1.1rem;">Ürünler</h2>
  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="padding:8px;border:1px solid #ddd;text-align:left;">Ürün</th>
        <th style="padding:8px;border:1px solid #ddd;">Kod</th>
        <th style="padding:8px;border:1px solid #ddd;">Beden</th>
        <th style="padding:8px;border:1px solid #ddd;">Renk</th>
        <th style="padding:8px;border:1px solid #ddd;">Adet</th>
        <th style="padding:8px;border:1px solid #ddd;">Tasarım</th>
        <th style="padding:8px;border:1px solid #ddd;">Satır top.</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="margin-top:12px;"><strong>Genel toplam:</strong> ${total.toFixed(2)}</p>

  <p style="margin-top:24px;color:#888;font-size:0.9rem;">Bu e-posta teklif formu üzerinden otomatik gönderilmiştir.</p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const toEmail = Deno.env.get("QUOTE_NOTIFICATION_EMAIL");

  if (!resendKey || !toEmail) {
    return new Response(
      JSON.stringify({
        error: "E-posta gönderimi yapılandırılmamış (RESEND_API_KEY veya QUOTE_NOTIFICATION_EMAIL eksik).",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as QuotePayload;
    const html = buildHtmlEmail(body);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") ?? "Teklif <onboarding@resend.dev>",
        to: [toEmail.trim()],
        subject: `Yeni teklif talebi: ${body.contactName || body.email || "Müşteri"}`,
        html,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: (data as { message?: string }).message ?? "Resend hatası", details: data }),
        { status: res.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(JSON.stringify({ ok: true, id: (data as { id?: string }).id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Bilinmeyen hata";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
