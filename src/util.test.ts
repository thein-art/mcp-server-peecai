import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { requireProjectId, validateDateRange, dateSchema, dimensionsSchema, slimReportRows, toolResult, toolError } from "./util.js";

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

describe("slimReportRows", () => {
  it("flattens brand and removes raw count fields from BrandReportRow", () => {
    const input = [{
      brand: { id: "br_1", name: "Bronchicum" },
      prompt: { id: "pr_1" },
      visibility: 0.75,
      visibility_count: 3,
      visibility_total: 4,
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
      usage_rate: 0.3,
      citation_avg: 1.5,
    }];
    const result = slimReportRows(input);
    expect(result).toEqual([{
      domain: "example.com",
      usage_rate: 0.3,
      citation_avg: 1.5,
    }]);
  });

  it("keeps non-null classification", () => {
    const input = [{
      domain: "example.com",
      classification: "EDITORIAL",
      usage_rate: 0.3,
      citation_avg: 1.5,
    }];
    const result = slimReportRows(input);
    expect(result[0].classification).toBe("EDITORIAL");
  });

  it("flattens dimensions on DomainReportRow", () => {
    const input = [{
      domain: "example.com",
      classification: "EDITORIAL",
      prompt: { id: "pr_1" },
      usage_rate: 0.3,
      citation_avg: 1.5,
    }];
    const result = slimReportRows(input);
    expect(result[0].prompt_id).toBe("pr_1");
    expect(result[0]).not.toHaveProperty("prompt");
  });

  it("drops null urlNormalized and title from UrlReportRow", () => {
    const input = [{
      url: "https://example.com/page",
      urlNormalized: null,
      classification: "ARTICLE",
      title: null,
      usage_count: 5,
      citation_count: 10,
      citation_avg: 2.0,
    }];
    const result = slimReportRows(input);
    expect(result).toEqual([{
      url: "https://example.com/page",
      classification: "ARTICLE",
      usage_count: 5,
      citation_count: 10,
      citation_avg: 2.0,
    }]);
  });

  it("keeps non-null urlNormalized and title", () => {
    const input = [{
      url: "https://example.com/page",
      urlNormalized: "example.com/page",
      classification: "ARTICLE",
      title: "My Article",
      usage_count: 5,
      citation_count: 10,
      citation_avg: 2.0,
    }];
    const result = slimReportRows(input);
    expect(result[0].urlNormalized).toBe("example.com/page");
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
    }];
    const result = slimReportRows(input);
    expect(result).toEqual([{
      brand_id: "br_1",
      brand_name: "Test",
      visibility: 0.5,
    }]);
  });
});

describe("toolResult", () => {
  it("returns formatted MCP content with compact JSON", () => {
    const result = toolResult({ id: "1", name: "Test" });
    expect(result).toEqual({
      content: [{ type: "text", text: '{"id":"1","name":"Test"}' }],
    });
  });

  it("handles arrays", () => {
    const result = toolResult([1, 2, 3]);
    expect(result.content[0].text).toBe("[1,2,3]");
  });

  it("handles null", () => {
    const result = toolResult(null);
    expect(result.content[0].text).toBe("null");
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

  it("returns 'Unknown error' for non-Error values", () => {
    const result = toolError("string error");
    expect(result).toEqual({
      content: [{ type: "text", text: "Unknown error" }],
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
