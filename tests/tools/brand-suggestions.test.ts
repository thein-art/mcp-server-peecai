import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerBrandSuggestionsTool } from "../../src/tools/brand-suggestions.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

const mockExtra = { signal: new AbortController().signal, _meta: {}, sendNotification: vi.fn() };
const VALID_PID = "or_00000000-0000-0000-0000-000000000001";

afterEach(() => vi.restoreAllMocks());

describe("list_brand_suggestions tool", () => {
  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerBrandSuggestionsTool(server, client);
    return { client, server };
  }

  it("returns brand suggestions with _summary", async () => {
    const { client, server } = setup();
    const suggestions = [
      { id: "bs_1", name: "Acme", domains: ["acme.com"], chat_count: 5 },
      { id: "bs_2", name: "Beta", domains: [], chat_count: 1 },
    ];
    vi.spyOn(client, "get").mockResolvedValue(suggestions);

    const handler = getHandler(server, "list_brand_suggestions");
    const result = await handler({ project_id: VALID_PID, limit: 1000, offset: 0 }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("2 brand suggestions returned");
    expect(parsed.brand_suggestions).toHaveLength(2);
    expect(parsed.brand_suggestions[0]).toEqual({ id: "bs_1", name: "Acme", domains: ["acme.com"], chat_count: 5 });
  });

  it("calls /brands/suggestions with project_id", async () => {
    const { client, server } = setup();
    const getSpy = vi.spyOn(client, "get").mockResolvedValue([]);

    const handler = getHandler(server, "list_brand_suggestions");
    await handler({ project_id: VALID_PID, limit: 50, offset: 10 }, mockExtra);

    expect(getSpy).toHaveBeenCalledWith(
      "/brands/suggestions",
      expect.objectContaining({ project_id: VALID_PID, limit: 50, offset: 10 }),
      expect.any(AbortSignal),
    );
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "get").mockRejectedValue(new Error("Forbidden"));

    const handler = getHandler(server, "list_brand_suggestions");
    const result = await handler({ project_id: VALID_PID, limit: 1000, offset: 0 }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Forbidden");
  });

  it("rejects invalid project_id format", async () => {
    const { server } = setup();
    const handler = getHandler(server, "list_brand_suggestions");
    const result = await handler({ project_id: "bad-id", limit: 1000, offset: 0 }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid project_id format");
  });
});
