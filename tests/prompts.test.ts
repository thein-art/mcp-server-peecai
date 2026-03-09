import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPromptTemplates } from "../src/prompts.js";

function getPromptHandler(server: McpServer, name: string) {
  return (server as any)._registeredPrompts[name].callback;
}

describe("prompt templates", () => {
  afterEach(() => vi.restoreAllMocks());

  function setup() {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerPromptTemplates(server);
    return server;
  }

  describe("brand-visibility-analysis", () => {
    it("returns valid MCP message format", () => {
      const server = setup();
      const handler = getPromptHandler(server, "brand-visibility-analysis");
      const result = handler({ period: "28d" });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[0].content.type).toBe("text");
      expect(typeof result.messages[0].content.text).toBe("string");
    });

    it("includes correct date range for 7d period", () => {
      const server = setup();
      const handler = getPromptHandler(server, "brand-visibility-analysis");

      const now = new Date();
      const expectedEnd = now.toISOString().slice(0, 10);
      const expectedStart = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

      const result = handler({ period: "7d" });
      const text = result.messages[0].content.text;

      expect(text).toContain(expectedStart);
      expect(text).toContain(expectedEnd);
    });

    it("includes correct date range for 90d period", () => {
      const server = setup();
      const handler = getPromptHandler(server, "brand-visibility-analysis");

      const expectedStart = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);

      const result = handler({ period: "90d" });
      expect(result.messages[0].content.text).toContain(expectedStart);
    });

    it("includes project_id in text when provided", () => {
      const server = setup();
      const handler = getPromptHandler(server, "brand-visibility-analysis");
      const result = handler({ project_id: "or_abc", period: "28d" });

      expect(result.messages[0].content.text).toContain("for project or_abc");
    });

    it("omits project clause when project_id is not provided", () => {
      const server = setup();
      const handler = getPromptHandler(server, "brand-visibility-analysis");
      const result = handler({ period: "28d" });

      expect(result.messages[0].content.text).not.toContain("for project");
    });
  });

  describe("competitive-gap-analysis", () => {
    it("returns valid MCP message format", () => {
      const server = setup();
      const handler = getPromptHandler(server, "competitive-gap-analysis");
      const result = handler({ period: "28d" });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[0].content.type).toBe("text");
    });

    it("includes competitive analysis steps", () => {
      const server = setup();
      const handler = getPromptHandler(server, "competitive-gap-analysis");
      const result = handler({ period: "28d" });
      const text = result.messages[0].content.text;

      expect(text).toContain("competitive gap analysis");
      expect(text).toContain("list_brands");
      expect(text).toContain("get_brands_report");
    });
  });

  describe("ai-search-citation-report", () => {
    it("returns valid MCP message format", () => {
      const server = setup();
      const handler = getPromptHandler(server, "ai-search-citation-report");
      const result = handler({ period: "28d" });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[0].content.type).toBe("text");
    });

    it("includes citation analysis steps", () => {
      const server = setup();
      const handler = getPromptHandler(server, "ai-search-citation-report");
      const result = handler({ period: "28d" });
      const text = result.messages[0].content.text;

      expect(text).toContain("citation report");
      expect(text).toContain("get_domains_report");
      expect(text).toContain("get_urls_report");
    });

    it("includes project_id when provided", () => {
      const server = setup();
      const handler = getPromptHandler(server, "ai-search-citation-report");
      const result = handler({ project_id: "or_xyz", period: "7d" });

      expect(result.messages[0].content.text).toContain("for project or_xyz");
    });
  });
});
