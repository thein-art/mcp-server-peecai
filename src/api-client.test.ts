import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PeecApiClient } from "./api-client.js";

function mockFetch(response: {
  ok?: boolean;
  status?: number;
  json?: unknown;
  text?: string;
}) {
  const fn = vi.fn<() => Promise<Response>>().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: () => Promise.resolve(response.json),
    text: () => Promise.resolve(response.text ?? JSON.stringify(response.json)),
  } as Response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("PeecApiClient", () => {
  let client: PeecApiClient;

  beforeEach(() => {
    client = new PeecApiClient("test-api-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("get()", () => {
    it("unwraps {data: ...} from response", async () => {
      const items = [{ id: "1", name: "Test" }];
      mockFetch({ json: { data: items } });

      const result = await client.get("/projects");
      expect(result).toEqual(items);
    });

    it("sends API key header", async () => {
      const fetchMock = mockFetch({ json: { data: [] } });

      await client.get("/projects");

      expect(fetchMock).toHaveBeenCalledOnce();
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["X-API-Key"]).toBe("test-api-key");
    });

    it("appends query params and skips undefined values", async () => {
      const fetchMock = mockFetch({ json: { data: [] } });

      await client.get("/items", { limit: 10, offset: undefined, project_id: "p1" });

      const url = fetchMock.mock.calls[0]![0] as string;
      expect(url).toContain("limit=10");
      expect(url).toContain("project_id=p1");
      expect(url).not.toContain("offset");
    });

    it("throws on non-ok response with JSON error body", async () => {
      mockFetch({
        ok: false,
        status: 403,
        text: JSON.stringify({ message: "Forbidden" }),
      });

      await expect(client.get("/secret")).rejects.toThrow("Peec AI API error 403: Forbidden");
    });

    it("throws on non-ok response with plain text body", async () => {
      mockFetch({
        ok: false,
        status: 500,
        text: "Internal Server Error",
      });

      await expect(client.get("/broken")).rejects.toThrow(
        "Peec AI API error 500: Internal Server Error"
      );
    });

    it("truncates long error bodies", async () => {
      const longBody = "x".repeat(1000);
      mockFetch({
        ok: false,
        status: 500,
        text: longBody,
      });

      const err = client.get("/broken");
      await expect(err).rejects.toThrow("Peec AI API error 500:");
      await expect(err).rejects.toThrow("…");
    });

    it("truncates long JSON error messages", async () => {
      const longMessage = "m".repeat(1000);
      mockFetch({
        ok: false,
        status: 400,
        text: JSON.stringify({ message: longMessage }),
      });

      const err = client.get("/broken");
      await expect(err).rejects.toThrow("Peec AI API error 400:");
      await expect(err).rejects.toThrow("…");
    });

    it("handles non-string message field in JSON error", async () => {
      mockFetch({
        ok: false,
        status: 422,
        text: JSON.stringify({ message: { details: "invalid field" } }),
      });

      await expect(client.get("/broken")).rejects.toThrow("Peec AI API error 422:");
    });
  });

  describe("getRaw()", () => {
    it("returns response directly without unwrapping", async () => {
      const rawData = { id: "chat-1", messages: ["hello"] };
      mockFetch({ json: rawData });

      const result = await client.getRaw("/chats/1");
      expect(result).toEqual(rawData);
    });
  });

  describe("post()", () => {
    it("unwraps {data: ...} and sends JSON body", async () => {
      const report = [{ brand: "A", visibility: 0.8 }];
      const fetchMock = mockFetch({ json: { data: report } });

      const result = await client.post("/reports/brands", {
        dimensions: ["model_id"],
      });

      expect(result).toEqual(report);
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({ dimensions: ["model_id"] });
    });
  });
});
