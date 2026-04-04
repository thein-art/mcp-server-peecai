import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerBrandsTool } from "../../src/tools/brands.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

const mockExtra = { signal: new AbortController().signal, _meta: {}, sendNotification: vi.fn() };

describe("list_brands tool", () => {
  const VALID_PID = "or_00000000-0000-0000-0000-000000000001";

  afterEach(() => vi.restoreAllMocks());

  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerBrandsTool(server, client);
    return { client, server };
  }

  it("returns brands with _summary", async () => {
    const { client, server } = setup();
    const brands = [{ id: "br_1", name: "BrandA", domains: ["a.com"] }];
    vi.spyOn(client, "get").mockResolvedValue(brands);

    const handler = getHandler(server, "list_brands");
    const result = await handler({ project_id: VALID_PID, limit: 1000, offset: 0 }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("1 brand returned");
    expect(parsed.brands).toHaveLength(1);
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "get").mockRejectedValue(new Error("Unauthorized"));

    const handler = getHandler(server, "list_brands");
    const result = await handler({ project_id: VALID_PID, limit: 1000, offset: 0 }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Unauthorized");
  });
});
