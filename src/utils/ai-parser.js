/**
 * AI response parsing helpers.
 *
 * Consolidates the fragile `match(/\{[\s\S]*\}/)` pattern used by
 * ai.js and ai-coach.js. Handles:
 *   - Code-fenced JSON (```json ... ```)
 *   - Leading/trailing prose around JSON
 *   - Truncated responses (returns fallback)
 *   - Multiple JSON objects (picks the first valid one)
 */

/**
 * Extract and parse a JSON object from an AI response string.
 * @param {string} text
 * @param {*} [fallback=null] - returned when parsing fails
 * @returns {object | *}
 */
export function parseAIJsonResponse(text, fallback = null) {
  if (!text || typeof text !== 'string') return fallback;

  // Strip code fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // Fall through to the greedy match below
    }
  }

  // Greedy {...} match
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return fallback;

  try {
    return JSON.parse(match[0]);
  } catch {
    return fallback;
  }
}

/**
 * Extract a JSON array from an AI response.
 * @param {string} text
 * @param {Array} [fallback=[]]
 * @returns {Array}
 */
export function parseAIJsonArray(text, fallback = []) {
  if (!text || typeof text !== 'string') return fallback;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      const parsed = JSON.parse(fenced[1].trim());
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      // continue
    }
  }

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return fallback;

  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Build the Cloudflare AI gateway options from an env binding.
 *
 * If `env.AI_GATEWAY_ID` is set (via wrangler.toml [vars] or a secret),
 * every AI call is routed through that gateway. Benefits:
 *   - Per-model + per-user analytics in the Cloudflare dashboard
 *   - Request/response caching (set via `cacheTtl` per call)
 *   - Rate limiting + cost controls
 *   - Prompt logging for debugging
 *
 * If the env var is unset we fall through to direct binding calls.
 *
 * @param {object} env - Cloudflare Worker env bindings
 * @param {object} [overrides] - per-call overrides (cacheTtl, skipCache, metadata)
 * @returns {object | null}
 */
export function buildGatewayOptions(env, overrides = {}) {
  const id = env?.AI_GATEWAY_ID;
  if (!id) return null;

  return {
    id,
    skipCache: overrides.skipCache ?? false,
    cacheTtl: overrides.cacheTtl ?? 0,
    ...(overrides.metadata ? { metadata: overrides.metadata } : {})
  };
}

/**
 * Call a Cloudflare Workers AI model with consistent prompt handling.
 * Automatically routes through the configured AI Gateway when
 * `env.AI_GATEWAY_ID` is present.
 *
 * @param {*} ai - c.env.AI binding
 * @param {object} opts
 * @param {string} opts.systemPrompt
 * @param {string} opts.userPrompt
 * @param {string} [opts.model='@cf/meta/llama-3.1-8b-instruct']
 * @param {number} [opts.maxTokens=1500]
 * @param {boolean} [opts.parseJson=false]
 * @param {*} [opts.fallbackJson=null]
 * @param {object} [opts.env] - Worker env, required for gateway routing
 * @param {object} [opts.gateway] - per-call gateway overrides (cacheTtl, skipCache, metadata)
 * @returns {Promise<{ success: boolean, text: string, parsed?: object, error?: string }>}
 */
export async function callAI(ai, {
  systemPrompt,
  userPrompt,
  model = '@cf/meta/llama-3.1-8b-instruct',
  maxTokens = 1500,
  parseJson = false,
  fallbackJson = null,
  env = null,
  gateway = null
}) {
  try {
    const runOptions = {};
    const gatewayOptions = env ? buildGatewayOptions(env, gateway || {}) : null;
    if (gatewayOptions) {
      runOptions.gateway = gatewayOptions;
    }

    const response = await ai.run(model, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: maxTokens
    }, Object.keys(runOptions).length > 0 ? runOptions : undefined);

    const text = response.response || '';

    const result = { success: true, text };
    if (parseJson) {
      result.parsed = parseAIJsonResponse(text, fallbackJson);
    }
    return result;
  } catch (error) {
    console.error('AI call failed:', error);
    return {
      success: false,
      text: '',
      error: error.message,
      parsed: fallbackJson
    };
  }
}
