import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerPromptsTool } from "../../src/tools/prompts.js";
import { registerTagsTool } from "../../src/tools/tags.js";
import { registerTopicsTool } from "../../src/tools/topics.js";
import { registerModelsTool } from "../../src/tools/models.js";
import { registerChatContentTool } from "../../src/tools/chat-content.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

const VALID_PID = "or_00000000-0000-0000-0000-000000000001";

afterEach(() => vi.restoreAllMocks());

describe("list_prompts tool", () => {
  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerPromptsTool(server, client);
    return { client, server };
  }

  it("returns prompts with _summary", async () => {
    const { client, server } = setup();
    const prompts = [
      { id: "pr_1", message: "best crm software", tags: [], topics: [] },
      { id: "pr_2", message: "top project tools", tags: [], topics: [] },
    ];
    vi.spyOn(client, "get").mockResolvedValue(prompts);

    const handler = getHandler(server, "list_prompts");
    const result = await handler({ project_id: VALID_PID, limit: 1000, offset: 0 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("2 prompts returned");
    expect(parsed.prompts).toHaveLength(2);
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "get").mockRejectedValue(new Error("Forbidden"));

    const handler = getHandler(server, "list_prompts");
    const result = await handler({ project_id: VALID_PID, limit: 1000, offset: 0 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Forbidden");
  });

  it("rejects invalid project_id format", async () => {
    const { server } = setup();
    const handler = getHandler(server, "list_prompts");
    const result = await handler({ project_id: "bad-id", limit: 1000, offset: 0 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid project_id format");
  });
});

describe("list_tags tool", () => {
  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerTagsTool(server, client);
    return { client, server };
  }

  it("returns tags with _summary", async () => {
    const { client, server } = setup();
    const tags = [{ id: "tg_1", name: "SaaS" }];
    vi.spyOn(client, "get").mockResolvedValue(tags);

    const handler = getHandler(server, "list_tags");
    const result = await handler({ project_id: VALID_PID, limit: 1000, offset: 0 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("1 tag returned");
    expect(parsed.tags).toHaveLength(1);
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "get").mockRejectedValue(new Error("Network error"));

    const handler = getHandler(server, "list_tags");
    const result = await handler({ project_id: VALID_PID, limit: 1000, offset: 0 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Network error");
  });
});

describe("list_topics tool", () => {
  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerTopicsTool(server, client);
    return { client, server };
  }

  it("returns topics with _summary", async () => {
    const { client, server } = setup();
    const topics = [
      { id: "tp_1", name: "Analytics" },
      { id: "tp_2", name: "CRM" },
      { id: "tp_3", name: "Marketing" },
    ];
    vi.spyOn(client, "get").mockResolvedValue(topics);

    const handler = getHandler(server, "list_topics");
    const result = await handler({ project_id: VALID_PID, limit: 1000, offset: 0 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("3 topics returned");
    expect(parsed.topics).toHaveLength(3);
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "get").mockRejectedValue(new Error("Timeout"));

    const handler = getHandler(server, "list_topics");
    const result = await handler({ project_id: VALID_PID, limit: 1000, offset: 0 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Timeout");
  });
});

describe("list_models tool", () => {
  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerModelsTool(server, client);
    return { client, server };
  }

  it("returns models with _summary", async () => {
    const { client, server } = setup();
    const models = [
      { id: "mo_1", name: "ChatGPT", active: true },
      { id: "mo_2", name: "Perplexity", active: true },
    ];
    vi.spyOn(client, "get").mockResolvedValue(models);

    const handler = getHandler(server, "list_models");
    const result = await handler({ project_id: VALID_PID, limit: 1000, offset: 0 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("2 models returned");
    expect(parsed.models).toHaveLength(2);
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "get").mockRejectedValue(new Error("Server error"));

    const handler = getHandler(server, "list_models");
    const result = await handler({ project_id: VALID_PID, limit: 1000, offset: 0 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Server error");
  });
});

describe("get_chat_content tool", () => {
  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerChatContentTool(server, client);
    return { client, server };
  }

  it("returns chat content with _summary", async () => {
    const { client, server } = setup();
    const chatContent = {
      messages: [{ role: "user", content: "Hello" }, { role: "assistant", content: "Hi" }],
      sources: [{ url: "https://example.com" }],
      brands_mentioned: [{ id: "br_1", name: "BrandA" }],
      queries: [],
      products: [],
    };
    vi.spyOn(client, "getRaw").mockResolvedValue(chatContent);

    const handler = getHandler(server, "get_chat_content");
    const result = await handler({ chat_id: "ch_abc-123", project_id: VALID_PID });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("Chat ch_abc-123: 2 messages, 1 sources, 1 brands");
    expect(parsed.chat.messages).toHaveLength(2);
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "getRaw").mockRejectedValue(new Error("Not found"));

    const handler = getHandler(server, "get_chat_content");
    const result = await handler({ chat_id: "ch_abc-123", project_id: VALID_PID });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Not found");
  });

  it("rejects invalid project_id format", async () => {
    const { server } = setup();
    const handler = getHandler(server, "get_chat_content");
    const result = await handler({ chat_id: "ch_abc-123", project_id: "invalid" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid project_id format");
  });
});
