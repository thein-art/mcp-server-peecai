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

  it("returns slimmed rows with _summary", async () => {
    const { client, server } = setup();
    const apiData = [
      {
        brand: { id: "br_1", name: "Alpha" },
        visibility: 0.82,
        visibility_count: 41,
        visibility_total: 50,
        sentiment: 65,
        sentiment_sum: 195,
        sentiment_count: 3,
      },
    ];
    vi.spyOn(client, "post").mockResolvedValue(apiData);

    const handler = getHandler(server, "get_brands_report");
    const result = await handler({ project_id: VALID_PID, limit: 100, offset: 0 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("1 brand rows, top 'Alpha' 82% visibility");
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].brand_id).toBe("br_1");
    expect(parsed.rows[0].brand_name).toBe("Alpha");
    // Raw fields should be stripped
    expect(parsed.rows[0]).not.toHaveProperty("visibility_count");
    expect(parsed.rows[0]).not.toHaveProperty("sentiment_sum");
  });

  it("filters by brand_id", async () => {
    const { client, server } = setup();
    const apiData = [
      { brand: { id: "br_1", name: "Alpha" }, visibility: 0.8, visibility_count: 4, visibility_total: 5 },
      { brand: { id: "br_2", name: "Beta" }, visibility: 0.5, visibility_count: 5, visibility_total: 10 },
    ];
    vi.spyOn(client, "post").mockResolvedValue(apiData);

    const handler = getHandler(server, "get_brands_report");
    const result = await handler({ project_id: VALID_PID, brand_id: "br_1", limit: 100, offset: 0 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].brand_name).toBe("Alpha");
  });
});
