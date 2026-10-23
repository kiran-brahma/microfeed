import {decryptWebhookSecret, encryptWebhookSecret} from "@/server/webhooks/crypto";
import {
  AI_DEFAULT_BASE_URL,
  AI_DEFAULT_MODEL,
  AI_MAX_API_KEY_LENGTH,
  AI_MAX_EXTRA_INSTRUCTIONS,
  AI_MAX_MODEL_LENGTH,
  type AiSettingsInput,
  type AiSettingsView,
} from "@/shared/AiSettings";

export class AiRequestError extends Error {}
export class AiUnavailableError extends Error {}

interface AiRow extends Record<string, unknown> {
  api_key_ciphertext: string | null;
  api_key_hint: string | null;
  base_url: string;
  extra_instructions: string | null;
  model: string;
}

/**
 * The prefix only keeps this key distinct from other values derived from
 * BETTER_AUTH_SECRET; anyone who knows that secret can still derive it.
 * Rotating BETTER_AUTH_SECRET makes the saved key unreadable; re-enter it.
 */
function encryptionSecret(runtimeEnv: Env): string {
  const secret = runtimeEnv.BETTER_AUTH_SECRET?.trim();
  if (!secret) {
    throw new AiUnavailableError(
      "This deployment has no encryption secret, so an API key cannot be stored safely.",
    );
  }
  return `microfeed:ai-settings:v1:${secret}`;
}

export function normalizeBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new AiRequestError("Enter a full address such as https://ollama.com.");
  }
  if (url.protocol !== "https:") {
    throw new AiRequestError("The address must start with https:// so the key is encrypted in transit.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new AiRequestError("The address must not include credentials, a query, or a fragment.");
  }
  return url.toString().replace(/\/+$/u, "");
}

function rowFromDb(database: D1Database): Promise<AiRow | null> {
  return database.prepare("SELECT * FROM ai_settings WHERE id = 1").first<AiRow>();
}

export async function getAiSettingsView(
  runtimeEnv: Env,
): Promise<AiSettingsView> {
  const row = await rowFromDb(runtimeEnv.FEED_DB);
  return {
    apiKeyConfigured: Boolean(row?.api_key_ciphertext),
    apiKeyHint: row?.api_key_ciphertext ? row.api_key_hint : null,
    baseUrl: row?.base_url ?? AI_DEFAULT_BASE_URL,
    encryptionAvailable: Boolean(runtimeEnv.BETTER_AUTH_SECRET?.trim()),
    extraInstructions: row?.extra_instructions ?? "",
    model: row?.model ?? AI_DEFAULT_MODEL,
  };
}

export async function saveAiSettings(
  runtimeEnv: Env,
  input: AiSettingsInput,
): Promise<AiSettingsView> {
  const row = await rowFromDb(runtimeEnv.FEED_DB);
  const baseUrl = normalizeBaseUrl(
    input.baseUrl ?? row?.base_url ?? AI_DEFAULT_BASE_URL,
  );
  const model = (input.model ?? row?.model ?? AI_DEFAULT_MODEL).trim();
  if (!model || model.length > AI_MAX_MODEL_LENGTH || /\s/u.test(model)) {
    throw new AiRequestError("Enter a model name such as gpt-oss:120b.");
  }
  const extraInstructions = (input.extraInstructions ??
    row?.extra_instructions ?? "").trim();
  if (Array.from(extraInstructions).length > AI_MAX_EXTRA_INSTRUCTIONS) {
    throw new AiRequestError(
      `Extra instructions can be up to ${AI_MAX_EXTRA_INSTRUCTIONS} characters.`,
    );
  }

  let ciphertext = row?.api_key_ciphertext ?? null;
  let hint = row?.api_key_hint ?? null;
  if (input.apiKey !== undefined) {
    const apiKey = input.apiKey.trim();
    if (!apiKey) {
      ciphertext = null;
      hint = null;
    } else {
      if (apiKey.length > AI_MAX_API_KEY_LENGTH || /\s/u.test(apiKey)) {
        throw new AiRequestError("That does not look like a valid API key.");
      }
      ciphertext = await encryptWebhookSecret(apiKey, encryptionSecret(runtimeEnv));
      hint = `…${apiKey.slice(-4)}`;
    }
  }
  // A new address would send the saved key somewhere new; require re-entry.
  if (row && input.baseUrl !== undefined && baseUrl !== row.base_url &&
    input.apiKey === undefined && ciphertext) {
    throw new AiRequestError(
      "Re-enter the API key when you change the address, so it is not sent to a new host by accident.",
    );
  }

  await runtimeEnv.FEED_DB.prepare(`
    INSERT INTO ai_settings (id, base_url, model, api_key_ciphertext, api_key_hint, extra_instructions, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      base_url = excluded.base_url,
      model = excluded.model,
      api_key_ciphertext = excluded.api_key_ciphertext,
      api_key_hint = excluded.api_key_hint,
      extra_instructions = excluded.extra_instructions,
      updated_at = CURRENT_TIMESTAMP
  `).bind(baseUrl, model, ciphertext, hint, extraInstructions || null).run();
  return getAiSettingsView(runtimeEnv);
}

export interface AiConnection {
  apiKey: string;
  baseUrl: string;
  extraInstructions: string;
  model: string;
}

/** Server-only: returns the decrypted key. Never pass the result to a response. */
export async function loadAiConnection(
  runtimeEnv: Env,
): Promise<AiConnection> {
  const row = await rowFromDb(runtimeEnv.FEED_DB);
  if (!row?.api_key_ciphertext) {
    throw new AiUnavailableError(
      "Add your Ollama Cloud API key in Settings → AI assistant first.",
    );
  }
  let apiKey: string;
  try {
    apiKey = await decryptWebhookSecret(
      row.api_key_ciphertext,
      encryptionSecret(runtimeEnv),
    );
  } catch (error) {
    if (error instanceof AiUnavailableError) throw error;
    throw new AiUnavailableError(
      "The saved API key could not be read. Enter it again in Settings → AI assistant.",
    );
  }
  return {
    apiKey,
    baseUrl: row.base_url,
    extraInstructions: row.extra_instructions ?? "",
    model: row.model,
  };
}
