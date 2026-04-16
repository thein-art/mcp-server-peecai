import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerUrlContentTool } from "../../src/tools/url-content.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

const mockExtra = { signal: new AbortController().signal, _meta: {}, sendNotification: vi.fn() };

describe("get_url_content tool", () => {
  const VALID_PID = "or_00000000-0000-0000-0000-000000000001";
  const VALID_URL = "https://example.com/blog/page1";

  afterEach(() => vi.restoreAllMocks());

  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerUrlContentTool(server, client);
    return { client, server };
  }

  function fakeContent(overrides: Record<string, unknown> = {}) {
    return {
      url: VALID_URL,
      title: "Example Post",
      domain: "example.com",
      channel_title: null,
      classification: "EDITORIAL",
      url_classification: "ARTICLE",
      content: "# Hello\n\nWorld",
      content_length: 15,
      truncated: false,
      content_updated_at: "2026-04-15T12:00:00Z",
      ...overrides,
    };
  }

  it("returns content with _summary on success", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "post").mockResolvedValue(fakeContent());

    const handler = getHandler(server, "get_url_content");
    const result = await handler({ url: VALID_URL, project_id: VALID_PID }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe(`${VALID_URL}: 15 chars`);
    expect(parsed.content.url).toBe(VALID_URL);
    expect(parsed.content.content).toBe("# Hello\n\nWorld");
  });

  it("sends url, project_id, and max_length in the request body", async () => {
    const { client, server } = setup();
    const postSpy = vi.spyOn(client, "post").mockResolvedValue(fakeContent());

    const handler = getHandler(server, "get_url_content");
    await handler({ url: VALID_URL, project_id: VALID_PID, max_length: 5000 }, mockExtra);

    expect(postSpy).toHaveBeenCalledWith(
      "/sources/urls/content",
      { url: VALID_URL, project_id: VALID_PID, max_length: 5000 },
      undefined,
      expect.any(AbortSignal),
    );
  });

  it("omits max_length when not provided", async () => {
    const { client, server } = setup();
    const postSpy = vi.spyOn(client, "post").mockResolvedValue(fakeContent());

    const handler = getHandler(server, "get_url_content");
    await handler({ url: VALID_URL, project_id: VALID_PID }, mockExtra);

    const sentBody = postSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(sentBody).not.toHaveProperty("max_length");
  });

  it("summary indicates truncation when truncated=true", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "post").mockResolvedValue(fakeContent({ content_length: 200_000, truncated: true }));

    const handler = getHandler(server, "get_url_content");
    const result = await handler({ url: VALID_URL, project_id: VALID_PID }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe(`${VALID_URL}: 200000 chars (truncated)`);
  });

  it("summary indicates pending scrape when content is null", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "post").mockResolvedValue(fakeContent({ content: null, content_length: 0 }));

    const handler = getHandler(server, "get_url_content");
    const result = await handler({ url: VALID_URL, project_id: VALID_PID }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe(`${VALID_URL}: no content yet (scraping pending)`);
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "post").mockRejectedValue(new Error("Not found"));

    const handler = getHandler(server, "get_url_content");
    const result = await handler({ url: VALID_URL, project_id: VALID_PID }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Not found");
  });
});
