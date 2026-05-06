import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerSuggestionActionTools } from "../../src/tools/suggestion-actions.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

const mockExtra = { signal: new AbortController().signal, _meta: {}, sendNotification: vi.fn() };

const VALID_PID = "or_00000000-0000-0000-0000-000000000001";

function setup() {
  const client = new PeecApiClient("test-key");
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerSuggestionActionTools(server, client);
  return { client, server };
}

afterEach(() => vi.restoreAllMocks());

describe("accept_prompt_suggestion tool", () => {
  it("returns prompt_id and _summary on success", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "postRaw").mockResolvedValue({ id: "pr_accepted" });

    const handler = getHandler(server, "accept_prompt_suggestion");
    const result = await handler({ prompt_suggestion_id: "ps_1", project_id: VALID_PID }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("Prompt suggestion accepted");
    expect(parsed.prompt_id).toBe("pr_accepted");
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "postRaw").mockRejectedValue(new Error("Not Found"));

    const handler = getHandler(server, "accept_prompt_suggestion");
    const result = await handler({ prompt_suggestion_id: "ps_1", project_id: VALID_PID }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Not Found");
  });
});

describe("reject_prompt_suggestion tool", () => {
  it("returns _summary on success", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "postRaw").mockResolvedValue({});

    const handler = getHandler(server, "reject_prompt_suggestion");
    const result = await handler({ prompt_suggestion_id: "ps_1", project_id: VALID_PID }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("Prompt suggestion rejected");
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "postRaw").mockRejectedValue(new Error("Forbidden"));

    const handler = getHandler(server, "reject_prompt_suggestion");
    const result = await handler({ prompt_suggestion_id: "ps_1", project_id: VALID_PID }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Forbidden");
  });
});

describe("accept_topic_suggestion tool", () => {
  it("returns topic_id and _summary on success", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "postRaw").mockResolvedValue({ id: "to_accepted" });

    const handler = getHandler(server, "accept_topic_suggestion");
    const result = await handler({ topic_suggestion_id: "ts_1", project_id: VALID_PID }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("Topic suggestion accepted");
    expect(parsed.topic_id).toBe("to_accepted");
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "postRaw").mockRejectedValue(new Error("Not Found"));

    const handler = getHandler(server, "accept_topic_suggestion");
    const result = await handler({ topic_suggestion_id: "ts_1", project_id: VALID_PID }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Not Found");
  });
});

describe("reject_topic_suggestion tool", () => {
  it("returns _summary on success", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "postRaw").mockResolvedValue({});

    const handler = getHandler(server, "reject_topic_suggestion");
    const result = await handler({ topic_suggestion_id: "ts_1", project_id: VALID_PID }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("Topic suggestion rejected");
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "postRaw").mockRejectedValue(new Error("Forbidden"));

    const handler = getHandler(server, "reject_topic_suggestion");
    const result = await handler({ topic_suggestion_id: "ts_1", project_id: VALID_PID }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Forbidden");
  });
});

describe("accept_brand_suggestion tool", () => {
  it("returns brand_id and _summary on success", async () => {
    const { client, server } = setup();
    const postSpy = vi.spyOn(client, "postRaw").mockResolvedValue({ id: "br_accepted" });

    const handler = getHandler(server, "accept_brand_suggestion");
    const result = await handler({ brand_suggestion_id: "bs_1", project_id: VALID_PID }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("Brand suggestion accepted");
    expect(parsed.brand_id).toBe("br_accepted");
    expect(postSpy).toHaveBeenCalledWith(
      "/brands/suggestions/bs_1/accept",
      {},
      { project_id: VALID_PID },
      expect.any(AbortSignal),
    );
  });

  it("rejects unsafe brand_suggestion_id", async () => {
    const { server } = setup();
    const handler = getHandler(server, "accept_brand_suggestion");
    const result = await handler({ brand_suggestion_id: "../bad", project_id: VALID_PID }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid brand_suggestion_id");
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "postRaw").mockRejectedValue(new Error("Not Found"));

    const handler = getHandler(server, "accept_brand_suggestion");
    const result = await handler({ brand_suggestion_id: "bs_1", project_id: VALID_PID }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Not Found");
  });
});

describe("reject_brand_suggestion tool", () => {
  it("returns _summary on success", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "postRaw").mockResolvedValue({});

    const handler = getHandler(server, "reject_brand_suggestion");
    const result = await handler({ brand_suggestion_id: "bs_1", project_id: VALID_PID }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("Brand suggestion rejected");
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "postRaw").mockRejectedValue(new Error("Forbidden"));

    const handler = getHandler(server, "reject_brand_suggestion");
    const result = await handler({ brand_suggestion_id: "bs_1", project_id: VALID_PID }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Forbidden");
  });
});
