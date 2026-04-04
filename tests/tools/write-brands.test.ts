import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerWriteBrandsTools } from "../../src/tools/write-brands.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

const mockExtra = { signal: new AbortController().signal, _meta: {}, sendNotification: vi.fn() };

const VALID_PID = "or_00000000-0000-0000-0000-000000000001";

function setup() {
  const client = new PeecApiClient("test-key");
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerWriteBrandsTools(server, client);
  return { client, server };
}

afterEach(() => vi.restoreAllMocks());

describe("create_brand tool", () => {
  it("returns brand_id and _summary on success", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "postRaw").mockResolvedValue({ id: "br_new" });

    const handler = getHandler(server, "create_brand");
    const result = await handler({ project_id: VALID_PID, name: "Acme" }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("Brand created");
    expect(parsed.brand_id).toBe("br_new");
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "postRaw").mockRejectedValue(new Error("Forbidden"));

    const handler = getHandler(server, "create_brand");
    const result = await handler({ project_id: VALID_PID, name: "Acme" }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Forbidden");
  });
});

describe("update_brand tool", () => {
  it("returns _summary on success", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "patchRaw").mockResolvedValue({} as any);

    const handler = getHandler(server, "update_brand");
    const result = await handler({ brand_id: "br_1", project_id: VALID_PID, name: "New Name" }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("Brand updated");
    expect(parsed.brand_id).toBe("br_1");
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "patchRaw").mockRejectedValue(new Error("Not Found"));

    const handler = getHandler(server, "update_brand");
    const result = await handler({ brand_id: "br_1", project_id: VALID_PID, name: "X" }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Not Found");
  });
});

describe("delete_brand tool", () => {
  it("returns _summary on success", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "delete").mockResolvedValue(undefined);

    const handler = getHandler(server, "delete_brand");
    const result = await handler({ brand_id: "br_1", project_id: VALID_PID }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("Brand deleted");
    expect(parsed.brand_id).toBe("br_1");
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "delete").mockRejectedValue(new Error("Server Error"));

    const handler = getHandler(server, "delete_brand");
    const result = await handler({ brand_id: "br_1", project_id: VALID_PID }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Server Error");
  });
});
