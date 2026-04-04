import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { requireProjectId, validateDateRange, dateSchema, dimensionsSchema, filterSchema, mergeFilters, slimReportRows, summaryForList, summaryForBrandsReport, summaryForDomainsReport, summaryForUrlsReport, toolResult, toolError } from "./util.js";

describe("requireProjectId", () => {
  const VALID_ID = "or_575e262d-2fe5-4ac5-9f0a-0c7553558be2";
  const VALID_ID_2 = "or_0179a135-811f-4554-b23b-3088d01620b0";
  const originalEnv = process.env.PEECAI_PROJECT_ID;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.PEECAI_PROJECT_ID = originalEnv;
    } else {
      delete process.env.PEECAI_PROJECT_ID;
    }
  });

  it("returns explicit param when provided", () => {
    expect(requireProjectId(VALID_ID)).toBe(VALID_ID);
  });

  it("falls back to env variable when no explicit param", () => {
    process.env.PEECAI_PROJECT_ID = VALID_ID_2;
    expect(requireProjectId()).toBe(VALID_ID_2);
  });

  it("prefers explicit param over env variable", () => {
    process.env.PEECAI_PROJECT_ID = VALID_ID_2;
    expect(requireProjectId(VALID_ID)).toBe(VALID_ID);
  });

  it("throws with actionable message when both are missing", () => {
    delete process.env.PEECAI_PROJECT_ID;
    expect(() => requireProjectId()).toThrow("Missing project_id");
    expect(() => requireProjectId()).toThrow("list_projects");
  });

  it("throws when explicit is empty string and env is unset", () => {
    delete process.env.PEECAI_PROJECT_ID;
    expect(() => requireProjectId("")).toThrow("Missing project_id");
  });

  it("throws on invalid format with helpful message", () => {
    expect(() => requireProjectId("bad-id")).toThrow("Invalid project_id format");
    expect(() => requireProjectId("bad-id")).toThrow("list_projects");
  });

  it("throws on env variable with invalid format", () => {
    process.env.PEECAI_PROJECT_ID = "${PEECAI_PROJECT_ID}";
    expect(() => requireProjectId()).toThrow("Invalid project_id format");
  });

  it("throws on UUID without or_ prefix", () => {
    expect(() => requireProjectId("575e262d-2fe5-4ac5-9f0a-0c7553558be2")).toThrow("Invalid project_id format");
  });
});

describe("validateDateRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-02T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("passes through a valid date range", () => {
    const result = validateDateRange("2026-01-01", "2026-02-28");
    expect(result).toEqual({ start_date: "2026-01-01", end_date: "2026-02-28" });
  });

  it("returns undefined fields when no dates provided", () => {
    const result = validateDateRange();
    expect(result).toEqual({ start_date: undefined, end_date: undefined });
  });

  it("handles start_date only", () => {
    const result = validateDateRange("2026-01-15");
    expect(result).toEqual({ start_date: "2026-01-15", end_date: undefined });
  });

  it("handles end_date only", () => {
    const result = validateDateRange(undefined, "2026-02-15");
    expect(result).toEqual({ start_date: undefined, end_date: "2026-02-15" });
  });

  it("caps future end_date to today", () => {
    const result = validateDateRange("2026-01-01", "2026-12-31");
    expect(result).toEqual({ start_date: "2026-01-01", end_date: "2026-03-02" });
  });

  it("throws when start_date is after end_date", () => {
    expect(() => validateDateRange("2026-03-01", "2026-02-01")).toThrow(
      "Invalid date range"
    );
  });

  it("throws when start_date is after today (capped end_date)", () => {
    // end_date in the future gets capped to 2026-03-02, but start is 2026-03-15
    expect(() => validateDateRange("2026-03-15", "2026-04-01")).toThrow(
      "Invalid date range"
    );
  });

  it("allows same start and end date", () => {
    const result = validateDateRange("2026-03-02", "2026-03-02");
    expect(result).toEqual({ start_date: "2026-03-02", end_date: "2026-03-02" });
  });
});

