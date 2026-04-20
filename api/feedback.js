// ─────────────────────────────────────────────────────────────────────────────
// ShopGenieAI — feedback.js
// Receives tester feedback from the modal and emails Mark via Brevo
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const BREVO_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_KEY) return res.status(500).json({ error: 'Missing Brevo API key' });

  const {
    overallRating,
    relevance,
    priceAccuracy,
    linkQuality,
    uxRating,
    comment,
    // Quiz context — captured automatically
    whoFor,
    vibe,
    budgetTier,
    occasion,
    interests,
    products,
  } = req.body;

  // Star renderer helper
  const stars = (n) => '★'.repeat(Number(n) || 0) + '☆'.repeat(5 - (Number(n) || 0));

  // Score → label
  const scoreLabel = (n) => {
    const labels = { 1: 'Poor', 2: 'Below average', 3: 'Average', 4: 'Good', 5: 'Excellent' };
    return labels[n] || n;
  };

  // Products table rows
  const productRows = (products || []).map((p, i) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e8ddd0;font-weight:600;color:#3d2b1a;">${i + 1}. ${p.name || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e8ddd0;color:#7a6855;">${p.type || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e8ddd0;color:#c8922a;font-size:12px;">${p.bestStoreName || '—'}</td>
    </tr>`).join('');

  const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#faf6f0;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 20px;">

  <!-- Header -->
  <div style="text-align:center;margin-bottom:28px;">
    <div style="font-size:26px;font-weight:900;color:#3d2b1a;">🧞 ShopGenieAI</div>
    <div style="font-size:12px;color:#9a8878;font-style:italic;">Tester Feedback Report</div>
  </div>

  <!-- Overall rating hero -->
  <div style="background:linear-gradient(135deg,#c8922a,#c4623a);border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
    <div style="font-size:36px;letter-spacing:4px;margin-bottom:8px;">${stars(overallRating)}</div>
    <div style="font-size:28px;font-weight:900;color:white;">${overallRating}/5</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:4px;">Overall Rating — ${scoreLabel(overallRating)}</div>
  </div>

  <!-- Score breakdown -->
  <div style="background:white;border-radius:14px;border:1px solid #e8ddd0;padding:24px;margin-bottom:20px;">
    <div style="font-size:13px;font-weight:700;color:#3d2b1a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:16px;">Score Breakdown</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0e8dc;color:#7a6855;font-size:14px;">🎯 Product Relevance</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0e8dc;text-align:right;">
          <span style="font-size:16px;color:#c8922a;letter-spacing:2px;">${stars(relevance)}</span>
          <span style="font-size:13px;color:#9a8878;margin-left:8px;">${scoreLabel(relevance)}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0e8dc;color:#7a6855;font-size:14px;">💰 Price Accuracy</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0e8dc;text-align:right;">
          <span style="font-size:16px;color:#c8922a;letter-spacing:2px;">${stars(priceAccuracy)}</span>
          <span style="font-size:13px;color:#9a8878;margin-left:8px;">${scoreLabel(priceAccuracy)}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0e8dc;color:#7a6855;font-size:14px;">🔗 Link Quality</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0e8dc;text-align:right;">
          <span style="font-size:16px;color:#c8922a;letter-spacing:2px;">${stars(linkQuality)}</span>
          <span style="font-size:13px;color:#9a8878;margin-left:8px;">${scoreLabel(linkQuality)}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#7a6855;font-size:14px;">✨ Ease of Use (UX)</td>
        <td style="padding:10px 0;text-align:right;">
          <span style="font-size:16px;color:#c8922a;letter-spacing:2px;">${stars(uxRating)}</span>
          <span style="font-size:13px;color:#9a8878;margin-left:8px;">${scoreLabel(uxRating)}</span>
        </td>
      </tr>
    </table>
  </div>

  <!-- Comment -->
  ${comment ? `
  <div style="background:white;border-radius:14px;border:1px solid #e8ddd0;padding:20px;margin-bottom:20px;">
    <div style="font-size:13px;font-weight:700;color:#3d2b1a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">💬 Tester Comment</div>
    <div style="font-size:14px;color:#7a6855;line-height:1.7;font-style:italic;">"${comment}"</div>
  </div>` : ''}

  <!-- Quiz context -->
  <div style="background:white;border-radius:14px;border:1px solid #e8ddd0;padding:20px;margin-bottom:20px;">
    <div style="font-size:13px;font-weight:700;color:#3d2b1a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">🧞 Quiz Parameters</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
      ${whoFor ? `<span style="background:#f0e8dc;color:#3d2b1a;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">${whoFor}</span>` : ''}
      ${vibe ? `<span style="background:rgba(122,158,126,.15);color:#3d7a50;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">${vibe}</span>` : ''}
      ${budgetTier ? `<span style="background:rgba(200,146,42,.15);color:#7a4a0a;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">${budgetTier}</span>` : ''}
      ${occasion ? `<span style="background:rgba(196,98,58,.12);color:#7a3010;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">${occasion}</span>` : ''}
    </div>
    ${interests ? `<div style="font-size:13px;color:#9a8878;"><strong style="color:#3d2b1a;">Interests:</strong> ${interests}</div>` : ''}
  </div>

  <!-- Products shown -->
  ${productRows ? `
  <div style="background:white;border-radius:14px;border:1px solid #e8ddd0;padding:20px;margin-bottom:20px;">
    <div style="font-size:13px;font-weight:700;color:#3d2b1a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">🎁 Products Shown</div>
    <table style="width:100%;border-collapse:collapse;">
      ${productRows}
    </table>
  </div>` : ''}

  <!-- Footer -->
  <div style="text-align:center;font-size:12px;color:#b5a190;border-top:1px solid #e8ddd0;padding-top:16px;">
    Kiwi Made 🇳🇿 · ShopGenieAI Tester Feedback · ${new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })}
  </div>

</div>
</body></html>`;

  try {
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
      body: JSON.stringify({
        sender: { name: 'ShopGenieAI Feedback', email: 'saym577@gmail.com' },
        to: [{ email: 'saym577@gmail.com', name: 'Mark' }],
        subject: `🧞 Tester Feedback — ${overallRating}/5 stars · ${vibe || ''} · ${whoFor || ''}`,
        htmlContent,
      }),
    });

    if (!brevoRes.ok) {
      const err = await brevoRes.json().catch(() => ({}));
      console.error('Brevo feedback error:', err);
      return res.status(500).json({ error: 'Email send failed' });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('Feedback handler error:', e);
    return res.status(500).json({ error: e.message });
  }
}
