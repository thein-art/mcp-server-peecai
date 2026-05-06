import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, toolResult, toolError } from "../util.js";
import { projectProfileOutput } from "../schemas.js";
import type { ProjectProfile } from "../types.js";

const marketSchema = z.object({
  marketSize: z.enum(["Neighborhood", "City", "State/Province", "National", "Continental Bloc", "Global"]),
  location: z.string().min(1),
  osmId: z.string().optional(),
});

const audienceSchema = z.object({
  simpleRecommendationSeeker: z.number().int().min(0),
  informedShopper: z.number().int().min(0),
  evaluativeResearcher: z.number().int().min(0),
});

/** Registers tools for reading and writing the project profile. */
export function registerProjectProfileTools(server: McpServer, client: PeecApiClient, allowWrites: boolean) {
  server.registerTool(
    "get_project_profile",
    {
      title: "Get Project Profile",
      description: "Read the project's brand profile (description, industry, brand identity, target markets, audience distribution, products & services). Returns `{ profile: null }` if the project hasn't been profiled yet.",
      inputSchema: {
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
      },
      outputSchema: projectProfileOutput,
      annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ project_id }, extra) => {
      try {
        const result = await client.getRaw<{ profile: ProjectProfile | null }>("/project-profile", {
          project_id: requireProjectId(project_id),
        }, extra.signal);
        const summary = result.profile ? `Profile loaded for ${result.profile.industry || "project"}` : "No profile set for project";
        return toolResult({ _summary: summary, profile: result.profile });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  if (!allowWrites) return;

  server.registerTool(
    "set_project_profile",
    {
      title: "Set Project Profile",
      description: "Replace the project's brand profile (full overwrite). All fields are required. `audienceDistribution` must sum to 100. Triggers a background refresh of prompt suggestions. Returns 403 while the project is in onboarding.",
      inputSchema: {
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        occupation: z.string().min(1).describe("Brand occupation/role (e.g. 'B2B SaaS company')"),
        industry: z.string().min(1).describe("Industry the brand operates in"),
        brandPresentation: z.array(z.string().min(1)).min(1).describe("Brand presentation/identity bullets"),
        productsAndServices: z.array(z.string().min(1)).min(1).describe("Products and services offered"),
        targetMarkets: z.array(marketSchema).min(1).describe("Target geographic markets"),
        audienceDistribution: audienceSchema.describe("Audience archetype distribution; integer counts that must sum to 100"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ project_id, occupation, industry, brandPresentation, productsAndServices, targetMarkets, audienceDistribution }, extra) => {
      try {
        const sum = audienceDistribution.simpleRecommendationSeeker + audienceDistribution.informedShopper + audienceDistribution.evaluativeResearcher;
        if (sum !== 100) {
          throw new Error(`audienceDistribution percentages must sum to 100 (got ${sum})`);
        }
        await client.putRaw("/project-profile", {
          occupation, industry, brandPresentation, productsAndServices, targetMarkets, audienceDistribution,
        }, { project_id: requireProjectId(project_id) }, extra.signal);
        return toolResult({ _summary: "Project profile updated" });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
