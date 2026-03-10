import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../src/api-client.js";
import type { Brand, Model, Prompt, Project, Tag, Topic } from "../src/types.js";

function getResourceHandler(server: McpServer, uri: string) {
  return (server as any)._registeredResources[uri].readCallback;
}

function getResourceTemplateHandler(server: McpServer, name: string) {
  return (server as any)._registeredResourceTemplates[name].readCallback;
}

describe("peecai://projects resource", () => {
  afterEach(() => vi.restoreAllMocks());

  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });

    server.registerResource("projects", "peecai://projects", {
      description: "List all available Peec AI projects for the authenticated account.",
      mimeType: "application/json",
    }, async () => {
      try {
        const projects = await client.get<Project[]>("/projects", { limit: 1000 });
        return {
          contents: [{
            uri: "peecai://projects",
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

    const handler = getResourceHandler(server, "peecai://projects");
    const result = await handler(new URL("peecai://projects"), {});

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].uri).toBe("peecai://projects");
    expect(result.contents[0].mimeType).toBe("application/json");

    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("Project A");
  });

  it("throws descriptive error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "get").mockRejectedValue(new Error("Unauthorized"));

    const handler = getResourceHandler(server, "peecai://projects");
    await expect(handler(new URL("peecai://projects"), {})).rejects.toThrow(
      "Failed to fetch projects: Unauthorized"
    );
  });
});

describe("dimension resource templates", () => {
  afterEach(() => vi.restoreAllMocks());

  const dimensions = [
    { name: "brands", endpoint: "/brands", description: "Tracked brands and their domains for a project." },
    { name: "tags", endpoint: "/tags", description: "Category tags for a project." },
    { name: "topics", endpoint: "/topics", description: "Topic groupings for a project." },
    { name: "models", endpoint: "/models", description: "AI models tracked by Peec AI for a project." },
    { name: "prompts", endpoint: "/prompts", description: "Search prompts monitored across AI models for a project." },
  ];

  function setup() {
    const client = new PeecApiClient("test-key");
    const server = new McpServer({ name: "test", version: "0.0.1" });

    for (const { name, endpoint, description } of dimensions) {
      server.registerResource(
        name,
        new ResourceTemplate(`peecai://projects/{project_id}/${name}`, { list: undefined }),
        { description, mimeType: "application/json" },
        async (uri, { project_id }) => {
          try {
            const data = await client.get<(Brand | Tag | Topic | Model | Prompt)[]>(endpoint, {
              project_id: String(project_id),
              limit: 10000,
            });
            return {
              contents: [{
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify(data),
              }],
            };
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            throw new Error(`Failed to fetch ${name}: ${message}`);
          }
        },
      );
    }

    return { client, server };
  }

  it.each(dimensions)("$name: returns data as JSON resource", async ({ name, endpoint }) => {
    const { client, server } = setup();
    const mockData = [{ id: "test-1", name: "Test Item" }];
    vi.spyOn(client, "get").mockResolvedValue(mockData);

    const handler = getResourceTemplateHandler(server, name);
    const uri = new URL(`peecai://projects/proj_123/${name}`);
    const result = await handler(uri, { project_id: "proj_123" });

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].uri).toBe(`peecai://projects/proj_123/${name}`);
    expect(result.contents[0].mimeType).toBe("application/json");

    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed).toEqual(mockData);

    expect(client.get).toHaveBeenCalledWith(endpoint, {
      project_id: "proj_123",
      limit: 10000,
    });
  });

  it.each(dimensions)("$name: throws descriptive error on API failure", async ({ name }) => {
    const { client, server } = setup();
    vi.spyOn(client, "get").mockRejectedValue(new Error("Not Found"));

    const handler = getResourceTemplateHandler(server, name);
    const uri = new URL(`peecai://projects/proj_123/${name}`);
    await expect(handler(uri, { project_id: "proj_123" })).rejects.toThrow(
      `Failed to fetch ${name}: Not Found`
    );
  });
});
