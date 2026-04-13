import { describe, it, expect, vi, beforeEach } from "vitest";
import { chatCompletionJSON } from "./client";
import { AINetworkError, AIParseError } from "@/types/ai";

const SCHEMA = { name: "test", schema: { type: "object", properties: { x: { type: "number" } }, required: ["x"], additionalProperties: false } };
const API_KEY = "test-key";
const MESSAGES = [{ role: "user" as const, content: "hi" }];

function mockFetchResponse(content: string, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    text: () => Promise.resolve(ok ? "" : content),
    json: () => Promise.resolve({
      choices: [{ message: { content } }],
    }),
  });
}

describe("chatCompletionJSON", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed JSON on success", async () => {
    global.fetch = mockFetchResponse('{"x":42}');

    const result = await chatCompletionJSON<{ x: number }>({
      apiKey: API_KEY,
      messages: MESSAGES,
      schema: SCHEMA,
    });

    expect(result).toEqual({ x: 42 });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("sends correct headers and body", async () => {
    global.fetch = mockFetchResponse('{"x":1}');

    await chatCompletionJSON<{ x: number }>({
      apiKey: API_KEY,
      messages: MESSAGES,
      schema: SCHEMA,
      model: "custom/model",
    });

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const headers = init!.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer test-key");
    expect(headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(init!.body as string);
    expect(body.model).toBe("custom/model");
    expect(body.messages).toEqual(MESSAGES);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.name).toBe("test");
    expect(body.response_format.json_schema.strict).toBe(true);
  });

  it("uses default model when not specified", async () => {
    global.fetch = mockFetchResponse('{"x":1}');

    await chatCompletionJSON<{ x: number }>({
      apiKey: API_KEY,
      messages: MESSAGES,
      schema: SCHEMA,
    });

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.model).toBe("google/gemini-2.0-flash-001");
  });

  it("retries on invalid JSON and succeeds", async () => {
    let call = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      call++;
      const content = call < 3 ? "not json" : '{"x":99}';
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ choices: [{ message: { content } }] }),
      });
    });

    const result = await chatCompletionJSON<{ x: number }>({
      apiKey: API_KEY,
      messages: MESSAGES,
      schema: SCHEMA,
    });

    expect(result).toEqual({ x: 99 });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("throws AIParseError after exhausting retries", async () => {
    global.fetch = mockFetchResponse("not json");

    await expect(
      chatCompletionJSON({ apiKey: API_KEY, messages: MESSAGES, schema: SCHEMA }),
    ).rejects.toThrow(AIParseError);

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("throws AINetworkError on non-ok status without retry", async () => {
    global.fetch = mockFetchResponse("Unauthorized", false, 401);

    await expect(
      chatCompletionJSON({ apiKey: API_KEY, messages: MESSAGES, schema: SCHEMA }),
    ).rejects.toThrow(AINetworkError);

    expect(fetch).toHaveBeenCalledOnce();
  });

  it("throws AINetworkError on fetch rejection without retry", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      chatCompletionJSON({ apiKey: API_KEY, messages: MESSAGES, schema: SCHEMA }),
    ).rejects.toThrow(AINetworkError);

    expect(fetch).toHaveBeenCalledOnce();
  });
});
