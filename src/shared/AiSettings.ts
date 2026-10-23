export const AI_DEFAULT_BASE_URL = "https://ollama.com";
export const AI_DEFAULT_MODEL = "gpt-oss:120b";
export const AI_MAX_EXTRA_INSTRUCTIONS = 500;
export const AI_SEO_MIN_LENGTH = 120;
export const AI_SEO_MAX_LENGTH = 140;
export const AI_SEO_MAX_SOURCE_CHARACTERS = 6000;

/** Saved connection details as shown to the browser. The key is never included. */
export interface AiSettingsView {
  apiKeyConfigured: boolean;
  apiKeyHint: string | null;
  baseUrl: string;
  encryptionAvailable: boolean;
  extraInstructions: string;
  model: string;
}

export interface AiSettingsInput {
  /** Omit to keep the saved key, empty string to remove it. */
  apiKey?: string;
  baseUrl?: string;
  extraInstructions?: string;
  model?: string;
}

export interface AiSeoDescriptionResult {
  description: string;
  length: number;
  withinRange: boolean;
}

export function characterLength(text: string): number {
  return Array.from(text).length;
}

/** Collapse whitespace and strip wrapping quotes models like to add. */
export function cleanGeneratedDescription(text: string): string {
  return text.replace(/\s+/gu, " ").trim()
    .replace(/^["'“‘`]+|["'”’`]+$/gu, "").trim();
}

/** Trim to the limit at a word boundary without exceeding it. */
export function fitDescription(text: string, max = AI_SEO_MAX_LENGTH): string {
  const characters = Array.from(text);
  if (characters.length <= max) return text;
  const clipped = characters.slice(0, max).join("");
  const boundary = clipped.search(/\s\S*$/u);
  const base = boundary > max * 0.6 ? clipped.slice(0, boundary) : clipped;
  return base.replace(/[\s,;:–—-]+$/u, "");
}