describe("dateSchema", () => {
  it("accepts valid YYYY-MM-DD format", () => {
    expect(dateSchema.parse("2026-01-15")).toBe("2026-01-15");
  });

  it("rejects DD.MM.YYYY format", () => {
    expect(() => dateSchema.parse("15.01.2026")).toThrow();
  });

  it("rejects empty string", () => {
    expect(() => dateSchema.parse("")).toThrow();
  });

  it("rejects partial date", () => {
    expect(() => dateSchema.parse("2026-01")).toThrow();
  });

  it("rejects date with time", () => {
    expect(() => dateSchema.parse("2026-01-15T00:00:00")).toThrow();
  });

  it("rejects invalid calendar date like month 13", () => {
    expect(() => dateSchema.parse("2026-13-01")).toThrow();
  });

  it("rejects invalid calendar date like day 32", () => {
    expect(() => dateSchema.parse("2026-01-32")).toThrow();
  });

  it("rejects Feb 30", () => {
    expect(() => dateSchema.parse("2026-02-30")).toThrow();
  });
});

describe("dimensionsSchema", () => {
  it("accepts valid dimension values", () => {
    const result = dimensionsSchema.parse(["prompt_id", "model_id"]);
    expect(result).toEqual(["prompt_id", "model_id"]);
  });

  it("accepts all four dimensions", () => {
    const result = dimensionsSchema.parse(["prompt_id", "model_id", "tag_id", "topic_id"]);
    expect(result).toHaveLength(4);
  });

  it("accepts empty array", () => {
    expect(dimensionsSchema.parse([])).toEqual([]);
  });

  it("rejects invalid dimension values", () => {
    expect(() => dimensionsSchema.parse(["invalid_dim"])).toThrow();
  });
});

describe("filterSchema", () => {
  const schema = filterSchema(["model_id", "brand_id", "prompt_id"]);

  it("accepts valid filters", () => {
    const result = schema.parse([
      { field: "model_id", operator: "in", values: ["m1", "m2"] },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].field).toBe("model_id");
  });

  it("accepts not_in operator", () => {
    const result = schema.parse([
      { field: "brand_id", operator: "not_in", values: ["b1"] },
    ]);
    expect(result[0].operator).toBe("not_in");
  });

  it("accepts multiple filters", () => {
    const result = schema.parse([
      { field: "model_id", operator: "in", values: ["m1"] },
      { field: "prompt_id", operator: "not_in", values: ["p1", "p2"] },
    ]);
    expect(result).toHaveLength(2);
  });

  it("rejects unknown field names", () => {
    expect(() => schema.parse([
      { field: "unknown_field", operator: "in", values: ["x"] },
    ])).toThrow();
  });

  it("rejects invalid operator", () => {
    expect(() => schema.parse([
      { field: "model_id", operator: "equals", values: ["x"] },
    ])).toThrow();
  });

  it("rejects empty values array", () => {
    expect(() => schema.parse([
      { field: "model_id", operator: "in", values: [] },
    ])).toThrow();
  });

  it("accepts empty filters array", () => {
    expect(schema.parse([])).toEqual([]);
  });
});

describe("mergeFilters", () => {
  it("returns undefined when no filters and no shortcuts", () => {
    expect(mergeFilters(undefined)).toBeUndefined();
  });

  it("returns undefined when shortcuts have no values", () => {
    expect(mergeFilters(undefined, { field: "brand_id", value: undefined })).toBeUndefined();
  });

  it("creates filter from shortcut", () => {
    const result = mergeFilters(undefined, { field: "brand_id", value: "br_1" });
    expect(result).toEqual([{ field: "brand_id", operator: "in", values: ["br_1"] }]);
  });

  it("merges shortcut with existing filters", () => {
    const existing = [{ field: "model_id", operator: "in" as const, values: ["m1"] }];
    const result = mergeFilters(existing, { field: "brand_id", value: "br_1" });
    expect(result).toHaveLength(2);
    expect(result![0].field).toBe("model_id");
    expect(result![1].field).toBe("brand_id");
  });

  it("passes through existing filters when no shortcuts", () => {
    const existing = [{ field: "model_id", operator: "in" as const, values: ["m1"] }];
    const result = mergeFilters(existing);
    expect(result).toEqual(existing);
  });

  it("skips shortcut when field already exists in filters", () => {
    const existing = [{ field: "brand_id", operator: "not_in" as const, values: ["b1"] }];
    const result = mergeFilters(existing, { field: "brand_id", value: "b2" });
    expect(result).toHaveLength(1);
    expect(result![0].operator).toBe("not_in");
  });
});

