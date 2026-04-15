import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerModelChannelsTool } from "../../src/tools/model-channels.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

const mockExtra = { signal: new AbortController().signal, _meta: {}, sendNotification: vi.fn() };
const VALID_PID = "or_00000000-0000-0000-0000-000000000001";

describe("list_model_channels tool", () => {
  afterEach(() => vi.restoreAllMocks());

  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerModelChannelsTool(server, client);
    return { client, server };
  }

  it("returns channels with _summary", async () => {
    const { client, server } = setup();
    const channels = [
      { id: "openai-0", description: "ChatGPT", current_model: { id: "chatgpt-scraper" }, is_active: true },
      { id: "perplexity-0", description: "Perplexity", current_model: { id: "perplexity-scraper" }, is_active: true },
    ];
    vi.spyOn(client, "get").mockResolvedValue(channels);

    const handler = getHandler(server, "list_model_channels");
    const result = await handler({ project_id: VALID_PID, limit: 1000, offset: 0 }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("2 model channels returned");
    expect(parsed.model_channels).toHaveLength(2);
    expect(parsed.model_channels[0].current_model.id).toBe("chatgpt-scraper");
  });

  it("forwards project_id, limit, and offset to /model-channels", async () => {
    const { client, server } = setup();
    const getSpy = vi.spyOn(client, "get").mockResolvedValue([]);

    const handler = getHandler(server, "list_model_channels");
    await handler({ project_id: VALID_PID, limit: 50, offset: 10 }, mockExtra);

    expect(getSpy).toHaveBeenCalledWith("/model-channels", expect.objectContaining({
      project_id: VALID_PID,
      limit: 50,
      offset: 10,
    }), expect.any(AbortSignal));
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "get").mockRejectedValue(new Error("Forbidden"));

    const handler = getHandler(server, "list_model_channels");
    const result = await handler({ project_id: VALID_PID, limit: 1000, offset: 0 }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Forbidden");
  });

  it("rejects invalid project_id format", async () => {
    const { server } = setup();
    const handler = getHandler(server, "list_model_channels");
    const result = await handler({ project_id: "bad", limit: 1000, offset: 0 }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid project_id format");
  });
});
