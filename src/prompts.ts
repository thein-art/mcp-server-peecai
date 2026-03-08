import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/** Registers guided workflow prompts for common Peec.ai analytics tasks. */
export function registerPromptTemplates(server: McpServer) {
  server.prompt(
    "brand-visibility-analysis",
    "Analyze brand visibility, sentiment, and position across AI models for a project.",
    {
      project_id: z.string().describe("Project ID (uses PEECAI_PROJECT_ID env if omitted)").optional(),
      period: z.enum(["7d", "28d", "90d"]).default("28d").describe("Analysis period"),
    },
    ({ project_id, period }) => {
      const days = { "7d": 7, "28d": 28, "90d": 90 }[period];
      const endDate = new Date().toISOString().slice(0, 10);
      const startDate = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      const projectClause = project_id ? ` for project ${project_id}` : "";

      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: [
              `Perform a brand visibility analysis${projectClause} for the period ${startDate} to ${endDate}.`,
              "",
              "Steps:",
              `1. Use get_brands_report with start_date="${startDate}", end_date="${endDate}" to get overall brand metrics.`,
              `2. Use get_brands_report with dimensions=["model_id"] to break down visibility by AI model.`,
              "3. Use list_brands and list_models to resolve IDs to names.",
              "",
              "Provide:",
              "- A summary table of all brands with visibility, sentiment, and position",
              "- Per-model breakdown highlighting where each brand performs best/worst",
              "- Key insights and recommendations for improving AI visibility",
            ].join("\n"),
          },
        }],
      };
    },
  );

  server.prompt(
    "competitive-gap-analysis",
    "Compare own brand vs competitors — identify visibility gaps across prompts and models.",
    {
      project_id: z.string().describe("Project ID (uses PEECAI_PROJECT_ID env if omitted)").optional(),
      period: z.enum(["7d", "28d", "90d"]).default("28d").describe("Analysis period"),
    },
    ({ project_id, period }) => {
      const days = { "7d": 7, "28d": 28, "90d": 90 }[period];
      const endDate = new Date().toISOString().slice(0, 10);
      const startDate = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      const projectClause = project_id ? ` for project ${project_id}` : "";

      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: [
              `Perform a competitive gap analysis${projectClause} for the period ${startDate} to ${endDate}.`,
              "",
              "Steps:",
              "1. Use list_brands to identify own brand vs competitor brands.",
              `2. Use get_brands_report with dimensions=["prompt_id"] to see per-prompt visibility.`,
              `3. Use get_brands_report with dimensions=["model_id"] to see per-model visibility.`,
              "4. Use list_prompts to resolve prompt IDs to actual search queries.",
              "",
              "Provide:",
              "- Side-by-side comparison table: own brand vs each competitor",
              "- Top prompts where competitors outperform the own brand (visibility gaps)",
              "- Models where the own brand underperforms relative to competitors",
              "- Actionable recommendations to close the top gaps",
            ].join("\n"),
          },
        }],
      };
    },
  );

  server.prompt(
    "ai-search-citation-report",
    "Analyze which URLs and domains get cited in AI responses — find content optimization opportunities.",
    {
      project_id: z.string().describe("Project ID (uses PEECAI_PROJECT_ID env if omitted)").optional(),
      period: z.enum(["7d", "28d", "90d"]).default("28d").describe("Analysis period"),
    },
    ({ project_id, period }) => {
      const days = { "7d": 7, "28d": 28, "90d": 90 }[period];
      const endDate = new Date().toISOString().slice(0, 10);
      const startDate = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      const projectClause = project_id ? ` for project ${project_id}` : "";

      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
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
