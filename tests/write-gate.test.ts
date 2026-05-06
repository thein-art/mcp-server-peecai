import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../src/api-client.js";

import { registerWriteBrandsTools } from "../src/tools/write-brands.js";
import { registerWritePromptsTools } from "../src/tools/write-prompts.js";
import { registerWriteTagsTools } from "../src/tools/write-tags.js";
import { registerWriteTopicsTools } from "../src/tools/write-topics.js";
import { registerSuggestionActionTools } from "../src/tools/suggestion-actions.js";

const WRITE_TOOL_NAMES = [
  "create_brand", "update_brand", "delete_brand",
  "create_prompt", "update_prompt", "delete_prompt",
  "create_tag", "update_tag", "delete_tag",
  "create_topic", "update_topic", "delete_topic",
  "accept_prompt_suggestion", "reject_prompt_suggestion",
  "accept_topic_suggestion", "reject_topic_suggestion",
  "accept_brand_suggestion", "reject_brand_suggestion",
];

function registerAllWriteTools(server: McpServer, client: PeecApiClient) {
  registerWriteBrandsTools(server, client);
  registerWritePromptsTools(server, client);
  registerWriteTagsTools(server, client);
  registerWriteTopicsTools(server, client);
  registerSuggestionActionTools(server, client);
}

describe("write tools gate", () => {
  it("write tools are registered when explicitly called", () => {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerAllWriteTools(server, client);

    const registered = Object.keys((server as any)._registeredTools);
    for (const name of WRITE_TOOL_NAMES) {
      expect(registered).toContain(name);
    }
  });

  it("all 18 write tools are registered", () => {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerAllWriteTools(server, client);

    const registered = Object.keys((server as any)._registeredTools);
    expect(registered).toHaveLength(18);
  });
});
