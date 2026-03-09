import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerChatsTool } from "../../src/tools/chats.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

describe("list_chats tool", () => {
  const VALID_PID = "or_00000000-0000-0000-0000-000000000001";

  afterEach(() => vi.restoreAllMocks());

  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerChatsTool(server, client);
    return { client, server };
  }

  it("returns chats with _summary and date filtering", async () => {
    const { client, server } = setup();
    const chats = [
      { id: "ch_1", prompt: { id: "pr_1" }, model: { id: "mo_1" }, date: "2026-03-01" },
    ];
    vi.spyOn(client, "get").mockResolvedValue(chats);

    const handler = getHandler(server, "list_chats");
    const result = await handler({
      project_id: VALID_PID,
      start_date: "2026-03-01",
      end_date: "2026-03-02",
      limit: 100,
      offset: 0,
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("1 chat returned");
    expect(parsed.chats).toHaveLength(1);
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "get").mockRejectedValue(new Error("Rate limited"));

    const handler = getHandler(server, "list_chats");
    const result = await handler({
      project_id: VALID_PID,
      limit: 100,
      offset: 0,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Rate limited");
  });
});
