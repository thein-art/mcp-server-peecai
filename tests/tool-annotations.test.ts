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

const TOOL_NAMES = [
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
] as const;

describe("tool annotations", () => {
  function setup() {
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
    return server;
  }

  it("all 11 tools are registered", () => {
    const server = setup();
    const registered = Object.keys((server as any)._registeredTools);
    for (const name of TOOL_NAMES) {
      expect(registered).toContain(name);
    }
  });

  for (const toolName of TOOL_NAMES) {
    it(`${toolName} has readOnlyHint: true`, () => {
      const server = setup();
      const tool = (server as any)._registeredTools[toolName];
      expect(tool.annotations?.readOnlyHint).toBe(true);
    });

    it(`${toolName} has destructiveHint: false`, () => {
      const server = setup();
      const tool = (server as any)._registeredTools[toolName];
      expect(tool.annotations?.destructiveHint).toBe(false);
    });

    it(`${toolName} has idempotentHint: true`, () => {
      const server = setup();
      const tool = (server as any)._registeredTools[toolName];
      expect(tool.annotations?.idempotentHint).toBe(true);
    });

    it(`${toolName} has openWorldHint: false`, () => {
      const server = setup();
      const tool = (server as any)._registeredTools[toolName];
      expect(tool.annotations?.openWorldHint).toBe(false);
    });
  }
});
