import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, dateSchema, dimensionsSchema, filterSchema, validateDateRange, slimReportRows, summaryForDomainsReport, toolResult, toolError } from "../util.js";
import type { DomainReportRow } from "../types.js";

const DOMAINS_FILTER_FIELDS = ["model_id", "tag_id", "topic_id", "prompt_id", "domain", "url", "country_code"] as const;

/** Registers the get_domains_report tool for domain classification, usage, and citation analytics. */
export function registerDomainsReportTool(server: McpServer, client: PeecApiClient) {
  server.registerTool(
    "get_domains_report",
    {
      description: "Get domain analytics report: retrieval_rate, citation_rate, and retrieved_percentage. Classification values: OWN, CORPORATE, COMPETITOR, EDITORIAL, REFERENCE, INSTITUTIONAL, UGC, OTHER. Returns up to limit results (default: 100). Classification is filtered client-side after retrieval. Use filters array for server-side filtering by model, tag, topic, prompt, domain, URL, or country_code. Without date filters, returns data across all available dates. Empty results may indicate the project has no report data for the given time range or filters.",
      inputSchema: {
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        start_date: dateSchema.describe("Start date (YYYY-MM-DD). Omit for no lower bound.").optional(),
        end_date: dateSchema.describe("End date (YYYY-MM-DD). Omit for no upper bound.").optional(),
        dimensions: dimensionsSchema.optional(),
        classification: z.enum(["OWN", "CORPORATE", "COMPETITOR", "EDITORIAL", "REFERENCE", "INSTITUTIONAL", "UGC", "OTHER"])
          .describe("Filter by domain classification (applied client-side after retrieval).")
          .optional(),
        filters: filterSchema(DOMAINS_FILTER_FIELDS).optional(),
        limit: z.number().min(1).max(10000).default(100).describe("Max results (1-10000, default: 100)"),
        offset: z.number().min(0).default(0).describe("Results to skip"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ project_id, start_date, end_date, dimensions, classification, filters, limit, offset }) => {
      try {
        const dates = validateDateRange(start_date, end_date);
        const body: Record<string, unknown> = {
          project_id: requireProjectId(project_id),
        };
        if (dates.start_date) body.start_date = dates.start_date;
        if (dates.end_date) body.end_date = dates.end_date;
        if (dimensions) body.dimensions = dimensions;
        body.limit = limit;
        body.offset = offset;

        if (filters) body.filters = filters;

        let data = await client.post<DomainReportRow[]>("/reports/domains", body);
        if (classification) {
          data = data.filter((row) => row.classification === classification);
        }
        const rows = slimReportRows(data);
        return toolResult({ _summary: summaryForDomainsReport(rows), rows });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
