/**
 * Integration smoke test — hits every read-only tool, prompt, and resource
 * with real Peec AI API credentials.
 *
 * Skipped entirely when PEECAI_API_KEY is not set (so `npm test` stays green).
 *
 * Run:   PEECAI_API_KEY=xxx npm run test:integration
 * Or:    PEECAI_API_KEY=xxx PEECAI_PROJECT_ID=or_xxx npm run test:integration
 */
import { describe, it, expect, beforeAll } from "vitest";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerProjectsTool } from "../../src/tools/projects.js";
import { registerBrandsTool } from "../../src/tools/brands.js";
import { registerPromptsTool } from "../../src/tools/prompts.js";
import { registerTagsTool } from "../../src/tools/tags.js";
import { registerTopicsTool } from "../../src/tools/topics.js";
import { registerModelsTool } from "../../src/tools/models.js";
import { registerModelChannelsTool } from "../../src/tools/model-channels.js";
import { registerChatsTool } from "../../src/tools/chats.js";
import { registerChatContentTool } from "../../src/tools/chat-content.js";
import { registerBrandsReportTool } from "../../src/tools/report-brands.js";
import { registerDomainsReportTool } from "../../src/tools/report-domains.js";
import { registerUrlsReportTool } from "../../src/tools/report-urls.js";
import { registerSearchQueriesTool } from "../../src/tools/queries-search.js";
import { registerShoppingQueriesTool } from "../../src/tools/queries-shopping.js";
import { registerPromptSuggestionsTool } from "../../src/tools/prompt-suggestions.js";
import { registerTopicSuggestionsTool } from "../../src/tools/topic-suggestions.js";
import { registerPromptTemplates } from "../../src/prompts.js";
import type { Project, Brand, Chat } from "../../src/types.js";

const API_KEY = process.env.PEECAI_API_KEY;
const extra = { signal: new AbortController().signal, _meta: {}, sendNotification: async () => {} };

// ── Helpers ──

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

function parse(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text);
}

function assertToolSuccess(result: any) {
  expect(result.isError).toBeUndefined();
  expect(result.content).toBeDefined();
  expect(result.content[0].type).toBe("text");
  expect(result.structuredContent).toBeDefined();
  const parsed = parse(result);
  expect(typeof parsed._summary).toBe("string");
  return parsed;
}

// ── Test suite — skipped when no API key ──

