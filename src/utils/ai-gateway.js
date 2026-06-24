/**
 * Centralized, resilient AI runner for the whole app.
 *
 * Two layers of resilience, tried in order:
 *
 *   1. AI Gateway **Dynamic Routing** (preferred when configured).
 *      Calls the gateway's OpenAI-compatible endpoint with the model set to
 *      `dynamic/<route>`. The route itself (configured in the Cloudflare
 *      dashboard) decides which model to use and falls back across
 *      models/providers when one is deprecated, rate-limited, or down — all
 *      without a code deploy. Requires: CF_ACCOUNT_ID, AI_GATEWAY_ID,
 *      AI_GATEWAY_ROUTE, and the CF_AIG_TOKEN secret.
 *
 *   2. Workers AI **binding** with an in-code multi-model fallback chain.
 *      Used when dynamic routing isn't configured, or if the gateway call
 *      itself fails. Tries each model in {@link AI_MODELS} until one succeeds,
 *      so a single deprecated model never takes the feature down.
 *
 * All model IDs live here so a future deprecation is a one-line change.
 */

// Ordered fallback chain for the Workers AI binding path. Cross-family on
// purpose so a single model (or whole family) being retired never takes the
// app down. Every id below was verified present in the live catalog
// (`wrangler ai models`). The previously-used `@cf/meta/llama-3-8b-instruct`
// and the non-fp8 `@cf/meta/llama-3.1-8b-instruct` were REMOVED from the
// catalog (the 2026-05-30 deprecation) — that's what was 410-ing.
export const AI_MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast', // strong, great at strict JSON
  '@cf/zai-org/glm-4.7-flash',                // different family, fast, 131k ctx
  '@cf/meta/llama-3.1-8b-instruct-fp8'        // cheap last-resort (fp8 replaces the retired 8b)
];

/** The single default model for callers that want just one id. */
export const DEFAULT_AI_MODEL = AI_MODELS[0];

/**
 * Build Workers AI binding gateway options (analytics, caching, metadata)
 * from env. Returns null when no gateway id is configured.
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
 * Report AI configuration status (no secrets leaked) — used by the health
 * probe so you can see at a glance whether dynamic routing is wired up.
 */
export function getAiConfig(env) {
  const ready = !!dynamicRouteConfig(env);
  return {
    gateway_id: env?.AI_GATEWAY_ID || null,
    account_id_set: !!env?.CF_ACCOUNT_ID,
    route: env?.AI_GATEWAY_ROUTE || null,
    aig_token_set: !!env?.CF_AIG_TOKEN,
    dynamic_routing_ready: ready,
    fallback_models: AI_MODELS
  };
}

/** Resolve dynamic-routing config from env, or null when not fully set. */
function dynamicRouteConfig(env) {
  const accountId = env?.CF_ACCOUNT_ID;
  const gatewayId = env?.AI_GATEWAY_ID;
  const route = env?.AI_GATEWAY_ROUTE;
  const token = env?.CF_AIG_TOKEN;
  if (accountId && gatewayId && route && token) {
    return { accountId, gatewayId, route, token };
  }
  return null;
}

/** Normalize {messages?, prompt?} into a chat messages array. */
function toMessages({ messages, prompt, systemPrompt }) {
  if (Array.isArray(messages) && messages.length) return messages;
  const out = [];
  if (systemPrompt) out.push({ role: 'system', content: systemPrompt });
  if (prompt) out.push({ role: 'user', content: prompt });
  return out;
}

/** Call the gateway compat endpoint targeting a dynamic route. */
async function runViaDynamicRoute(cfg, { messages, maxTokens, temperature, metadata }) {
  const url = `https://gateway.ai.cloudflare.com/v1/${cfg.accountId}/${cfg.gatewayId}/compat/chat/completions`;
  const headers = {
    'Content-Type': 'application/json',
    // Gateway authentication (the dynamic route requires auth to be on).
    'cf-aig-authorization': `Bearer ${cfg.token}`,
    // Provider auth — harmless if the route uses BYOK-stored keys instead.
    Authorization: `Bearer ${cfg.token}`
  };
  if (metadata) headers['cf-aig-metadata'] = JSON.stringify(metadata);

  const body = {
    model: `dynamic/${cfg.route}`,
    messages,
    max_tokens: maxTokens
  };
  if (typeof temperature === 'number') body.temperature = temperature;

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`dynamic route HTTP ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  // The compat response echoes the model the route actually resolved to.
  return { text, model: data?.model || `dynamic/${cfg.route}`, via: 'dynamic-route' };
}

/** Call the Workers AI binding, falling back across the model chain. */
async function runViaBinding(ai, env, { models, messages, maxTokens, temperature, gateway }) {
  const gatewayOptions = env ? buildGatewayOptions(env, gateway || {}) : null;
  const runOptions = gatewayOptions ? { gateway: gatewayOptions } : undefined;

  let lastErr = null;
  for (const model of models) {
    try {
      const inputs = { messages, max_tokens: maxTokens };
      if (typeof temperature === 'number') inputs.temperature = temperature;
      const response = await ai.run(model, inputs, runOptions);
      return { text: response?.response || '', model, via: 'binding' };
    } catch (err) {
      lastErr = err;
      console.warn(`AI model ${model} failed: ${err?.message || err}`);
    }
  }
  throw lastErr || new Error('All AI models failed');
}

/**
 * Run a chat completion with full resilience.
 *
 * @param {*} ai - the Workers AI binding (c.env.AI)
 * @param {object} opts
 * @param {object} opts.env - Worker env (for gateway config / dynamic routing)
 * @param {Array}  [opts.messages] - chat messages
 * @param {string} [opts.prompt] - shorthand single user message
 * @param {string} [opts.systemPrompt] - optional system message (with prompt)
 * @param {number} [opts.maxTokens=1500]
 * @param {number} [opts.temperature]
 * @param {string[]} [opts.models] - override the binding fallback chain
 * @param {object} [opts.metadata] - AI Gateway custom metadata
 * @param {object} [opts.gateway] - binding gateway overrides (cacheTtl, …)
 * @returns {Promise<{ text: string, model: string }>}
 */
export async function runChat(ai, {
  env,
  messages,
  prompt,
  systemPrompt,
  maxTokens = 1500,
  temperature,
  models,
  metadata,
  gateway
} = {}) {
  const msgs = toMessages({ messages, prompt, systemPrompt });
  const chain = models && models.length ? models : AI_MODELS;

  // Layer 1: dynamic routing (dashboard-managed fallbacks).
  const cfg = dynamicRouteConfig(env);
  if (cfg) {
    try {
      return await runViaDynamicRoute(cfg, { messages: msgs, maxTokens, temperature, metadata });
    } catch (err) {
      console.warn(`Dynamic route failed, falling back to binding: ${err?.message || err}`);
    }
  }

  // Layer 2: Workers AI binding with in-code model fallback.
  return runViaBinding(ai, env, { models: chain, messages: msgs, maxTokens, temperature, gateway });
}
