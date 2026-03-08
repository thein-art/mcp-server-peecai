import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerUrlsReportTool } from "../../src/tools/report-urls.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

describe("get_urls_report tool", () => {
  const VALID_PID = "or_00000000-0000-0000-0000-000000000001";

  afterEach(() => vi.restoreAllMocks());

  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerUrlsReportTool(server, client);
    return { client, server };
  }

  it("returns slimmed rows with _summary", async () => {
    const { client, server } = setup();
    const apiData = [
      {
        url: "https://example.com/article",
        classification: "ARTICLE",
        title: "Test Article",
        usage_count: 8,
        citation_count: 15,
        citation_avg: 1.9,
      },
    ];
    vi.spyOn(client, "post").mockResolvedValue(apiData);

    const handler = getHandler(server, "get_urls_report");
    const result = await handler({ project_id: VALID_PID, limit: 100, offset: 0 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("1 URL rows, top 'https://example.com/article' 15 citations");
    expect(parsed.rows).toHaveLength(1);
    // no urlNormalized field at all
    expect(parsed.rows[0]).not.toHaveProperty("urlNormalized");
    // non-null title should be kept
    expect(parsed.rows[0].title).toBe("Test Article");
  });

  it("sends classification as server-side filter", async () => {
    const { client, server } = setup();
    const postSpy = vi.spyOn(client, "post").mockResolvedValue([]);

    const handler = getHandler(server, "get_urls_report");
    await handler({ project_id: VALID_PID, classification: "ARTICLE", limit: 100, offset: 0 });

    expect(postSpy).toHaveBeenCalledWith("/reports/urls", expect.objectContaining({
      filters: [{ field: "classification", operator: "in", values: ["ARTICLE"] }],
    }));
  });

  it("passes explicit filters to API", async () => {
    const { client, server } = setup();
    const postSpy = vi.spyOn(client, "post").mockResolvedValue([]);

    const handler = getHandler(server, "get_urls_report");
    const filters = [{ field: "domain", operator: "in", values: ["example.com"] }];
    await handler({ project_id: VALID_PID, filters, limit: 100, offset: 0 });

    expect(postSpy).toHaveBeenCalledWith("/reports/urls", expect.objectContaining({
      filters: [{ field: "domain", operator: "in", values: ["example.com"] }],
    }));
  });
});
