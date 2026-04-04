import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, requireSafeId, toolResult, toolError } from "../util.js";

/** Registers tools for creating, updating, and deleting topics. */
export function registerWriteTopicsTools(server: McpServer, client: PeecApiClient) {
  server.registerTool(
    "create_topic",
    {
      title: "Create Topic",
      description: "Create a new topic within a Peec AI project.",
      inputSchema: {
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        name: z.string().min(1).max(64).describe("Topic name (max 64 characters)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ project_id, name }, extra) => {
      try {
        const result = await client.postRaw<{ id: string }>("/topics", { name }, { project_id: requireProjectId(project_id) }, extra.signal);
        return toolResult({ _summary: "Topic created", topic_id: result.id });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    "update_topic",
    {
      title: "Update Topic",
      description: "Update an existing topic's name.",
      inputSchema: {
        topic_id: z.string().min(1).describe("Topic ID to update"),
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        name: z.string().min(1).max(64).describe("New topic name (max 64 characters)").optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ topic_id, project_id, name }, extra) => {
      try {
        requireSafeId(topic_id, "topic_id");
        const body: Record<string, unknown> = {};
        if (name !== undefined) body.name = name;
        await client.patchRaw("/topics/" + encodeURIComponent(topic_id), body, { project_id: requireProjectId(project_id) }, extra.signal);
        return toolResult({ _summary: "Topic updated", topic_id });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    "delete_topic",
    {
      title: "Delete Topic",
      description: "Soft-delete a topic. This action is irreversible through the API.",
      inputSchema: {
        topic_id: z.string().min(1).describe("Topic ID to delete"),
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ topic_id, project_id }, extra) => {
      try {
        requireSafeId(topic_id, "topic_id");
        await client.delete("/topics/" + encodeURIComponent(topic_id), { project_id: requireProjectId(project_id) }, extra.signal);
        return toolResult({ _summary: "Topic deleted", topic_id });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
