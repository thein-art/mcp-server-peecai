import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../src/api-client.js";
import { registerShoppingQueriesTool } from "../src/tools/queries-shopping.js";
import type { ShoppingQueryRow } from "../src/types.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

const mockExtra = { signal: new AbortController().signal, _meta: {}, sendNotification: vi.fn() };

describe("shopping_queries tool", () => {
  const VALID_PID = "or_00000000-0000-0000-0000-000000000001";

  afterEach(() => vi.restoreAllMocks());

  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerShoppingQueriesTool(server, client);
    return { client, server };
  }

  it("registers the shopping_queries tool", () => {
    const { server } = setup();
    const registered = Object.keys((server as any)._registeredTools);
    expect(registered).toContain("shopping_queries");
  });

  it("flattens response rows for token efficiency", async () => {
    const { client, server } = setup();
    const mockData: ShoppingQueryRow[] = [
      {
        prompt: { id: "p1" },
        chat: { id: "c1" },
        model: { id: "m1" },
        date: "2025-01-15",
        query: { text: "running shoes", products: ["Nike Air Max", "Adidas Ultraboost"] },
      },
      {
        prompt: { id: "p2" },
        chat: { id: "c2" },
        model: { id: "m2" },
        date: "2025-01-16",
        query: { text: "wireless headphones", products: ["Sony WH-1000XM5"] },
      },
    ];

    vi.spyOn(client, "post").mockResolvedValue(mockData);

    const handler = getHandler(server, "shopping_queries");
    const result = await handler({
      project_id: VALID_PID,
      start_date: "2025-01-01",
      end_date: "2025-01-31",
      limit: 100,
      offset: 0,
    }, mockExtra);

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed._summary).toBe("2 shopping queries returned");
    expect(parsed.rows).toEqual([
      { prompt_id: "p1", chat_id: "c1", model_id: "m1", date: "2025-01-15", query_text: "running shoes", query_products: ["Nike Air Max", "Adidas Ultraboost"] },
      { prompt_id: "p2", chat_id: "c2", model_id: "m2", date: "2025-01-16", query_text: "wireless headphones", query_products: ["Sony WH-1000XM5"] },
    ]);
  });

  it("passes filters to the API", async () => {
    const { client, server } = setup();
    const postSpy = vi.spyOn(client, "post").mockResolvedValue([]);

    const handler = getHandler(server, "shopping_queries");
    await handler({
      project_id: VALID_PID,
      filters: [{ field: "prompt_id", operator: "in", values: ["p1"] }],
      limit: 100,
      offset: 0,
    }, mockExtra);

    expect(postSpy).toHaveBeenCalledWith("/queries/shopping", expect.objectContaining({
      filters: [{ field: "prompt_id", operator: "in", values: ["p1"] }],
    }), undefined, expect.any(AbortSignal));
  });

  it("returns error for missing project_id", async () => {
    const { server } = setup();
    const handler = getHandler(server, "shopping_queries");
    const result = await handler({ limit: 100, offset: 0 }, mockExtra);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Missing project_id");
  });
});
