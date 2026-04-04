import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerWriteTopicsTools } from "../../src/tools/write-topics.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

const mockExtra = { signal: new AbortController().signal, _meta: {}, sendNotification: vi.fn() };

const VALID_PID = "or_00000000-0000-0000-0000-000000000001";

function setup() {
  const client = new PeecApiClient("test-key");
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerWriteTopicsTools(server, client);
  return { client, server };
}

afterEach(() => vi.restoreAllMocks());

describe("create_topic tool", () => {
  it("returns topic_id and _summary on success", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "postRaw").mockResolvedValue({ id: "to_new" });

    const handler = getHandler(server, "create_topic");
    const result = await handler({ project_id: VALID_PID, name: "AI Trends" }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("Topic created");
    expect(parsed.topic_id).toBe("to_new");
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "postRaw").mockRejectedValue(new Error("Forbidden"));

    const handler = getHandler(server, "create_topic");
    const result = await handler({ project_id: VALID_PID, name: "AI Trends" }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Forbidden");
  });
});

describe("update_topic tool", () => {
  it("returns _summary on success", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "patchRaw").mockResolvedValue({} as any);

    const handler = getHandler(server, "update_topic");
    const result = await handler({ topic_id: "to_1", project_id: VALID_PID, name: "Renamed" }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("Topic updated");
    expect(parsed.topic_id).toBe("to_1");
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "patchRaw").mockRejectedValue(new Error("Not Found"));

    const handler = getHandler(server, "update_topic");
    const result = await handler({ topic_id: "to_1", project_id: VALID_PID, name: "X" }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Not Found");
  });
});

describe("delete_topic tool", () => {
  it("returns _summary on success", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "delete").mockResolvedValue(undefined);

    const handler = getHandler(server, "delete_topic");
    const result = await handler({ topic_id: "to_1", project_id: VALID_PID }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("Topic deleted");
    expect(parsed.topic_id).toBe("to_1");
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "delete").mockRejectedValue(new Error("Server Error"));

    const handler = getHandler(server, "delete_topic");
    const result = await handler({ topic_id: "to_1", project_id: VALID_PID }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Server Error");
  });
});
