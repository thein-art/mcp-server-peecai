import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerDomainsReportTool } from "../../src/tools/report-domains.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

describe("get_domains_report tool", () => {
  const VALID_PID = "or_00000000-0000-0000-0000-000000000001";

  afterEach(() => vi.restoreAllMocks());

  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerDomainsReportTool(server, client);
    return { client, server };
  }

  it("returns slimmed rows with _summary", async () => {
    const { client, server } = setup();
    const apiData = [
      { domain: "example.com", classification: "EDITORIAL", usage_rate: 0.45, citation_avg: 2.1 },
      { domain: "test.org", classification: null, usage_rate: 0.12, citation_avg: 1.0 },
    ];
    vi.spyOn(client, "post").mockResolvedValue(apiData);

    const handler = getHandler(server, "get_domains_report");
    const result = await handler({ project_id: VALID_PID, limit: 100, offset: 0 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("2 domain rows, top 'example.com' 45% usage");
    expect(parsed.rows).toHaveLength(2);
    // null classification should be dropped
    expect(parsed.rows[1]).not.toHaveProperty("classification");
  });

  it("filters by classification", async () => {
    const { client, server } = setup();
    const apiData = [
      { domain: "own.com", classification: "OWN", usage_rate: 0.6, citation_avg: 3.0 },
      { domain: "other.com", classification: "EDITORIAL", usage_rate: 0.3, citation_avg: 1.0 },
    ];
    vi.spyOn(client, "post").mockResolvedValue(apiData);

    const handler = getHandler(server, "get_domains_report");
    const result = await handler({ project_id: VALID_PID, classification: "OWN", limit: 100, offset: 0 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].domain).toBe("own.com");
  });
});
