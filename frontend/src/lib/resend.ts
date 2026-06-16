// ─── Resend email utility + branded HTML templates ───────────────────────────
// Requires env var: RESEND_API_KEY
// Sender domain:    RESEND_FROM_EMAIL  (e.g. "Ethnic Story <orders@ethnicstory.com.au>")

const RESEND_API_KEY  = process.env.RESEND_API_KEY ?? '';
const FROM_EMAIL      = process.env.RESEND_FROM_EMAIL ?? 'Ethnic Story <noreply@ethnicstory.com.au>';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn('[resend] RESEND_API_KEY not set — skipping email');
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: payload.to, subject: payload.subject, html: payload.html }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error('[resend] API error:', res.status, body);
    return { ok: false, error: body };
  }
  return { ok: true };
}

// ─── Shared brand wrapper ────────────────────────────────────────────────────
function brandWrap(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ethnic Story</title>
</head>
<body style="margin:0;padding:0;background:#fdf8f4;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf8f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#9d174d 0%,#8b2f54 100%);padding:32px 40px;text-align:center;">
            <div style="font-family:Georgia,serif;font-size:28px;color:#f0c060;letter-spacing:.04em;">✦ Ethnic Story ✦</div>
            <div style="color:rgba(255,255,255,0.8);font-size:12px;letter-spacing:.2em;text-transform:uppercase;margin-top:6px;">Rooted in Indian Craft</div>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:40px;">${content}</td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fdf8f4;border-top:1px solid #f0e8e0;padding:24px 40px;text-align:center;">
            <div style="font-size:12px;color:#9ca3af;">© 2025 Ethnic Story Australia · <a href="https://ethnicstory.com.au" style="color:#9d174d;text-decoration:none;">ethnicstory.com.au</a></div>
            <div style="font-size:11px;color:#d1d5db;margin-top:6px;">You're receiving this because you placed an order or requested a notification.</div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Template: Order Confirmation ────────────────────────────────────────────
export interface OrderEmailData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  items: { name: string; quantity: number; price: number; size?: string }[];
  totalAud: number;
  shippingAddress: {
    line1?: string; line2?: string; suburb?: string;
    state?: string; postcode?: string;
  };
}

