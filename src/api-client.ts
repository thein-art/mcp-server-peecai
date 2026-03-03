import type { ApiResponse } from "./types.js";

const BASE_URL = "https://api.peec.ai/customer/v1";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ERROR_LENGTH = 500;

/**
 * HTTP client for the Peec.ai Customer API.
 * Handles authentication, query parameters, timeouts, and error formatting.
 */
export class PeecApiClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /** GET request that unwraps the `{ data: T }` envelope. Use for list/paginated endpoints. */
  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const response = await this.request(path, { method: "GET", params });
    const json = await response.json() as ApiResponse<T>;
    return json.data;
  }

  /** GET request that returns the response body directly. Use for endpoints without a `data` envelope (e.g. chat content). */
  async getRaw<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const response = await this.request(path, { method: "GET", params });
    return response.json() as Promise<T>;
  }

  /** POST request that unwraps the `{ data: T }` envelope. Use for analytics report endpoints. */
  async post<T>(path: string, body: Record<string, unknown>, params?: Record<string, string | undefined>): Promise<T> {
    const response = await this.request(path, {
      method: "POST",
      params,
      body: JSON.stringify(body),
      extraHeaders: { "Content-Type": "application/json" },
    });
    const json = await response.json() as ApiResponse<T>;
    return json.data;
  }

  private async request(
    path: string,
    options: {
      method: "GET" | "POST";
      params?: Record<string, string | number | undefined>;
      body?: string;
      extraHeaders?: Record<string, string>;
    },
  ): Promise<Response> {
    const url = new URL(`${BASE_URL}${path}`);
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const response = await fetch(url.toString(), {
      method: options.method,
      headers: {
        "X-API-Key": this.apiKey,
        "Accept": "application/json",
        ...options.extraHeaders,
      },
      body: options.body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(await this.formatError(response));
    }

    return response;
  }

  /**
   * Builds a human-readable error message from a failed API response.
   * Tries to extract a structured message from JSON; falls back to raw text.
   * Truncates to MAX_ERROR_LENGTH to prevent leaking large error payloads.
   */
  private async formatError(response: Response): Promise<string> {
    const text = await response.text();
    let message: string;
    try {
      const json = JSON.parse(text);
      message = json.message || json.error || text;
    } catch {
      message = text;
    }
    if (typeof message !== "string") {
      message = JSON.stringify(message);
    }
    if (message.length > MAX_ERROR_LENGTH) {
      message = message.slice(0, MAX_ERROR_LENGTH) + "…";
    }
    return `Peec API error ${response.status}: ${message}`;
  }
}
