import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PeecApiClient } from "./api-client.js";
import { requireProjectId } from "./util.js";
import type { Brand, Model, Prompt } from "./types.js";

/** Registers guided workflow prompts for common Peec AI analytics tasks. */
export function registerPromptTemplates(server: McpServer, client: PeecApiClient) {
  server.registerPrompt(
    "brand-visibility-analysis",
    {
      title: "Brand Visibility Analysis",
      description: "Analyze brand visibility, sentiment, and position across AI models for a project.",
      argsSchema: {
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted)").optional(),
        period: z.enum(["7d", "28d", "90d"]).default("28d").describe("Analysis period"),
      },
    },
    async ({ project_id, period }) => {
      try {
        const days = { "7d": 7, "28d": 28, "90d": 90 }[period];
        const endDate = new Date().toISOString().slice(0, 10);
        const startDate = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
        const projectClause = project_id ? ` for project ${project_id}` : "";

        const pid = requireProjectId(project_id);
        const [brands, models] = await Promise.all([
          client.get<Brand[]>("/brands", { project_id: pid, limit: 10000 }),
          client.get<Model[]>("/models", { project_id: pid, limit: 10000 }),
        ]);

        return {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "resource" as const,
                resource: { uri: `peecai://projects/${pid}/brands`, mimeType: "application/json", text: JSON.stringify(brands) },
              },
            },
            {
              role: "user" as const,
              content: {
                type: "resource" as const,
                resource: { uri: `peecai://projects/${pid}/models`, mimeType: "application/json", text: JSON.stringify(models) },
              },
            },
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: [
                  `Perform a brand visibility analysis${projectClause} for the period ${startDate} to ${endDate}.`,
                  "",
                  "Steps:",
                  `1. Use get_brands_report with start_date="${startDate}", end_date="${endDate}" to get overall brand metrics.`,
                  `2. Use get_brands_report with dimensions=["model_id"] to break down visibility by AI model.`,
                  "",
                  "Reference data for brands and models is pre-loaded above — use it to resolve IDs in report results.",
                  "",
                  "Provide:",
                  "- A summary table of all brands with visibility, sentiment, and position",
                  "- Per-model breakdown highlighting where each brand performs best/worst",
                  "- Key insights and recommendations for improving AI visibility",
                ].join("\n"),
              },
            },
          ],
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`brand-visibility-analysis prompt failed: ${msg}`);
      }
    },
  );

  server.registerPrompt(
    "competitive-gap-analysis",
    {
      title: "Competitive Gap Analysis",
      description: "Compare own brand vs competitors — identify visibility gaps across prompts and models.",
      argsSchema: {
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted)").optional(),
        period: z.enum(["7d", "28d", "90d"]).default("28d").describe("Analysis period"),
      },
    },
    async ({ project_id, period }) => {
      try {
        const days = { "7d": 7, "28d": 28, "90d": 90 }[period];
        const endDate = new Date().toISOString().slice(0, 10);
        const startDate = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
        const projectClause = project_id ? ` for project ${project_id}` : "";

        const pid = requireProjectId(project_id);
        const [brands, models, prompts] = await Promise.all([
          client.get<Brand[]>("/brands", { project_id: pid, limit: 10000 }),
          client.get<Model[]>("/models", { project_id: pid, limit: 10000 }),
          client.get<Prompt[]>("/prompts", { project_id: pid, limit: 10000 }),
        ]);

        return {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "resource" as const,
                resource: { uri: `peecai://projects/${pid}/brands`, mimeType: "application/json", text: JSON.stringify(brands) },
              },
            },
            {
              role: "user" as const,
              content: {
                type: "resource" as const,
                resource: { uri: `peecai://projects/${pid}/models`, mimeType: "application/json", text: JSON.stringify(models) },
              },
            },
            {
              role: "user" as const,
              content: {
                type: "resource" as const,
                resource: { uri: `peecai://projects/${pid}/prompts`, mimeType: "application/json", text: JSON.stringify(prompts) },
              },
            },
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: [
                  `Perform a competitive gap analysis${projectClause} for the period ${startDate} to ${endDate}.`,
                  "",
                  "Steps:",
                  "1. Identify own brand vs competitor brands from the pre-loaded brands data above.",
                  `2. Use get_brands_report with dimensions=["prompt_id"] to see per-prompt visibility.`,
                  `3. Use get_brands_report with dimensions=["model_id"] to see per-model visibility.`,
                  "",
                  "Reference data for brands, models, and prompts is pre-loaded above — use it to resolve IDs in report results.",
                  "",
                  "Provide:",
                  "- Side-by-side comparison table: own brand vs each competitor",
                  "- Top prompts where competitors outperform the own brand (visibility gaps)",
                  "- Models where the own brand underperforms relative to competitors",
                  "- Actionable recommendations to close the top gaps",
                ].join("\n"),
              },
            },
          ],
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`competitive-gap-analysis prompt failed: ${msg}`);
      }
    },
  );

  server.registerPrompt(
    "ai-search-citation-report",
    {
      title: "AI Search Citation Report",
      description: "Analyze which URLs and domains get cited in AI responses — find content optimization opportunities.",
      argsSchema: {
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted)").optional(),
        period: z.enum(["7d", "28d", "90d"]).default("28d").describe("Analysis period"),
      },
    },
    ({ project_id, period }) => {
      const days = { "7d": 7, "28d": 28, "90d": 90 }[period];
      const endDate = new Date().toISOString().slice(0, 10);
      const startDate = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      const projectClause = project_id ? ` for project ${project_id}` : "";

      return {
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              `Generate an AI search citation report${projectClause} for the period ${startDate} to ${endDate}.`,
              "",
              "Steps:",
              `1. Use get_domains_report with start_date="${startDate}", end_date="${endDate}" to see top cited domains.`,
              "2. Use get_domains_report with classification filter to compare OWN vs EDITORIAL vs COMPETITOR domains.",
              `3. Use get_urls_report with start_date="${startDate}", end_date="${endDate}" to find top cited URLs.`,
              "4. Use get_urls_report with classification filter for ARTICLE and HOW_TO_GUIDE to find editorial opportunities.",
              "",
              "Provide:",
              "- Top 20 most-cited domains with classification and usage rate",
              "- Own domain performance vs editorial and competitor domains",
              "- Top 20 most-cited URLs with titles and citation counts",
              "- Content recommendations: which types of pages get cited most, and what the brand should create",
            ].join("\n"),
          },
        }],
      };
    },
  );
}
