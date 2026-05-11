// ─────────────────────────────────────────────────────────────────────────────
// ShopGenieAI — api/autocomplete.js
// Haiku-powered gift interest suggestions for Q5 autocomplete
// Called at 350ms debounce with the user's current partial input token
// Returns: { suggestions: ["term1","term2",...] } — max 5 clean terms
// ─────────────────────────────────────────────────────────────────────────────

const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query } = req.body || {};
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return res.status(200).json({ suggestions: [] });
  }

  const clean = query.trim().slice(0, 60); // cap input length

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: `You are a gift interest autocomplete engine for a New Zealand gift recommendation app.

The user has typed: "${clean}"

Return 3 to 5 short gift interest suggestions relevant to this input that would be useful context for finding NZ gifts. These could be:
- Hobbies or passions (e.g. Fishing, Woodworking, Yoga)
- NZ-relevant brands or retailers (e.g. Kathmandu, Icebreaker, Fisher & Paykel)
- Personality or lifestyle tags (e.g. Foodie, Gym Junkie, Beach lover)
- Sports popular in NZ (e.g. Rugby, Netball, Cricket)

Rules:
- Short terms only — 1 to 4 words each
- NZ-appropriate (no ice hockey, no NFL, no American brands that don't operate in NZ)
- No alcohol, no weapons, no adult content
- Return ONLY a JSON array of strings, nothing else, no markdown backticks

Example output: ["Fishing","Kayaking","Camping gear","Macpac","Outdoor adventure"]`
      }]
    });

    const raw = (response.content[0]?.text || '').trim();

    let suggestions = [];
    try {
      // Strip any accidental markdown fences
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        suggestions = parsed
          .filter(s => typeof s === 'string' && s.length > 0 && s.length <= 40)
          .slice(0, 5);
      }
    } catch(e) {
      // Parse failed — return empty, local results still showing client-side
      suggestions = [];
    }

    return res.status(200).json({ suggestions });

  } catch (err) {
    console.error('Autocomplete error:', err.message);
    // Silent fail — client degrades gracefully to local-only results
    return res.status(200).json({ suggestions: [] });
  }
};
