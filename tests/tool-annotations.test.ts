import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../src/api-client.js";
import { registerProjectsTool } from "../src/tools/projects.js";
import { registerBrandsTool } from "../src/tools/brands.js";
import { registerPromptsTool } from "../src/tools/prompts.js";
import { registerTagsTool } from "../src/tools/tags.js";
import { registerTopicsTool } from "../src/tools/topics.js";
import { registerModelsTool } from "../src/tools/models.js";
import { registerChatsTool } from "../src/tools/chats.js";
import { registerChatContentTool } from "../src/tools/chat-content.js";
import { registerBrandsReportTool } from "../src/tools/report-brands.js";
import { registerDomainsReportTool } from "../src/tools/report-domains.js";
import { registerUrlsReportTool } from "../src/tools/report-urls.js";
import { registerSearchQueriesTool } from "../src/tools/queries-search.js";
import { registerShoppingQueriesTool } from "../src/tools/queries-shopping.js";
import { registerPromptSuggestionsTool } from "../src/tools/prompt-suggestions.js";
import { registerTopicSuggestionsTool } from "../src/tools/topic-suggestions.js";
import { registerWriteBrandsTools } from "../src/tools/write-brands.js";
import { registerWritePromptsTools } from "../src/tools/write-prompts.js";
import { registerWriteTagsTools } from "../src/tools/write-tags.js";
import { registerWriteTopicsTools } from "../src/tools/write-topics.js";
import { registerSuggestionActionTools } from "../src/tools/suggestion-actions.js";

// ── Read-only tools ──

const READ_TOOL_NAMES = [
  "list_projects",
  "list_brands",
  "list_prompts",
  "list_tags",
  "list_topics",
  "list_models",
  "list_chats",
  "get_chat_content",
  "get_brands_report",
  "get_domains_report",
  "get_urls_report",
  "search_queries",
  "shopping_queries",
  "list_prompt_suggestions",
  "list_topic_suggestions",
] as const;

const READ_TOOL_TITLES: Record<string, string> = {
  list_projects: "List Projects",
  list_brands: "List Brands",
  list_prompts: "List Prompts",
  list_tags: "List Tags",
  list_topics: "List Topics",
  list_models: "List AI Models (deprecated)",
  list_chats: "List Chats",
  get_chat_content: "Get Chat Content",
  get_brands_report: "Brand Visibility Report",
  get_domains_report: "Domain Citation Report",
  get_urls_report: "URL Citation Report",
  search_queries: "Search Queries",
  shopping_queries: "Shopping Queries",
  list_prompt_suggestions: "List Prompt Suggestions",
  list_topic_suggestions: "List Topic Suggestions",
};

// Tools that should have outputSchema (list tools + chat content)
const TOOLS_WITH_OUTPUT_SCHEMA = [
  "list_projects",
  "list_brands",
  "list_prompts",
  "list_tags",
  "list_topics",
  "list_models",
  "list_chats",
  "get_chat_content",
  "list_prompt_suggestions",
  "list_topic_suggestions",
];

// ── Write tools ──

const CREATE_TOOLS = ["create_brand", "create_prompt", "create_tag", "create_topic"];
const UPDATE_TOOLS = ["update_brand", "update_prompt", "update_tag", "update_topic"];
const DELETE_TOOLS = ["delete_brand", "delete_prompt", "delete_tag", "delete_topic"];
const ACCEPT_TOOLS = ["accept_prompt_suggestion", "accept_topic_suggestion", "accept_brand_suggestion"];
const REJECT_TOOLS = ["reject_prompt_suggestion", "reject_topic_suggestion", "reject_brand_suggestion"];
const ALL_WRITE_TOOLS = [...CREATE_TOOLS, ...UPDATE_TOOLS, ...DELETE_TOOLS, ...ACCEPT_TOOLS, ...REJECT_TOOLS];

function setupReadOnly() {
  const client = new PeecApiClient("test-key");
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerProjectsTool(server, client);
  registerBrandsTool(server, client);
  registerPromptsTool(server, client);
  registerTagsTool(server, client);
  registerTopicsTool(server, client);
  registerModelsTool(server, client);
  registerChatsTool(server, client);
  registerChatContentTool(server, client);
  registerBrandsReportTool(server, client);
  registerDomainsReportTool(server, client);
  registerUrlsReportTool(server, client);
  registerSearchQueriesTool(server, client);
  registerShoppingQueriesTool(server, client);
  registerPromptSuggestionsTool(server, client);
  registerTopicSuggestionsTool(server, client);
  return server;
}

function setupWithWrites() {
  const client = new PeecApiClient("test-key");
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerProjectsTool(server, client);
  registerBrandsTool(server, client);
  registerPromptsTool(server, client);
  registerTagsTool(server, client);
  registerTopicsTool(server, client);
  registerModelsTool(server, client);
  registerChatsTool(server, client);
  registerChatContentTool(server, client);
  registerBrandsReportTool(server, client);
  registerDomainsReportTool(server, client);
  registerUrlsReportTool(server, client);
  registerSearchQueriesTool(server, client);
  registerShoppingQueriesTool(server, client);
  registerPromptSuggestionsTool(server, client);
  registerTopicSuggestionsTool(server, client);
  registerWriteBrandsTools(server, client);
  registerWritePromptsTools(server, client);
  registerWriteTagsTools(server, client);
  registerWriteTopicsTools(server, client);
  registerSuggestionActionTools(server, client);
  return server;
}

