import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../src/api-client.js";
import type { Project } from "../src/types.js";

function getResourceHandler(server: McpServer, uri: string) {
  return (server as any)._registeredResources[uri].readCallback;
}

describe("projects://list resource", () => {
  afterEach(() => vi.restoreAllMocks());

  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });

    server.registerResource("projects-list", "projects://list", {
      description: "List all available Peec AI projects for the authenticated account.",
      mimeType: "application/json",
    }, async () => {
      try {
        const projects = await client.get<Project[]>("/projects", { limit: 1000 });
        return {
          contents: [{
            uri: "projects://list",
            mimeType: "application/json",
            text: JSON.stringify(projects),
          }],
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        throw new Error(`Failed to fetch projects: ${message}`);
      }
    });

    return { client, server };
  }

  it("returns projects as JSON resource", async () => {
    const { client, server } = setup();
    const projects = [
      { id: "or_00000000-0000-0000-0000-000000000001", name: "Project A", status: "CUSTOMER" },
    ];
    vi.spyOn(client, "get").mockResolvedValue(projects);

    const handler = getResourceHandler(server, "projects://list");
    const result = await handler(new URL("projects://list"), {});

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].uri).toBe("projects://list");
    expect(result.contents[0].mimeType).toBe("application/json");

    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("Project A");
  });

  it("throws descriptive error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "get").mockRejectedValue(new Error("Unauthorized"));

    const handler = getResourceHandler(server, "projects://list");
    await expect(handler(new URL("projects://list"), {})).rejects.toThrow(
      "Failed to fetch projects: Unauthorized"
    );
  });
});
