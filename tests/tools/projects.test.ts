import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerProjectsTool } from "../../src/tools/projects.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

describe("list_projects tool", () => {
  afterEach(() => vi.restoreAllMocks());

  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerProjectsTool(server, client);
    return { client, server };
  }

  it("returns projects with _summary", async () => {
    const { client, server } = setup();
    const projects = [
      { id: "or_00000000-0000-0000-0000-000000000001", name: "Project A", status: "CUSTOMER" },
      { id: "or_00000000-0000-0000-0000-000000000002", name: "Project B", status: "PITCH" },
    ];
    vi.spyOn(client, "get").mockResolvedValue(projects);

    const handler = getHandler(server, "list_projects");
    const result = await handler({ limit: 1000, offset: 0 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("2 projects returned");
    expect(parsed.projects).toHaveLength(2);
    expect(parsed.projects[0].name).toBe("Project A");
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "get").mockRejectedValue(new Error("Unauthorized"));

    const handler = getHandler(server, "list_projects");
    const result = await handler({ limit: 1000, offset: 0 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Unauthorized");
  });
});
