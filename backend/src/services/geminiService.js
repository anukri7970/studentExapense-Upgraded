const { GoogleGenerativeAI } = require('@google/generative-ai');

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Add it to .env.');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });
}

const SYSTEM_INSTRUCTION = `You are a calm, practical financial coach for university students managing money sent by a parent or sponsor.
You will be given a JSON object of spending by category (in XLM, Stellar's native asset) and a monthly budget.
Respond ONLY with a JSON object matching exactly this shape, no markdown fences, no extra text:
{
  "summary": "2-3 sentence plain-English summary of their spending pattern",
  "recommendations": ["short actionable tip", "short actionable tip", "short actionable tip"],
  "riskLevel": "low" | "medium" | "high"
}
Keep recommendations specific to the actual category breakdown given, not generic advice. Be encouraging, never preachy.`;

/**
 * Sends a student's category-level spending to Gemini and returns a
 * structured budget report. Throws on malformed model output rather than
 * silently returning garbage — callers should catch and surface a friendly
 * error plus log to Sentry (category: "api").
 */
async function analyzeBudget({ categoryBreakdown, monthlyBudget }) {
  const model = getModel();

  const prompt = `${SYSTEM_INSTRUCTION}

Monthly budget: ${monthlyBudget} XLM
Spending by category: ${JSON.stringify(categoryBreakdown)}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const cleaned = text.replace(/```json|```/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Gemini returned non-JSON output: ${text.slice(0, 200)}`);
  }

  if (!parsed.summary || !Array.isArray(parsed.recommendations)) {
    throw new Error('Gemini response missing required fields (summary, recommendations).');
  }

  return {
    summary: parsed.summary,
    recommendations: parsed.recommendations,
    riskLevel: parsed.riskLevel || 'medium',
    rawModelResponse: text,
  };
}

module.exports = { analyzeBudget };
