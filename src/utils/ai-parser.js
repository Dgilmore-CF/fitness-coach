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

import { runChat, AI_MODELS, buildGatewayOptions } from './ai-gateway.js';

// Re-export for backward compatibility (callers that imported it from here).
export { buildGatewayOptions };

/**
 * Call a Cloudflare Workers AI chat model with consistent prompt handling and
 * full resilience (AI Gateway dynamic routing when configured, otherwise a
 * multi-model fallback chain via the Workers AI binding). See ai-gateway.js.
 *
 * @param {*} ai - c.env.AI binding
 * @param {object} opts
 * @param {string} opts.systemPrompt
 * @param {string} opts.userPrompt
 * @param {string} [opts.model] - preferred model; the rest of AI_MODELS is
 *        appended as fallback unless `models` is given explicitly
 * @param {string[]} [opts.models] - explicit model fallback chain
 * @param {number} [opts.maxTokens=1500]
 * @param {number} [opts.temperature]
 * @param {boolean} [opts.parseJson=false]
 * @param {*} [opts.fallbackJson=null]
 * @param {object} [opts.env] - Worker env, required for gateway routing
 * @param {object} [opts.gateway] - per-call gateway overrides (cacheTtl, metadata)
 * @returns {Promise<{ success: boolean, text: string, parsed?: object, error?: string }>}
 */
export async function callAI(ai, {
  systemPrompt,
  userPrompt,
  model = null,
  models = null,
  maxTokens = 1500,
  temperature,
  parseJson = false,
  fallbackJson = null,
  env = null,
  gateway = null
}) {
  // Resolve the fallback chain: explicit `models` wins; else put the preferred
  // `model` first and append the rest of the default chain; else default chain.
  const chain = models && models.length
    ? models
    : model
      ? [model, ...AI_MODELS.filter((m) => m !== model)]
      : AI_MODELS;

  try {
    const { text } = await runChat(ai, {
      env,
      systemPrompt,
      prompt: userPrompt,
      maxTokens,
      temperature,
      models: chain,
      metadata: gateway?.metadata,
      gateway
    });

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
