import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, requireSafeId, toolResult, toolError } from "../util.js";

/** Registers tools for creating, updating, and deleting brands. */
export function registerWriteBrandsTools(server: McpServer, client: PeecApiClient) {
  server.registerTool(
    "create_brand",
    {
      title: "Create Brand",
      description: "Create a new brand within a Peec AI project. Requires a brand name; optionally provide aliases, domains, and regex pattern.",
      inputSchema: {
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        name: z.string().min(1).describe("Brand name"),
        aliases: z.array(z.string()).describe("Alternative names for the brand").optional(),
        domains: z.array(z.string()).describe("Associated domain names").optional(),
        regex: z.string().describe("Custom regex pattern for brand detection").optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ project_id, name, aliases, domains, regex }, extra) => {
      try {
        const result = await client.postRaw<{ id: string }>("/brands", { name, aliases, domains, regex }, { project_id: requireProjectId(project_id) }, extra.signal);
        return toolResult({ _summary: "Brand created", brand_id: result.id });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    "update_brand",
    {
      title: "Update Brand",
      description: "Update an existing brand. Changing name, aliases, or regex triggers metric recalculation.",
      inputSchema: {
        brand_id: z.string().min(1).describe("Brand ID to update"),
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        name: z.string().min(1).describe("New brand name").optional(),
        aliases: z.array(z.string()).describe("Updated aliases").optional(),
        domains: z.array(z.string()).describe("Updated domains").optional(),
        regex: z.string().nullable().describe("Updated regex (null to remove)").optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ brand_id, project_id, name, aliases, domains, regex }, extra) => {
      try {
        requireSafeId(brand_id, "brand_id");
        const body: Record<string, unknown> = {};
        if (name !== undefined) body.name = name;
        if (aliases !== undefined) body.aliases = aliases;
        if (domains !== undefined) body.domains = domains;
        if (regex !== undefined) body.regex = regex;
        await client.patchRaw("/brands/" + encodeURIComponent(brand_id), body, { project_id: requireProjectId(project_id) }, extra.signal);
        return toolResult({ _summary: "Brand updated", brand_id });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    "delete_brand",
    {
      title: "Delete Brand",
      description: "Soft-delete a brand. This action is irreversible through the API.",
      inputSchema: {
        brand_id: z.string().min(1).describe("Brand ID to delete"),
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ brand_id, project_id }, extra) => {
      try {
        requireSafeId(brand_id, "brand_id");
        await client.delete("/brands/" + encodeURIComponent(brand_id), { project_id: requireProjectId(project_id) }, extra.signal);
        return toolResult({ _summary: "Brand deleted", brand_id });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
