/**
 * imageAnalysisService.js
 *
 * Provider-agnostic image authenticity analysis.
 * Returns { verdict, confidence, details } or null when disabled.
 *
 * Verdicts:
 *   REAL           – photograph of a real physical object
 *   AI_GENERATED   – image produced by a generative model
 *   SCREEN_CAPTURE – photo taken of another screen / monitor
 *   UNCERTAIN      – cannot determine with sufficient confidence
 *
 * Configuration (via environment variables):
 *   AI_ANALYSIS_ENABLED=true          (default: false — safe/free)
 *   AI_ANALYSIS_PROVIDER=anthropic    ('anthropic' | 'openai')
 *   ANTHROPIC_API_KEY=sk-ant-...      (if provider=anthropic)
 *   OPENAI_API_KEY=sk-...             (if provider=openai)
 */

const AI_ENABLED  = process.env.AI_ANALYSIS_ENABLED  === 'true';
const AI_PROVIDER = (process.env.AI_ANALYSIS_PROVIDER || '').toLowerCase();

/**
 * Analyse an evidence image for authenticity.
 * @param {Buffer} buffer    Raw image bytes.
 * @param {string} mimeType  e.g. 'image/jpeg'
 * @returns {Promise<{verdict:string, confidence:number, details:string}|null>}
 */
async function analyzeImage (buffer, mimeType) {
  if (!AI_ENABLED) return null;
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) return null;

  try {
    switch (AI_PROVIDER) {
      case 'anthropic': return await _analyzeWithAnthropic(buffer, mimeType);
      case 'openai':    return await _analyzeWithOpenAI(buffer, mimeType);
      default:
        // eslint-disable-next-line no-console
        console.warn(`[imageAnalysis] Unknown provider: "${AI_PROVIDER}". Set AI_ANALYSIS_PROVIDER=anthropic or openai.`);
        return null;
    }
  } catch (err) {
    // Non-fatal — analysis failure must never block claim processing.
    // eslint-disable-next-line no-console
    console.warn('[imageAnalysis] Analysis failed (non-fatal):', err.message);
    return null;
  }
}

/* ── Anthropic (Claude vision) ────────────────────────────────────────────── */
/*
 * ACTIVATION STEPS:
 *   1. cd packageguard-api && npm install @anthropic-ai/sdk
 *   2. Set ANTHROPIC_API_KEY in .env / Render environment
 *   3. Uncomment the implementation below and remove the stub return.
 *
 * Recommended model: claude-3-haiku-20240307 (fast, cheap, vision-capable)
 */
async function _analyzeWithAnthropic (buffer, mimeType) {
  // const Anthropic = require('@anthropic-ai/sdk');
  // const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  //
  // const imageData = buffer.toString('base64');
  // const mediaType = mimeType || 'image/jpeg';
  //
  // const message = await client.messages.create({
  //   model: 'claude-3-haiku-20240307',
  //   max_tokens: 256,
  //   messages: [{
  //     role: 'user',
  //     content: [
  //       { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageData } },
  //       { type: 'text', text: `Analyse this image and reply with JSON only:
  // {
  //   "verdict": "REAL | AI_GENERATED | SCREEN_CAPTURE | UNCERTAIN",
  //   "confidence": <0.0-1.0>,
  //   "details": "<one sentence>"
  // }
  // REAL = photograph of a real physical package/object.
  // AI_GENERATED = image created by an AI generative model.
  // SCREEN_CAPTURE = photo taken of a computer/phone screen.
  // UNCERTAIN = cannot determine clearly.` }
  //     ]
  //   }]
  // });
  //
  // const raw = message.content[0]?.text || '{}';
  // const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || '{}');
  // return {
  //   verdict:    ['REAL','AI_GENERATED','SCREEN_CAPTURE','UNCERTAIN'].includes(parsed.verdict)
  //               ? parsed.verdict : 'UNCERTAIN',
  //   confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
  //   details:    String(parsed.details || '').slice(0, 500)
  // };

  // eslint-disable-next-line no-console
  console.warn('[imageAnalysis] Anthropic provider stub — activate by following ACTIVATION STEPS in imageAnalysisService.js');
  return { verdict: 'UNCERTAIN', confidence: 0, details: 'Anthropic provider not yet activated' };
}

/* ── OpenAI (GPT-4o vision) ───────────────────────────────────────────────── */
/*
 * ACTIVATION STEPS:
 *   1. cd packageguard-api && npm install openai
 *   2. Set OPENAI_API_KEY in .env / Render environment
 *   3. Uncomment the implementation below and remove the stub return.
 */
async function _analyzeWithOpenAI (buffer, mimeType) {
  // const OpenAI = require('openai');
  // const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  //
  // const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${buffer.toString('base64')}`;
  //
  // const response = await client.chat.completions.create({
  //   model: 'gpt-4o-mini',
  //   max_tokens: 256,
  //   messages: [{
  //     role: 'user',
  //     content: [
  //       { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
  //       { type: 'text', text: `Reply with JSON only:
  // {"verdict":"REAL|AI_GENERATED|SCREEN_CAPTURE|UNCERTAIN","confidence":0.0-1.0,"details":"one sentence"}` }
  //     ]
  //   }],
  //   response_format: { type: 'json_object' }
  // });
  //
  // const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
  // return {
  //   verdict:    ['REAL','AI_GENERATED','SCREEN_CAPTURE','UNCERTAIN'].includes(parsed.verdict)
  //               ? parsed.verdict : 'UNCERTAIN',
  //   confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
  //   details:    String(parsed.details || '').slice(0, 500)
  // };

  // eslint-disable-next-line no-console
  console.warn('[imageAnalysis] OpenAI provider stub — activate by following ACTIVATION STEPS in imageAnalysisService.js');
  return { verdict: 'UNCERTAIN', confidence: 0, details: 'OpenAI provider not yet activated' };
}

module.exports = { analyzeImage };
