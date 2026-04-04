import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, requireSafeId, toolResult, toolError } from "../util.js";

const tagColorEnum = z.enum([
  "gray", "red", "orange", "yellow", "lime", "green", "cyan", "blue", "purple",
  "fuchsia", "pink", "emerald", "amber", "violet", "indigo", "teal", "sky",
  "rose", "slate", "zinc", "neutral", "stone",
]);

/** Registers tools for creating, updating, and deleting tags. */
export function registerWriteTagsTools(server: McpServer, client: PeecApiClient) {
  server.registerTool(
    "create_tag",
    {
      title: "Create Tag",
      description: "Create a new tag within a Peec AI project.",
      inputSchema: {
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        name: z.string().min(1).describe("Tag name"),
        color: tagColorEnum.describe("Tag color").optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ project_id, name, color }, extra) => {
      try {
        const body: Record<string, unknown> = { name };
        if (color !== undefined) body.color = color;
        const result = await client.postRaw<{ id: string }>("/tags", body, { project_id: requireProjectId(project_id) }, extra.signal);
        return toolResult({ _summary: "Tag created", tag_id: result.id });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    "update_tag",
    {
      title: "Update Tag",
      description: "Update an existing tag's name or color.",
      inputSchema: {
        tag_id: z.string().min(1).describe("Tag ID to update"),
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        name: z.string().min(1).describe("New tag name").optional(),
        color: tagColorEnum.describe("New tag color").optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ tag_id, project_id, name, color }, extra) => {
      try {
        requireSafeId(tag_id, "tag_id");
        const body: Record<string, unknown> = {};
        if (name !== undefined) body.name = name;
        if (color !== undefined) body.color = color;
        await client.patchRaw("/tags/" + encodeURIComponent(tag_id), body, { project_id: requireProjectId(project_id) }, extra.signal);
        return toolResult({ _summary: "Tag updated", tag_id });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    "delete_tag",
    {
      title: "Delete Tag",
      description: "Soft-delete a tag. This action is irreversible through the API.",
      inputSchema: {
        tag_id: z.string().min(1).describe("Tag ID to delete"),
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ tag_id, project_id }, extra) => {
      try {
        requireSafeId(tag_id, "tag_id");
        await client.delete("/tags/" + encodeURIComponent(tag_id), { project_id: requireProjectId(project_id) }, extra.signal);
        return toolResult({ _summary: "Tag deleted", tag_id });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
