import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, dateSchema, dimensionsSchema, filterSchema, orderBySchema, validateDateRange, slimReportRows, summaryForUrlsReport, toolResult, toolError } from "../util.js";
import type { UrlReportRow } from "../types.js";

const URLS_FILTER_FIELDS = ["model_id", "model_channel_id", "tag_id", "topic_id", "prompt_id", "domain", "url", "country_code", "chat_id", "gap", "mentioned_brand_id", "mentioned_brand_count", "domain_classification", "url_classification"] as const;
const URLS_ORDER_BY_FIELDS = ["retrieval_count", "retrievals", "citation_count", "citation_rate"] as const;

/** Registers the get_urls_report tool for URL classification, usage, and citation analytics. */
export function registerUrlsReportTool(server: McpServer, client: PeecApiClient) {
  server.registerTool(
    "get_urls_report",
    {
      title: "URL Citation Report",
      description: "Get URL analytics report: citation_count (total citations), retrievals (retrieval count), citation_rate. Classification values: HOMEPAGE, CATEGORY_PAGE, PRODUCT_PAGE, LISTICLE, COMPARISON, PROFILE, ALTERNATIVE, DISCUSSION, HOW_TO_GUIDE, ARTICLE, OTHER. Returns up to limit results (default: 100). Classification is filtered client-side after retrieval. Use filters array for server-side filtering by model, tag, topic, prompt, domain, URL, or country_code. Without date filters, returns data across all available dates. Empty results may indicate the project has no report data for the given time range or filters.",
      inputSchema: {
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        start_date: dateSchema.describe("Start date (YYYY-MM-DD). Omit for no lower bound.").optional(),
        end_date: dateSchema.describe("End date (YYYY-MM-DD). Omit for no upper bound.").optional(),
        dimensions: dimensionsSchema.optional(),
        classification: z.enum(["HOMEPAGE", "CATEGORY_PAGE", "PRODUCT_PAGE", "LISTICLE", "COMPARISON", "PROFILE", "ALTERNATIVE", "DISCUSSION", "HOW_TO_GUIDE", "ARTICLE", "OTHER"])
          .describe("Filter by URL classification (applied client-side after retrieval).")
          .optional(),
        filters: filterSchema(URLS_FILTER_FIELDS).optional(),
        order_by: orderBySchema(URLS_ORDER_BY_FIELDS).optional(),
        limit: z.number().min(1).max(10000).default(100).describe("Max results (1-10000, default: 100)"),
        offset: z.number().min(0).default(0).describe("Results to skip"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ project_id, start_date, end_date, dimensions, classification, filters, order_by, limit, offset }, extra) => {
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
        if (order_by && order_by.length > 0) body.order_by = order_by;

        if (extra._meta?.progressToken !== undefined) {
          await extra.sendNotification({ method: "notifications/progress", params: { progressToken: extra._meta.progressToken, progress: 0, total: 2, message: "Fetching URL report..." } });
        }

        let data = await client.post<UrlReportRow[]>("/reports/urls", body, undefined, extra.signal);

        if (extra._meta?.progressToken !== undefined) {
          await extra.sendNotification({ method: "notifications/progress", params: { progressToken: extra._meta.progressToken, progress: 1, total: 2, message: "Processing results..." } });
        }
        if (classification) {
          data = data.filter((row) => row.classification === classification);
        }
        const rows = slimReportRows(data);
        return toolResult({ _summary: summaryForUrlsReport(rows), rows });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
