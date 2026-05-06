import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerUrlsReportTool } from "../../src/tools/report-urls.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

const mockExtra = { signal: new AbortController().signal, _meta: {}, sendNotification: vi.fn() };

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
    const result = await handler({ project_id: VALID_PID, limit: 100, offset: 0 }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("1 URL rows, top 'https://example.com/article' 15 citations");
    expect(parsed.rows).toHaveLength(1);
    // no urlNormalized field at all
    expect(parsed.rows[0]).not.toHaveProperty("urlNormalized");
    // non-null title should be kept
    expect(parsed.rows[0].title).toBe("Test Article");
  });

  it("filters classification client-side", async () => {
    const { client, server } = setup();
    const apiData = [
      { url: "https://example.com/article", classification: "ARTICLE", title: "Article", usage_count: 5, citation_count: 10, citation_avg: 2.0 },
      { url: "https://example.com/home", classification: "HOMEPAGE", title: "Home", usage_count: 3, citation_count: 6, citation_avg: 2.0 },
    ];
    const postSpy = vi.spyOn(client, "post").mockResolvedValue(apiData);

    const handler = getHandler(server, "get_urls_report");
    const result = await handler({ project_id: VALID_PID, classification: "ARTICLE", limit: 100, offset: 0 }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    // classification should NOT be sent to API
    expect(postSpy).toHaveBeenCalledWith("/reports/urls", expect.not.objectContaining({
      filters: expect.anything(),
    }), undefined, expect.any(AbortSignal));
    // only ARTICLE rows should be returned
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].url).toBe("https://example.com/article");
  });

  it("passes explicit filters to API", async () => {
    const { client, server } = setup();
    const postSpy = vi.spyOn(client, "post").mockResolvedValue([]);

    const handler = getHandler(server, "get_urls_report");
    const filters = [{ field: "domain", operator: "in", values: ["example.com"] }];
    await handler({ project_id: VALID_PID, filters, limit: 100, offset: 0 }, mockExtra);

    expect(postSpy).toHaveBeenCalledWith("/reports/urls", expect.objectContaining({
      filters: [{ field: "domain", operator: "in", values: ["example.com"] }],
    }), undefined, expect.any(AbortSignal));
  });

  it("accepts url_classification and domain_classification as filter fields", async () => {
    const { client, server } = setup();
    const postSpy = vi.spyOn(client, "post").mockResolvedValue([]);

    const handler = getHandler(server, "get_urls_report");
    const filters = [
      { field: "domain_classification", operator: "in", values: ["RELATED"] },
      { field: "url_classification", operator: "in", values: ["LISTICLE"] },
    ];
    await handler({ project_id: VALID_PID, filters, limit: 100, offset: 0 }, mockExtra);

    expect(postSpy).toHaveBeenCalledWith("/reports/urls", expect.objectContaining({ filters }), undefined, expect.any(AbortSignal));
  });

  it("forwards order_by to API when provided", async () => {
    const { client, server } = setup();
    const postSpy = vi.spyOn(client, "post").mockResolvedValue([]);

    const handler = getHandler(server, "get_urls_report");
    const order_by = [{ field: "retrieval_count", direction: "desc" }];
    await handler({ project_id: VALID_PID, order_by, limit: 100, offset: 0 }, mockExtra);

    expect(postSpy).toHaveBeenCalledWith("/reports/urls", expect.objectContaining({
      order_by: [{ field: "retrieval_count", direction: "desc" }],
    }), undefined, expect.any(AbortSignal));
  });

  it("drops deprecated retrievals field from rows", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "post").mockResolvedValue([
      { url: "https://example.com/page", classification: "ARTICLE", title: null, citation_count: 10, retrieval_count: 5, retrievals: 5, citation_rate: 2.0 },
    ]);

    const handler = getHandler(server, "get_urls_report");
    const result = await handler({ project_id: VALID_PID, limit: 100, offset: 0 }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.rows[0]).not.toHaveProperty("retrievals");
    expect(parsed.rows[0].retrieval_count).toBe(5);
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "post").mockRejectedValue(new Error("Internal error"));

    const handler = getHandler(server, "get_urls_report");
    const result = await handler({ project_id: VALID_PID, limit: 100, offset: 0 }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Internal error");
  });
});