describe("slimReportRows", () => {
  it("flattens brand and removes raw count fields from BrandReportRow", () => {
    const input = [{
      brand: { id: "br_1", name: "Bronchicum" },
      prompt: { id: "pr_1" },
      visibility: 0.75,
      visibility_count: 3,
      visibility_total: 4,
      share_of_voice: 0.45,
      mention_count: 12,
      sentiment: 62,
      sentiment_sum: 186,
      sentiment_count: 3,
      position: 2.5,
      position_sum: 5,
      position_count: 2,
    }];
    const result = slimReportRows(input);
    expect(result).toEqual([{
      brand_id: "br_1",
      brand_name: "Bronchicum",
      prompt_id: "pr_1",
      visibility: 0.75,
      share_of_voice: 0.45,
      mention_count: 12,
      sentiment: 62,
      position: 2.5,
    }]);
  });

  it("flattens all dimension refs", () => {
    const input = [{
      brand: { id: "br_1", name: "Test" },
      prompt: { id: "pr_1" },
      model: { id: "mo_1" },
      tag: { id: "ta_1" },
      topic: { id: "to_1" },
      visibility: 0.5,
      visibility_count: 1,
      visibility_total: 2,
      share_of_voice: 0.3,
      mention_count: 5,
    }];
    const result = slimReportRows(input);
    expect(result[0]).toMatchObject({
      brand_id: "br_1",
      prompt_id: "pr_1",
      model_id: "mo_1",
      tag_id: "ta_1",
      topic_id: "to_1",
    });
  });

  it("drops null classification from DomainReportRow", () => {
    const input = [{
      domain: "example.com",
      classification: null,
      retrieved_percentage: 0.3,
      retrieval_rate: 0.3,
      citation_rate: 1.5,
    }];
    const result = slimReportRows(input);
    expect(result).toEqual([{
      domain: "example.com",
      retrieved_percentage: 0.3,
      retrieval_rate: 0.3,
      citation_rate: 1.5,
    }]);
  });

  it("keeps non-null classification", () => {
    const input = [{
      domain: "example.com",
      classification: "EDITORIAL",
      retrieved_percentage: 0.3,
      retrieval_rate: 0.3,
      citation_rate: 1.5,
    }];
    const result = slimReportRows(input);
    expect(result[0].classification).toBe("EDITORIAL");
  });

  it("flattens dimensions on DomainReportRow", () => {
    const input = [{
      domain: "example.com",
      classification: "EDITORIAL",
      prompt: { id: "pr_1" },
      retrieved_percentage: 0.3,
      retrieval_rate: 0.3,
      citation_rate: 1.5,
    }];
    const result = slimReportRows(input);
    expect(result[0].prompt_id).toBe("pr_1");
    expect(result[0]).not.toHaveProperty("prompt");
  });

  it("drops null title from UrlReportRow", () => {
    const input = [{
      url: "https://example.com/page",
      classification: "ARTICLE",
      title: null,
      citation_count: 10,
      retrievals: 5,
      citation_rate: 2.0,
    }];
    const result = slimReportRows(input);
    expect(result).toEqual([{
      url: "https://example.com/page",
      classification: "ARTICLE",
      citation_count: 10,
      retrievals: 5,
      citation_rate: 2.0,
    }]);
  });

  it("keeps non-null title", () => {
    const input = [{
      url: "https://example.com/page",
      classification: "ARTICLE",
      title: "My Article",
      citation_count: 10,
      retrievals: 5,
      citation_rate: 2.0,
    }];
    const result = slimReportRows(input);
    expect(result[0].title).toBe("My Article");
  });

  it("returns empty array for empty input", () => {
    expect(slimReportRows([])).toEqual([]);
  });

  it("handles row without optional dimension fields", () => {
    const input = [{
      brand: { id: "br_1", name: "Test" },
      visibility: 0.5,
      visibility_count: 1,
      visibility_total: 2,
      share_of_voice: 0.2,
      mention_count: 3,
    }];
    const result = slimReportRows(input);
    expect(result).toEqual([{
      brand_id: "br_1",
      brand_name: "Test",
      visibility: 0.5,
      share_of_voice: 0.2,
      mention_count: 3,
    }]);
  });
});

