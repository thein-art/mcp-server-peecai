import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerWritePromptsTools } from "../../src/tools/write-prompts.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

const mockExtra = { signal: new AbortController().signal, _meta: {}, sendNotification: vi.fn() };

const VALID_PID = "or_00000000-0000-0000-0000-000000000001";

function setup() {
  const client = new PeecApiClient("test-key");
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerWritePromptsTools(server, client);
  return { client, server };
}

afterEach(() => vi.restoreAllMocks());

describe("create_prompt tool", () => {
  it("returns prompt_id and _summary on success", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "postRaw").mockResolvedValue({ id: "pr_new" });

    const handler = getHandler(server, "create_prompt");
    const result = await handler({ project_id: VALID_PID, text: "test prompt", country_code: "DE" }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("Prompt created");
    expect(parsed.prompt_id).toBe("pr_new");
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "postRaw").mockRejectedValue(new Error("Forbidden"));

    const handler = getHandler(server, "create_prompt");
    const result = await handler({ project_id: VALID_PID, text: "test prompt", country_code: "DE" }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Forbidden");
  });
});

describe("update_prompt tool", () => {
  it("returns _summary on success", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "patchRaw").mockResolvedValue({} as any);

    const handler = getHandler(server, "update_prompt");
    const result = await handler({ prompt_id: "pr_1", project_id: VALID_PID, topic_id: "to_1" }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("Prompt updated");
    expect(parsed.prompt_id).toBe("pr_1");
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "patchRaw").mockRejectedValue(new Error("Not Found"));

    const handler = getHandler(server, "update_prompt");
    const result = await handler({ prompt_id: "pr_1", project_id: VALID_PID, topic_id: "to_1" }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Not Found");
  });
});

describe("delete_prompt tool", () => {
  it("returns _summary on success", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "delete").mockResolvedValue(undefined);

    const handler = getHandler(server, "delete_prompt");
    const result = await handler({ prompt_id: "pr_1", project_id: VALID_PID }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("Prompt deleted");
    expect(parsed.prompt_id).toBe("pr_1");
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "delete").mockRejectedValue(new Error("Server Error"));

    const handler = getHandler(server, "delete_prompt");
    const result = await handler({ prompt_id: "pr_1", project_id: VALID_PID }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Server Error");
  });
});