describe.skipIf(!API_KEY)("integration smoke test", () => {
  let server: McpServer;
  let client: PeecApiClient;
  let projectId: string;
  let brands: Brand[];
  let firstChatId: string | undefined;

  beforeAll(async () => {
    client = new PeecApiClient(API_KEY!);
    server = new McpServer({ name: "smoke-test", version: "0.0.1" });

    // Register all read-only tools
    registerProjectsTool(server, client);
    registerBrandsTool(server, client);
    registerPromptsTool(server, client);
    registerTagsTool(server, client);
    registerTopicsTool(server, client);
    registerModelsTool(server, client);
    registerModelChannelsTool(server, client);
    registerChatsTool(server, client);
    registerChatContentTool(server, client);
    registerBrandsReportTool(server, client);
    registerDomainsReportTool(server, client);
    registerUrlsReportTool(server, client);
    registerSearchQueriesTool(server, client);
    registerShoppingQueriesTool(server, client);
    registerPromptSuggestionsTool(server, client);
    registerTopicSuggestionsTool(server, client);

    // Resolve project ID — use env var or first active project
    if (process.env.PEECAI_PROJECT_ID) {
      projectId = process.env.PEECAI_PROJECT_ID;
    } else {
      const projects = await client.get<Project[]>("/projects", { limit: 100 });
      const active = projects.find((p) => p.status === "CUSTOMER") ?? projects[0];
      if (!active) throw new Error("No projects found — cannot run smoke tests");
      projectId = active.id;
    }

    console.error(`Smoke test using project: ${projectId}`);
  }, 30_000);

  // ── List tools ──

  it("list_projects", async () => {
    const result = await getHandler(server, "list_projects")({ limit: 10, offset: 0 }, extra);
    const parsed = assertToolSuccess(result);
    expect(Array.isArray(parsed.projects)).toBe(true);
    expect(parsed.projects.length).toBeGreaterThan(0);
    expect(parsed.projects[0]).toHaveProperty("id");
    expect(parsed.projects[0]).toHaveProperty("name");
    expect(parsed.projects[0]).toHaveProperty("status");
  });

  it("list_brands", async () => {
    const result = await getHandler(server, "list_brands")({ project_id: projectId, limit: 100, offset: 0 }, extra);
    const parsed = assertToolSuccess(result);
    expect(Array.isArray(parsed.brands)).toBe(true);
    brands = parsed.brands;
    if (brands.length > 0) {
      expect(brands[0]).toHaveProperty("id");
      expect(brands[0]).toHaveProperty("name");
      expect(brands[0]).toHaveProperty("is_own");
    }
  });

  it("list_prompts", async () => {
    const result = await getHandler(server, "list_prompts")({ project_id: projectId, limit: 100, offset: 0 }, extra);
    const parsed = assertToolSuccess(result);
    expect(Array.isArray(parsed.prompts)).toBe(true);
    if (parsed.prompts.length > 0) {
      expect(parsed.prompts[0]).toHaveProperty("id");
      expect(parsed.prompts[0]).toHaveProperty("messages");
    }
  });

  it("list_tags", async () => {
    const result = await getHandler(server, "list_tags")({ project_id: projectId, limit: 100, offset: 0 }, extra);
    const parsed = assertToolSuccess(result);
    expect(Array.isArray(parsed.tags)).toBe(true);
  });

  it("list_topics", async () => {
    const result = await getHandler(server, "list_topics")({ project_id: projectId, limit: 100, offset: 0 }, extra);
    const parsed = assertToolSuccess(result);
    expect(Array.isArray(parsed.topics)).toBe(true);
  });

  it("list_models", async () => {
    const result = await getHandler(server, "list_models")({ project_id: projectId, limit: 100, offset: 0 }, extra);
    const parsed = assertToolSuccess(result);
    expect(Array.isArray(parsed.models)).toBe(true);
    expect(parsed.models.length).toBeGreaterThan(0);
    expect(parsed.models[0]).toHaveProperty("id");
    expect(parsed.models[0]).toHaveProperty("is_active");
  });

  it("list_model_channels", async () => {
    const result = await getHandler(server, "list_model_channels")({ project_id: projectId, limit: 100, offset: 0 }, extra);
    const parsed = assertToolSuccess(result);
    expect(Array.isArray(parsed.model_channels)).toBe(true);
    expect(parsed.model_channels.length).toBeGreaterThan(0);
    expect(parsed.model_channels[0]).toHaveProperty("id");
    expect(parsed.model_channels[0]).toHaveProperty("current_model");
    expect(parsed.model_channels[0]).toHaveProperty("is_active");
  });

  it("list_chats", async () => {
    const result = await getHandler(server, "list_chats")({ project_id: projectId, limit: 5, offset: 0 }, extra);
    const parsed = assertToolSuccess(result);
    expect(Array.isArray(parsed.chats)).toBe(true);
    if (parsed.chats.length > 0) {
      const chat = parsed.chats[0] as Chat;
      expect(chat).toHaveProperty("id");
      expect(chat).toHaveProperty("prompt");
      expect(chat).toHaveProperty("model");
      expect(chat).toHaveProperty("date");
      firstChatId = chat.id;
    }
  });

  it("get_chat_content", async () => {
    if (!firstChatId) {
      console.error("  Skipping get_chat_content — no chats available");
      return;
    }
    const result = await getHandler(server, "get_chat_content")({ chat_id: firstChatId, project_id: projectId }, extra);
    const parsed = assertToolSuccess(result);
    expect(parsed.chat).toHaveProperty("messages");
    expect(parsed.chat).toHaveProperty("sources");
    expect(parsed.chat).toHaveProperty("brands_mentioned");
  });

  it("list_prompt_suggestions", async () => {
    const result = await getHandler(server, "list_prompt_suggestions")({ project_id: projectId, limit: 10, offset: 0 }, extra);
    const parsed = assertToolSuccess(result);
    expect(Array.isArray(parsed.prompt_suggestions)).toBe(true);
  });

  it("list_topic_suggestions", async () => {
    const result = await getHandler(server, "list_topic_suggestions")({ project_id: projectId, limit: 10, offset: 0 }, extra);
    const parsed = assertToolSuccess(result);
    expect(Array.isArray(parsed.topic_suggestions)).toBe(true);
  });

  // ── Report tools ──

  it("get_brands_report", async () => {
    const result = await getHandler(server, "get_brands_report")({ project_id: projectId, limit: 10, offset: 0 }, extra);
    const parsed = assertToolSuccess(result);
    expect(Array.isArray(parsed.rows)).toBe(true);
    if (parsed.rows.length > 0) {
      expect(parsed.rows[0]).toHaveProperty("brand_id");
      expect(parsed.rows[0]).toHaveProperty("brand_name");
      expect(parsed.rows[0]).toHaveProperty("visibility");
    }
  }, 30_000);

  it("get_brands_report with dimensions", async () => {
    const result = await getHandler(server, "get_brands_report")({
      project_id: projectId, dimensions: ["model_id"], limit: 10, offset: 0,
    }, extra);
    const parsed = assertToolSuccess(result);
    expect(Array.isArray(parsed.rows)).toBe(true);
    if (parsed.rows.length > 0) {
      expect(parsed.rows[0]).toHaveProperty("model_id");
    }
  }, 30_000);

  it("get_domains_report", async () => {
    const result = await getHandler(server, "get_domains_report")({ project_id: projectId, limit: 10, offset: 0 }, extra);
    const parsed = assertToolSuccess(result);
    expect(Array.isArray(parsed.rows)).toBe(true);
    if (parsed.rows.length > 0) {
      expect(parsed.rows[0]).toHaveProperty("domain");
      expect(parsed.rows[0]).toHaveProperty("retrieval_rate");
    }
  }, 30_000);

  it("get_urls_report", async () => {
    const result = await getHandler(server, "get_urls_report")({ project_id: projectId, limit: 10, offset: 0 }, extra);
    const parsed = assertToolSuccess(result);
    expect(Array.isArray(parsed.rows)).toBe(true);
    if (parsed.rows.length > 0) {
      expect(parsed.rows[0]).toHaveProperty("url");
      expect(parsed.rows[0]).toHaveProperty("citation_count");
    }
  }, 30_000);

  // ── Query tools ──

  it("search_queries", async () => {
    const result = await getHandler(server, "search_queries")({ project_id: projectId, limit: 10, offset: 0 }, extra);
    const parsed = assertToolSuccess(result);
    expect(Array.isArray(parsed.rows)).toBe(true);
    if (parsed.rows.length > 0) {
      expect(parsed.rows[0]).toHaveProperty("prompt_id");
      expect(parsed.rows[0]).toHaveProperty("query_text");
    }
  }, 30_000);

  it("shopping_queries", async () => {
    const result = await getHandler(server, "shopping_queries")({ project_id: projectId, limit: 10, offset: 0 }, extra);
    const parsed = assertToolSuccess(result);
    expect(Array.isArray(parsed.rows)).toBe(true);
  }, 30_000);

  // ── Prompts ──

  describe("MCP prompts", () => {
    let promptServer: McpServer;

    beforeAll(() => {
      promptServer = new McpServer({ name: "smoke-prompts", version: "0.0.1" });
      registerPromptTemplates(promptServer, client);
    });

    function getPromptCallback(name: string) {
      return (promptServer as any)._registeredPrompts[name].callback;
    }

    it("brand-visibility-analysis", async () => {
      const result = await getPromptCallback("brand-visibility-analysis")({ project_id: projectId, period: "7d" });
      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeGreaterThanOrEqual(2);
      // First messages should be resource embeds
      expect(result.messages[0].content.type).toBe("resource");
    }, 30_000);

    it("competitive-gap-analysis", async () => {
      const result = await getPromptCallback("competitive-gap-analysis")({ project_id: projectId, period: "7d" });
      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeGreaterThanOrEqual(3);
    }, 30_000);

    it("ai-search-citation-report", async () => {
      const result = await getPromptCallback("ai-search-citation-report")({ project_id: projectId, period: "7d" });
      expect(result.messages).toBeDefined();
      expect(result.messages[0].content.type).toBe("text");
    });
  });

  // ── Resources ──

  describe("MCP resources", () => {
    it("peecai://projects", async () => {
      const projects = await client.get<Project[]>("/projects", { limit: 10 });
      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBeGreaterThan(0);
    });

    const dimensions = ["brands", "tags", "topics", "models", "prompts"] as const;

    for (const dim of dimensions) {
      it(`peecai://projects/{id}/${dim}`, async () => {
        const data = await client.get<unknown[]>(`/${dim}`, { project_id: projectId, limit: 10 });
        expect(Array.isArray(data)).toBe(true);
      });
    }
  });
});
