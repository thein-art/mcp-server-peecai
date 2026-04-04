import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerTopicSuggestionsTool } from "../../src/tools/topic-suggestions.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

const mockExtra = { signal: new AbortController().signal, _meta: {}, sendNotification: vi.fn() };

const VALID_PID = "or_00000000-0000-0000-0000-000000000001";

afterEach(() => vi.restoreAllMocks());

describe("list_topic_suggestions tool", () => {
  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerTopicSuggestionsTool(server, client);
    return { client, server };
  }

  it("returns topic suggestions with _summary", async () => {
    const { client, server } = setup();
    const suggestions = [
      { id: "to_1", name: "SEO" },
    ];
    vi.spyOn(client, "get").mockResolvedValue(suggestions);

    const handler = getHandler(server, "list_topic_suggestions");
    const result = await handler({ project_id: VALID_PID, limit: 1000, offset: 0 }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("1 topic suggestion returned");
    expect(parsed.topic_suggestions).toHaveLength(1);
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "get").mockRejectedValue(new Error("Timeout"));

    const handler = getHandler(server, "list_topic_suggestions");
    const result = await handler({ project_id: VALID_PID, limit: 1000, offset: 0 }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Timeout");
  });

  it("rejects invalid project_id format", async () => {
    const { server } = setup();
    const handler = getHandler(server, "list_topic_suggestions");
    const result = await handler({ project_id: "bad-id", limit: 1000, offset: 0 }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid project_id format");
  });
});
