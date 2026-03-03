import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { toolResult, toolError } from "../util.js";
import type { Project } from "../types.js";

/** Registers the list_projects tool for retrieving all company projects. */
export function registerProjectsTool(server: McpServer, client: PeecApiClient) {
  server.tool(
    "list_projects",
    "List all Peec.ai projects for the company. Returns project IDs, names, and statuses. Status values: CUSTOMER (active, ongoing monitoring), CUSTOMER_ENDED, PITCH (active demo), PITCH_ENDED (completed demo), TRIAL, TRIAL_ENDED, ONBOARDING, DELETED. Use CUSTOMER projects for current data.",
    {
      limit: z.number().min(1).max(10000).default(1000).describe("Max results to return (1-10000)").optional(),
      offset: z.number().min(0).default(0).describe("Number of results to skip").optional(),
    },
    async ({ limit, offset }) => {
      try {
        const data = await client.get<Project[]>("/projects", { limit, offset });
        return toolResult(data);
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
