import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPromptTemplates } from "../src/prompts.js";
import type { PeecApiClient } from "../src/api-client.js";

function getPromptHandler(server: McpServer, name: string) {
  return (server as any)._registeredPrompts[name].callback;
}

const TEST_BRANDS = [{ id: "b1", name: "TestBrand" }];
const TEST_MODELS = [{ id: "m1", name: "ChatGPT" }];
const TEST_PROMPTS = [{ id: "p1", text: "best software" }];

function mockClient(): PeecApiClient {
  return {
    get: vi.fn().mockImplementation(async (path: string) => {
      if (path === "/brands") return TEST_BRANDS;
      if (path === "/models") return TEST_MODELS;
      if (path === "/prompts") return TEST_PROMPTS;
      return [];
    }),
  } as unknown as PeecApiClient;
}

describe("prompt templates", () => {
  afterEach(() => vi.restoreAllMocks());

  const TEST_PROJECT_ID = "or_12345678-1234-1234-1234-123456789abc";

  function setup() {
    const client = mockClient();
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerPromptTemplates(server, client);
    return { server, client };
  }

  describe("brand-visibility-analysis", () => {
    it("returns resource messages for brands and models plus text", async () => {
      const { server } = setup();
      const handler = getPromptHandler(server, "brand-visibility-analysis");
      const result = await handler({ project_id: TEST_PROJECT_ID, period: "28d" });

      expect(result.messages).toHaveLength(3);
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[0].content.type).toBe("resource");
      expect(result.messages[0].content.resource.uri).toContain("/brands");
      expect(JSON.parse(result.messages[0].content.resource.text)).toEqual(TEST_BRANDS);

      expect(result.messages[1].content.type).toBe("resource");
      expect(result.messages[1].content.resource.uri).toContain("/models");

      expect(result.messages[2].content.type).toBe("text");
      expect(result.messages[2].content.text).toContain("brand visibility analysis");
    });

    it("includes correct date range for 7d period", async () => {
      const { server } = setup();
      const handler = getPromptHandler(server, "brand-visibility-analysis");

      const expectedEnd = new Date().toISOString().slice(0, 10);
      const expectedStart = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

      const result = await handler({ project_id: TEST_PROJECT_ID, period: "7d" });
      const text = result.messages[2].content.text;

      expect(text).toContain(expectedStart);
      expect(text).toContain(expectedEnd);
    });

    it("includes correct date range for 90d period", async () => {
      const { server } = setup();
      const handler = getPromptHandler(server, "brand-visibility-analysis");

      const expectedStart = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);

      const result = await handler({ project_id: TEST_PROJECT_ID, period: "90d" });
      expect(result.messages[2].content.text).toContain(expectedStart);
    });

    it("includes project_id in text when provided", async () => {
      const { server } = setup();
      const handler = getPromptHandler(server, "brand-visibility-analysis");
      const result = await handler({ project_id: TEST_PROJECT_ID, period: "28d" });

      expect(result.messages[2].content.text).toContain(`for project ${TEST_PROJECT_ID}`);
    });

    it("text instructions do not mention list_brands or list_models", async () => {
      const { server } = setup();
      const handler = getPromptHandler(server, "brand-visibility-analysis");
      const result = await handler({ project_id: TEST_PROJECT_ID, period: "28d" });
      const text = result.messages[2].content.text;

      expect(text).not.toContain("list_brands");
      expect(text).not.toContain("list_models");
    });
  });

  describe("competitive-gap-analysis", () => {
    it("returns resource messages for brands, models, and prompts plus text", async () => {
      const { server } = setup();
      const handler = getPromptHandler(server, "competitive-gap-analysis");
      const result = await handler({ project_id: TEST_PROJECT_ID, period: "28d" });

      expect(result.messages).toHaveLength(4);
      expect(result.messages[0].content.type).toBe("resource");
      expect(result.messages[0].content.resource.uri).toContain("/brands");
      expect(result.messages[1].content.type).toBe("resource");
      expect(result.messages[1].content.resource.uri).toContain("/models");
      expect(result.messages[2].content.type).toBe("resource");
      expect(result.messages[2].content.resource.uri).toContain("/prompts");
      expect(result.messages[3].content.type).toBe("text");
    });

    it("includes competitive analysis steps", async () => {
      const { server } = setup();
      const handler = getPromptHandler(server, "competitive-gap-analysis");
      const result = await handler({ project_id: TEST_PROJECT_ID, period: "28d" });
      const text = result.messages[3].content.text;

      expect(text).toContain("competitive gap analysis");
      expect(text).toContain("get_brands_report");
    });

    it("text instructions do not mention list_brands or list_prompts for resolution", async () => {
      const { server } = setup();
      const handler = getPromptHandler(server, "competitive-gap-analysis");
      const result = await handler({ project_id: TEST_PROJECT_ID, period: "28d" });
      const text = result.messages[3].content.text;

      expect(text).not.toContain("list_prompts");
      expect(text).not.toContain("list_models");
    });
  });

  describe("ai-search-citation-report", () => {
    it("returns single text message (no embedded resources)", () => {
      const { server } = setup();
      const handler = getPromptHandler(server, "ai-search-citation-report");
      const result = handler({ period: "28d" });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[0].content.type).toBe("text");
    });

    it("includes citation analysis steps", () => {
      const { server } = setup();
      const handler = getPromptHandler(server, "ai-search-citation-report");
      const result = handler({ period: "28d" });
      const text = result.messages[0].content.text;

      expect(text).toContain("citation report");
      expect(text).toContain("get_domains_report");
      expect(text).toContain("get_urls_report");
    });

    it("includes project_id when provided", () => {
      const { server } = setup();
      const handler = getPromptHandler(server, "ai-search-citation-report");
      const result = handler({ project_id: "or_xyz", period: "7d" });

      expect(result.messages[0].content.text).toContain("for project or_xyz");
    });
  });
});