describe("summaryForList", () => {
  it("returns count and entity name", () => {
    expect(summaryForList("projects", [1, 2, 3])).toBe("3 projects returned");
  });

  it("handles empty array", () => {
    expect(summaryForList("brands", [])).toBe("0 brands returned");
  });

  it("handles single item with singular form", () => {
    expect(summaryForList("chats", [{}])).toBe("1 chat returned");
  });
});

describe("summaryForBrandsReport", () => {
  it("returns summary with top brand and SoV", () => {
    const rows = [
      { brand_name: "Alpha", visibility: 0.82, share_of_voice: 0.45 },
      { brand_name: "Beta", visibility: 0.45, share_of_voice: 0.25 },
    ];
    expect(summaryForBrandsReport(rows)).toBe("2 brand rows, top 'Alpha' 82% visibility, 45% SoV");
  });

  it("handles empty array", () => {
    expect(summaryForBrandsReport([])).toBe("0 brand rows returned");
  });

  it("rounds visibility percentage", () => {
    const rows = [{ brand_name: "X", visibility: 0.666, share_of_voice: 0.333 }];
    expect(summaryForBrandsReport(rows)).toBe("1 brand rows, top 'X' 67% visibility, 33% SoV");
  });

  it("omits SoV when not present", () => {
    const rows = [{ brand_name: "X", visibility: 0.5 }];
    expect(summaryForBrandsReport(rows)).toBe("1 brand rows, top 'X' 50% visibility");
  });
});

describe("summaryForDomainsReport", () => {
  it("returns summary with top domain", () => {
    const rows = [
      { domain: "example.com", retrieval_rate: 0.45 },
      { domain: "test.org", retrieval_rate: 0.12 },
    ];
    expect(summaryForDomainsReport(rows)).toBe("2 domain rows, top 'example.com' 45% retrieval");
  });

  it("handles empty array", () => {
    expect(summaryForDomainsReport([])).toBe("0 domain rows returned");
  });

  it("handles zero retrieval_rate", () => {
    const rows = [{ domain: "example.com", retrieval_rate: 0 }];
    expect(summaryForDomainsReport(rows)).toBe("1 domain rows, top 'example.com' 0% retrieval");
  });
});

describe("summaryForUrlsReport", () => {
  it("returns summary with top URL", () => {
    const rows = [
      { url: "https://example.com/a", citation_count: 15 },
      { url: "https://example.com/b", citation_count: 5 },
    ];
    expect(summaryForUrlsReport(rows)).toBe("2 URL rows, top 'https://example.com/a' 15 citations");
  });

  it("handles empty array", () => {
    expect(summaryForUrlsReport([])).toBe("0 URL rows returned");
  });
});

describe("toolResult", () => {
  it("returns formatted MCP content with compact JSON", () => {
    const result = toolResult({ id: "1", name: "Test" });
    expect(result).toEqual({
      content: [{ type: "text", text: '{"id":"1","name":"Test"}' }],
      structuredContent: { id: "1", name: "Test" },
    });
  });

  it("includes structuredContent alongside content", () => {
    const data = { _summary: "2 items", items: [1, 2] };
    const result = toolResult(data);
    expect(result.structuredContent).toEqual(data);
    expect(result.content[0].text).toBe(JSON.stringify(data));
  });
});

describe("toolError", () => {
  it("extracts message from Error instances", () => {
    const result = toolError(new Error("Something went wrong"));
    expect(result).toEqual({
      content: [{ type: "text", text: "Something went wrong" }],
      isError: true,
    });
  });

  it("stringifies non-Error values", () => {
    const result = toolError("string error");
    expect(result).toEqual({
      content: [{ type: "text", text: "string error" }],
      isError: true,
    });
  });

  it("does not expose stack traces", () => {
    const error = new Error("API failed");
    error.stack = "Error: API failed\n    at /home/user/secret/path.ts:42:5";
    const result = toolError(error);
    expect(result.content[0].text).toBe("API failed");
    expect(result.content[0].text).not.toContain("/home");
  });
});