export function buildOrderConfirmationEmail(data: OrderEmailData): EmailPayload {
  const itemRows = data.items.map(i => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
        <div style="font-weight:600;color:#1a1a1a;">${i.name}</div>
        ${i.size ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">Size: ${i.size}</div>` : ''}
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;text-align:center;color:#6b7280;">${i.quantity}</td>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#9d174d;">A$${(i.price * i.quantity).toFixed(2)}</td>
    </tr>`).join('');

  const addr = data.shippingAddress;
  const addrStr = [addr.line1, addr.line2, addr.suburb, addr.state, addr.postcode].filter(Boolean).join(', ');

  const content = `
    <h1 style="font-family:Georgia,serif;color:#9d174d;font-size:24px;margin:0 0 8px;">Order Confirmed 🎉</h1>
    <p style="color:#6b7280;margin:0 0 28px;font-size:15px;">Thank you, <strong>${data.customerName}</strong>! We've received your order and it's being prepared with care.</p>

    <div style="background:#fdf8f4;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <span style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;">Order reference</span>
      <div style="font-weight:700;font-size:15px;color:#1a1a1a;margin-top:4px;font-family:monospace;">${data.orderId.toUpperCase().slice(0,16)}</div>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <thead>
        <tr style="background:#fdf8f4;">
          <th style="padding:10px 0;text-align:left;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;">Item</th>
          <th style="padding:10px 0;text-align:center;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;">Qty</th>
          <th style="padding:10px 0;text-align:right;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;">Price</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:16px 0 0;font-weight:700;font-size:15px;">Total</td>
          <td style="padding:16px 0 0;text-align:right;font-weight:800;font-size:18px;color:#9d174d;">A$${data.totalAud.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    ${addrStr ? `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">Shipping to</div>
      <div style="font-size:14px;color:#374151;line-height:1.6;">${addrStr}</div>
    </div>` : ''}

    <div style="background:linear-gradient(135deg,#fdf2f8,#fff7ed);border-radius:10px;padding:20px;text-align:center;margin-bottom:28px;">
      <div style="font-size:13px;color:#6b7280;">Estimated delivery: <strong style="color:#9d174d;">5–9 business days</strong></div>
      <div style="font-size:12px;color:#9ca3af;margin-top:4px;">Free shipping on orders over A$150</div>
    </div>

    <div style="text-align:center;">
      <a href="https://ethnicstory.com.au/account" style="display:inline-block;padding:14px 32px;background:#9d174d;color:white;text-decoration:none;border-radius:50px;font-weight:700;font-size:14px;letter-spacing:.04em;">Track My Order</a>
    </div>
  `;

  return {
    to:      data.customerEmail,
    subject: `Order confirmed ✦ Thank you, ${data.customerName}!`,
    html:    brandWrap(content),
  };
}

// ─── Template: Restock Notification ──────────────────────────────────────────
export interface RestockEmailData {
  customerEmail: string;
  productName: string;
  productSlug: string;
  productImage?: string;
}

export function buildRestockEmail(data: RestockEmailData): EmailPayload {
  const url = `https://ethnicstory.com.au/products/${data.productSlug}`;
  const content = `
    <h1 style="font-family:Georgia,serif;color:#9d174d;font-size:24px;margin:0 0 8px;">It's back! 🎉</h1>
    <p style="color:#6b7280;margin:0 0 28px;font-size:15px;"><strong>${data.productName}</strong> is back in stock — grab yours before it sells out again.</p>

    ${data.productImage ? `<div style="text-align:center;margin-bottom:24px;"><img src="${data.productImage}" alt="${data.productName}" style="max-width:240px;border-radius:12px;border:1px solid #f0e8e0;" /></div>` : ''}

    <div style="text-align:center;margin-bottom:32px;">
      <a href="${url}" style="display:inline-block;padding:14px 36px;background:#9d174d;color:white;text-decoration:none;border-radius:50px;font-weight:700;font-size:15px;letter-spacing:.04em;">Shop Now →</a>
    </div>

    <p style="font-size:12px;color:#d1d5db;text-align:center;">You requested this notification from <a href="https://ethnicstory.com.au" style="color:#9d174d;">Ethnic Story</a>.</p>
  `;
  return {
    to:      data.customerEmail,
    subject: `${data.productName} is back in stock! ✦ Ethnic Story`,
    html:    brandWrap(content),
  };
}

// ─── Template: Restock Subscription Confirmation ─────────────────────────────
export function buildRestockSubscribedEmail(productName: string, email: string): EmailPayload {
  const content = `
    <h1 style="font-family:Georgia,serif;color:#9d174d;font-size:24px;margin:0 0 8px;">You're on the list ✓</h1>
    <p style="color:#6b7280;margin:0 0 28px;font-size:15px;">We'll send you an email at <strong>${email}</strong> as soon as <strong>${productName}</strong> is back in stock.</p>

    <div style="background:#fdf2f8;border:1px solid #fbcfe8;border-radius:10px;padding:20px;text-align:center;margin-bottom:28px;">
      <span style="font-size:2rem;">🔔</span>
      <div style="font-size:14px;color:#9d174d;font-weight:600;margin-top:8px;">Notification set for</div>
      <div style="font-size:16px;font-weight:700;color:#1a1a1a;margin-top:4px;">${productName}</div>
    </div>

    <div style="text-align:center;">
      <a href="https://ethnicstory.com.au/collections" style="display:inline-block;padding:14px 32px;background:#9d174d;color:white;text-decoration:none;border-radius:50px;font-weight:700;font-size:14px;">Browse Similar Items</a>
    </div>
  `;
  return {
    to:      email,
    subject: `We'll notify you when ${productName} is back ✦ Ethnic Story`,
    html:    brandWrap(content),
  };
}
