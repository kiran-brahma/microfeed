import {env} from "cloudflare:workers";
import type {APIRoute} from "astro";

import {jsonResponse} from "@/server/http";
import {generateSeoDescription} from "@/server/ai/seo-description";
import {
  AiRequestError,
  AiUnavailableError,
  getAiSettingsView,
  loadAiConnection,
  saveAiSettings,
} from "@/server/ai/settings";

async function respond(action: () => Promise<unknown>): Promise<Response> {
  try {
    return jsonResponse(await action(), {headers: {"cache-control": "no-store"}});
  } catch (error) {
    if (error instanceof AiRequestError) {
      return jsonResponse({error: error.message}, {status: 400});
    }
    if (error instanceof AiUnavailableError) {
      return jsonResponse({error: error.message}, {status: 502});
    }
    throw error;
  }
}

async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AiRequestError("Send a JSON object.");
  }
  return body as Record<string, unknown>;
}

function optionalString(
  body: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new AiRequestError(`\`${key}\` must be text.`);
  }
  return value;
}

export const getAdminAiSettings: APIRoute = async () =>
  respond(() => getAiSettingsView(env));

export const updateAdminAiSettings: APIRoute = async ({request}) =>
  respond(async () => {
    const body = await jsonBody(request);
    const allowed = new Set(["apiKey", "baseUrl", "extraInstructions", "model"]);
    if (Object.keys(body).some((key) => !allowed.has(key))) {
      throw new AiRequestError("Unknown AI setting.");
    }
    return saveAiSettings(env, {
      apiKey: optionalString(body, "apiKey"),
      baseUrl: optionalString(body, "baseUrl"),
      extraInstructions: optionalString(body, "extraInstructions"),
      model: optionalString(body, "model"),
    });
  });

export const generateAdminSeoDescription: APIRoute = async ({request}) =>
  respond(async () => {
    const body = await jsonBody(request);
    return generateSeoDescription(await loadAiConnection(env), {
      content: optionalString(body, "content") ?? "",
      title: optionalString(body, "title") ?? "",
    });
  });
