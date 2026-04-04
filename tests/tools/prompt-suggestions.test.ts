import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerPromptSuggestionsTool } from "../../src/tools/prompt-suggestions.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

const mockExtra = { signal: new AbortController().signal, _meta: {}, sendNotification: vi.fn() };

const VALID_PID = "or_00000000-0000-0000-0000-000000000001";

afterEach(() => vi.restoreAllMocks());

describe("list_prompt_suggestions tool", () => {
  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerPromptSuggestionsTool(server, client);
    return { client, server };
  }

  it("returns prompt suggestions with _summary", async () => {
    const { client, server } = setup();
    const suggestions = [
      { id: "ps_1", messages: [{ content: "best crm?" }], tags: [] },
      { id: "ps_2", messages: [{ content: "top seo tools" }], tags: [] },
    ];
    vi.spyOn(client, "get").mockResolvedValue(suggestions);

    const handler = getHandler(server, "list_prompt_suggestions");
    const result = await handler({ project_id: VALID_PID, limit: 1000, offset: 0 }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("2 prompt suggestions returned");
    expect(parsed.prompt_suggestions).toHaveLength(2);
  });

  it("forwards topic_id filter to API", async () => {
    const { client, server } = setup();
    const getSpy = vi.spyOn(client, "get").mockResolvedValue([]);

    const handler = getHandler(server, "list_prompt_suggestions");
    await handler({ project_id: VALID_PID, topic_id: "tp_1", limit: 100, offset: 0 }, mockExtra);

    expect(getSpy).toHaveBeenCalledWith("/prompts/suggestions", expect.objectContaining({ topic_id: "tp_1" }), expect.any(AbortSignal));
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "get").mockRejectedValue(new Error("Forbidden"));

    const handler = getHandler(server, "list_prompt_suggestions");
    const result = await handler({ project_id: VALID_PID, limit: 1000, offset: 0 }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Forbidden");
  });

  it("rejects invalid project_id format", async () => {
    const { server } = setup();
    const handler = getHandler(server, "list_prompt_suggestions");
    const result = await handler({ project_id: "bad-id", limit: 1000, offset: 0 }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid project_id format");
  });
});
