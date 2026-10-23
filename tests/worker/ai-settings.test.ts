import {env} from "cloudflare:workers";
import {beforeEach, describe, expect, it} from "vitest";

import {generateSeoDescription} from "@/server/ai/seo-description";
import {
  AiRequestError,
  AiUnavailableError,
  getAiSettingsView,
  loadAiConnection,
  saveAiSettings,
} from "@/server/ai/settings";
import {characterLength, fitDescription} from "@/shared/AiSettings";

const KEY = "ollama-test-key-abcd1234";

beforeEach(async () => {
  await env.FEED_DB.prepare("DELETE FROM ai_settings").run();
});

function replies(...contents: string[]) {
  const requests: {headers: Headers; body: any; url: string}[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    requests.push({
      body: JSON.parse(String(init.body)),
      headers: new Headers(init.headers),
      url,
    });
    const content = contents[Math.min(requests.length - 1, contents.length - 1)];
    return Response.json({message: {content}});
  }) as unknown as typeof fetch;
  return {fetcher, requests};
}

describe("AI settings storage", () => {
  it("stores the key encrypted and never exposes it", async () => {
    const view = await saveAiSettings(env, {apiKey: KEY, model: "gemma4:31b"});
    expect(view).toMatchObject({apiKeyConfigured: true, apiKeyHint: "…1234", model: "gemma4:31b"});
    expect(JSON.stringify(view)).not.toContain(KEY);
    const row = await env.FEED_DB.prepare("SELECT * FROM ai_settings").first<any>();
    expect(JSON.stringify(row)).not.toContain(KEY);
    expect((await loadAiConnection(env)).apiKey).toBe(KEY);
  });

  it("keeps the key when other fields change and removes it on request", async () => {
    await saveAiSettings(env, {apiKey: KEY});
    await saveAiSettings(env, {model: "other:1b"});
    expect((await loadAiConnection(env)).apiKey).toBe(KEY);
    await saveAiSettings(env, {apiKey: ""});
    expect((await getAiSettingsView(env)).apiKeyConfigured).toBe(false);
    await expect(loadAiConnection(env)).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it("rejects insecure addresses and requires the key when the host changes", async () => {
    await expect(saveAiSettings(env, {baseUrl: "http://ollama.com"})).rejects.toBeInstanceOf(AiRequestError);
    await saveAiSettings(env, {apiKey: KEY});
    await expect(saveAiSettings(env, {baseUrl: "https://example.org"})).rejects.toBeInstanceOf(AiRequestError);
    await saveAiSettings(env, {apiKey: KEY, baseUrl: "https://example.org/"});
    expect((await loadAiConnection(env)).baseUrl).toBe("https://example.org");
  });
});

describe("SEO description generation", () => {
  const connection = {apiKey: KEY, baseUrl: "https://ollama.com", extraInstructions: "", model: "m"};
  const good = "A practical look at how small teams plan, publish, and maintain a personal website without extra tools or recurring costs.";

  it("sends a bearer-authenticated non-streaming request and returns in-range text", async () => {
    expect(characterLength(good)).toBeGreaterThanOrEqual(120);
    const {fetcher, requests} = replies(`"${good}"`);
    const result = await generateSeoDescription(connection, {content: "<b>x</b> body", title: "T"}, fetcher);
    expect(result).toMatchObject({description: good, withinRange: true});
    expect(requests[0]!).toMatchObject({url: "https://ollama.com/api/chat"});
    expect(requests[0]!.headers.get("authorization")).toBe(`Bearer ${KEY}`);
    expect(requests[0]!.body.stream).toBe(false);
  });

  it("retries when the length is off, then trims a stubborn overlong answer", async () => {
    const retry = replies("Too short.", good);
    expect((await generateSeoDescription(connection, {content: "c", title: "t"}, retry.fetcher)).withinRange).toBe(true);
    expect(retry.requests).toHaveLength(2);

    const long = replies(`${good} ${good}`);
    const trimmed = await generateSeoDescription(connection, {content: "c", title: "t"}, long.fetcher);
    expect(long.requests).toHaveLength(3);
    expect(trimmed.length).toBeLessThanOrEqual(140);
    expect(fitDescription(`${good} ${good}`)).toBe(trimmed.description);
  });

  it("maps an authentication failure to a clear message", async () => {
    const fetcher = (async () => new Response("no", {status: 401})) as unknown as typeof fetch;
    await expect(generateSeoDescription(connection, {content: "c", title: "t"}, fetcher))
      .rejects.toThrow(/rejected the API key/u);
  });
});
