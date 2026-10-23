import {
  AI_SEO_MAX_LENGTH,
  AI_SEO_MAX_SOURCE_CHARACTERS,
  AI_SEO_MIN_LENGTH,
  type AiSeoDescriptionResult,
  characterLength,
  cleanGeneratedDescription,
  fitDescription,
} from "@/shared/AiSettings";
import {AiRequestError, AiUnavailableError, type AiConnection} from "./settings";

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 25_000;

function systemPrompt(extra: string): string {
  return [
    `You write SEO meta descriptions. Reply with exactly one description of ${AI_SEO_MIN_LENGTH} to ${AI_SEO_MAX_LENGTH} characters, counting spaces.`,
    "Summarize what the content is about in plain, natural prose in the content's own language.",
    "No quotation marks, no hashtags, no emojis, no labels, no explanation, and no markdown. Do not invent facts.",
    extra ? `Author preferences: ${extra}` : "",
  ].filter(Boolean).join(" ");
}

async function chat(
  connection: AiConnection,
  messages: {content: string; role: string}[],
  fetcher: typeof fetch,
): Promise<string> {
  let response: Response;
  try {
    response = await fetcher(`${connection.baseUrl}/api/chat`, {
      body: JSON.stringify({
        messages,
        model: connection.model,
        options: {temperature: 0.4},
        stream: false,
      }),
      headers: {
        authorization: `Bearer ${connection.apiKey}`,
        "content-type": "application/json",
      },
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new AiUnavailableError("Could not reach the AI service. Check the address and try again.");
  }
  if (response.status === 401 || response.status === 403) {
    throw new AiUnavailableError("The AI service rejected the API key. Update it in Settings → AI assistant.");
  }
  if (response.status === 404) {
    throw new AiUnavailableError("The AI service does not know that model. Check the model name in Settings → AI assistant.");
  }
  if (response.status === 429) {
    throw new AiUnavailableError("The AI service is rate limiting requests. Try again shortly.");
  }
  if (!response.ok) {
    throw new AiUnavailableError(`The AI service returned an error (${response.status}).`);
  }
  const data = await response.json().catch(() => null) as
    {message?: {content?: unknown}} | null;
  const content = data?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new AiUnavailableError("The AI service returned an empty answer. Try again.");
  }
  return content;
}

export async function generateSeoDescription(
  connection: AiConnection,
  input: {content: string; title: string},
  fetcher: typeof fetch = fetch,
): Promise<AiSeoDescriptionResult> {
  const content = input.content.replace(/\s+/gu, " ").trim()
    .slice(0, AI_SEO_MAX_SOURCE_CHARACTERS);
  const title = input.title.trim().slice(0, 300);
  if (!content && !title) {
    throw new AiRequestError("Add a title or some content first.");
  }
  const messages = [
    {content: systemPrompt(connection.extraInstructions), role: "system"},
    {content: `Title: ${title || "(none)"}\n\nContent:\n${content || "(none)"}`, role: "user"},
  ];
  let best = "";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = cleanGeneratedDescription(
      await chat(connection, messages, fetcher),
    );
    const length = characterLength(candidate);
    if (length >= AI_SEO_MIN_LENGTH && length <= AI_SEO_MAX_LENGTH) {
      return {description: candidate, length, withinRange: true};
    }
    if (!best || Math.abs(length - 130) < Math.abs(characterLength(best) - 130)) {
      best = candidate;
    }
    messages.push(
      {content: candidate, role: "assistant"},
      {
        content: `That was ${length} characters. Rewrite it so it is between ${AI_SEO_MIN_LENGTH} and ${AI_SEO_MAX_LENGTH} characters. Reply with the description only.`,
        role: "user",
      },
    );
  }
  const description = fitDescription(best);
  const length = characterLength(description);
  return {
    description,
    length,
    withinRange: length >= AI_SEO_MIN_LENGTH && length <= AI_SEO_MAX_LENGTH,
  };
}
