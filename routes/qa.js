const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');

const router = Router();
router.use(requireAuth);

function buildPrompt({ difficulty, count, types, topic }) {
	const typeList = Array.isArray(types) && types.length ? types.join(', ') : 'mcq, short, tf';
	return `You are an exam question generator. Return EXACTLY ${count} unique questions as a strict JSON array: [{"q": string, "type": "mcq"|"short"|"tf", "options"?: string[], "answer": string}].
- Difficulty: ${difficulty}
- Allowed types: ${typeList}
- Topic/context: ${topic || 'general'}
- Vary phrasings and avoid repetition across questions.
- For mcq, include 4 plausible options and set answer to the correct option string.
- For tf, answer must be "T" or "F".
- Do NOT include any prose before/after; output ONLY the JSON array.`;
}

function extractJsonArray(text) {
	if (!text) return null;
	// Remove common markdown code fences
	let t = text.trim();
	t = t.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
	// Attempt direct parse first
	try { const p = JSON.parse(t); if (Array.isArray(p)) return p; } catch {}
	// Fallback: extract first JSON array substring
	const match = t.match(/\[[\s\S]*\]/);
	if (match) {
		try { const p = JSON.parse(match[0]); if (Array.isArray(p)) return p; } catch {}
	}
	return null;
}

async function callGemini(params) {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
	const prompt = buildPrompt(params);
	const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			contents: [{ role: 'user', parts: [{ text: prompt }] }],
			generationConfig: { temperature: 0.95, topP: 0.95, topK: 40 },
		}),
	});
	if (!res.ok) throw new Error('Gemini request failed');
	const data = await res.json();
	const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
	const parsed = extractJsonArray(text);
	if (!parsed) throw new Error('Gemini returned invalid JSON');
	return parsed;
}

router.post('/generate', async (req, res) => {
	try {
		let { difficulty = 'easy', count = 5, types, topic } = req.body || {};
		count = Number(count) || 1;
		const questions = await callGemini({ difficulty, count, types, topic });
		return res.json({ questions });
	} catch (err) {
		return res.status(500).json({ error: err.message || 'Failed to generate questions' });
	}
});

module.exports = router;
