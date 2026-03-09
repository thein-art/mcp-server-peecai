import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerBrandsReportTool } from "../../src/tools/report-brands.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

describe("get_brands_report tool", () => {
  const VALID_PID = "or_00000000-0000-0000-0000-000000000001";

  afterEach(() => vi.restoreAllMocks());

  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerBrandsReportTool(server, client);
    return { client, server };
  }

  it("returns slimmed rows with _summary including SoV", async () => {
    const { client, server } = setup();
    const apiData = [
      {
        brand: { id: "br_1", name: "Alpha" },
        visibility: 0.82,
        visibility_count: 41,
        visibility_total: 50,
        share_of_voice: 0.45,
        mention_count: 23,
        sentiment: 65,
        sentiment_sum: 195,
        sentiment_count: 3,
      },
    ];
    vi.spyOn(client, "post").mockResolvedValue(apiData);

    const handler = getHandler(server, "get_brands_report");
    const result = await handler({ project_id: VALID_PID, limit: 100, offset: 0 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("1 brand rows, top 'Alpha' 82% visibility, 45% SoV");
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].brand_id).toBe("br_1");
    expect(parsed.rows[0].brand_name).toBe("Alpha");
    expect(parsed.rows[0].share_of_voice).toBe(0.45);
    expect(parsed.rows[0].mention_count).toBe(23);
    // Raw fields should be stripped
    expect(parsed.rows[0]).not.toHaveProperty("visibility_count");
    expect(parsed.rows[0]).not.toHaveProperty("sentiment_sum");
  });

  it("sends brand_id as server-side filter", async () => {
    const { client, server } = setup();
    const postSpy = vi.spyOn(client, "post").mockResolvedValue([]);

    const handler = getHandler(server, "get_brands_report");
    await handler({ project_id: VALID_PID, brand_id: "br_1", limit: 100, offset: 0 });

    expect(postSpy).toHaveBeenCalledWith("/reports/brands", expect.objectContaining({
      filters: [{ field: "brand_id", operator: "in", values: ["br_1"] }],
    }));
  });

  it("passes explicit filters to API", async () => {
    const { client, server } = setup();
    const postSpy = vi.spyOn(client, "post").mockResolvedValue([]);

    const handler = getHandler(server, "get_brands_report");
    const filters = [{ field: "model_id", operator: "in", values: ["m1"] }];
    await handler({ project_id: VALID_PID, filters, limit: 100, offset: 0 });

    expect(postSpy).toHaveBeenCalledWith("/reports/brands", expect.objectContaining({
      filters: [{ field: "model_id", operator: "in", values: ["m1"] }],
    }));
  });

  it("merges brand_id shortcut with explicit filters", async () => {
    const { client, server } = setup();
    const postSpy = vi.spyOn(client, "post").mockResolvedValue([]);

    const handler = getHandler(server, "get_brands_report");
    const filters = [{ field: "model_id", operator: "in", values: ["m1"] }];
    await handler({ project_id: VALID_PID, brand_id: "br_1", filters, limit: 100, offset: 0 });

    const sentBody = postSpy.mock.calls[0][1];
    expect(sentBody.filters).toHaveLength(2);
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "post").mockRejectedValue(new Error("Service unavailable"));

    const handler = getHandler(server, "get_brands_report");
    const result = await handler({ project_id: VALID_PID, limit: 100, offset: 0 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Service unavailable");
  });
});