describe("read-only tool annotations", () => {
  it("all 15 read-only tools are registered", () => {
    const server = setupReadOnly();
    const registered = Object.keys((server as any)._registeredTools);
    for (const name of READ_TOOL_NAMES) {
      expect(registered).toContain(name);
    }
  });

  for (const toolName of READ_TOOL_NAMES) {
    it(`${toolName} has readOnlyHint: true`, () => {
      const server = setupReadOnly();
      const tool = (server as any)._registeredTools[toolName];
      expect(tool.annotations?.readOnlyHint).toBe(true);
    });

    it(`${toolName} has destructiveHint: false`, () => {
      const server = setupReadOnly();
      const tool = (server as any)._registeredTools[toolName];
      expect(tool.annotations?.destructiveHint).toBe(false);
    });

    it(`${toolName} has idempotentHint: true`, () => {
      const server = setupReadOnly();
      const tool = (server as any)._registeredTools[toolName];
      expect(tool.annotations?.idempotentHint).toBe(true);
    });

    it(`${toolName} has openWorldHint: false`, () => {
      const server = setupReadOnly();
      const tool = (server as any)._registeredTools[toolName];
      expect(tool.annotations?.openWorldHint).toBe(false);
    });

    it(`${toolName} has a title`, () => {
      const server = setupReadOnly();
      const tool = (server as any)._registeredTools[toolName];
      expect(tool.title).toBe(READ_TOOL_TITLES[toolName]);
    });
  }

  for (const toolName of TOOLS_WITH_OUTPUT_SCHEMA) {
    it(`${toolName} has outputSchema defined`, () => {
      const server = setupReadOnly();
      const tool = (server as any)._registeredTools[toolName];
      expect(tool.outputSchema).toBeDefined();
    });
  }
});

describe("write tool annotations", () => {
  it("all 33 tools are registered when writes enabled", () => {
    const server = setupWithWrites();
    const registered = Object.keys((server as any)._registeredTools);
    expect(registered).toHaveLength(33);
  });

  for (const toolName of ALL_WRITE_TOOLS) {
    it(`${toolName} has readOnlyHint: false`, () => {
      const server = setupWithWrites();
      const tool = (server as any)._registeredTools[toolName];
      expect(tool.annotations?.readOnlyHint).toBe(false);
    });

    it(`${toolName} has openWorldHint: false`, () => {
      const server = setupWithWrites();
      const tool = (server as any)._registeredTools[toolName];
      expect(tool.annotations?.openWorldHint).toBe(false);
    });

    it(`${toolName} has a title`, () => {
      const server = setupWithWrites();
      const tool = (server as any)._registeredTools[toolName];
      expect(typeof tool.title).toBe("string");
      expect(tool.title.length).toBeGreaterThan(0);
    });
  }

  for (const toolName of CREATE_TOOLS) {
    it(`${toolName} has destructiveHint: false, idempotentHint: false`, () => {
      const server = setupWithWrites();
      const tool = (server as any)._registeredTools[toolName];
      expect(tool.annotations?.destructiveHint).toBe(false);
      expect(tool.annotations?.idempotentHint).toBe(false);
    });
  }

  for (const toolName of UPDATE_TOOLS) {
    it(`${toolName} has destructiveHint: false, idempotentHint: true`, () => {
      const server = setupWithWrites();
      const tool = (server as any)._registeredTools[toolName];
      expect(tool.annotations?.destructiveHint).toBe(false);
      expect(tool.annotations?.idempotentHint).toBe(true);
    });
  }

  for (const toolName of DELETE_TOOLS) {
    it(`${toolName} has destructiveHint: true, idempotentHint: true`, () => {
      const server = setupWithWrites();
      const tool = (server as any)._registeredTools[toolName];
      expect(tool.annotations?.destructiveHint).toBe(true);
      expect(tool.annotations?.idempotentHint).toBe(true);
    });
  }

  for (const toolName of ACCEPT_TOOLS) {
    it(`${toolName} has destructiveHint: false, idempotentHint: false`, () => {
      const server = setupWithWrites();
      const tool = (server as any)._registeredTools[toolName];
      expect(tool.annotations?.destructiveHint).toBe(false);
      expect(tool.annotations?.idempotentHint).toBe(false);
    });
  }

  for (const toolName of REJECT_TOOLS) {
    it(`${toolName} has destructiveHint: false, idempotentHint: true`, () => {
      const server = setupWithWrites();
      const tool = (server as any)._registeredTools[toolName];
      expect(tool.annotations?.destructiveHint).toBe(false);
      expect(tool.annotations?.idempotentHint).toBe(true);
    });
  }
});
