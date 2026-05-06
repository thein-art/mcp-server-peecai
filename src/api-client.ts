import type { ApiResponse } from "./types.js";

const BASE_URL = "https://api.peec.ai/customer/v1";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ERROR_LENGTH = 500;

/** Callback for structured logging of API events. */
export type ApiLogCallback = (level: "error" | "warning" | "info", data: Record<string, unknown>) => void;

/**
 * HTTP client for the Peec AI Customer API.
 * Handles authentication, query parameters, timeouts, and error formatting.
 */
export class PeecApiClient {
  private readonly apiKey: string;
  private readonly onLog?: ApiLogCallback;

  constructor(apiKey: string, onLog?: ApiLogCallback) {
    this.apiKey = apiKey;
    this.onLog = onLog;
  }

  /** GET request that unwraps the `{ data: T }` envelope. Use for list/paginated endpoints. */
  async get<T>(path: string, params?: Record<string, string | number | undefined>, signal?: AbortSignal): Promise<T> {
    const response = await this.request(path, { method: "GET", params, signal });
    const json = await response.json() as ApiResponse<T>;
    return json.data;
  }

  /** GET request that returns the response body directly. Use for endpoints without a `data` envelope (e.g. chat content). */
  async getRaw<T>(path: string, params?: Record<string, string | number | undefined>, signal?: AbortSignal): Promise<T> {
    const response = await this.request(path, { method: "GET", params, signal });
    return response.json() as Promise<T>;
  }

  /** POST request that unwraps the `{ data: T }` envelope. Use for analytics report endpoints. */
  async post<T>(path: string, body: Record<string, unknown>, params?: Record<string, string | undefined>, signal?: AbortSignal): Promise<T> {
    const response = await this.request(path, {
      method: "POST",
      params,
      body: JSON.stringify(body),
      extraHeaders: { "Content-Type": "application/json" },
      signal,
    });
    const json = await response.json() as ApiResponse<T>;
    return json.data;
  }

  /** POST request that returns the response body directly. Use for create endpoints without `data` envelope. */
  async postRaw<T>(path: string, body: Record<string, unknown>, params?: Record<string, string | undefined>, signal?: AbortSignal): Promise<T> {
    const response = await this.request(path, {
      method: "POST",
      params,
      body: JSON.stringify(body),
      extraHeaders: { "Content-Type": "application/json" },
      signal,
    });
    return response.json() as Promise<T>;
  }

  /** PATCH request that unwraps the `{ data: T }` envelope. Use for update endpoints. */
  async patch<T>(path: string, body: Record<string, unknown>, params?: Record<string, string | undefined>, signal?: AbortSignal): Promise<T> {
    const response = await this.request(path, {
      method: "PATCH",
      params,
      body: JSON.stringify(body),
      extraHeaders: { "Content-Type": "application/json" },
      signal,
    });
    const json = await response.json() as ApiResponse<T>;
    return json.data;
  }

  /** PATCH request that returns the response body directly. Use for update endpoints without `data` envelope. */
  async patchRaw<T>(path: string, body: Record<string, unknown>, params?: Record<string, string | undefined>, signal?: AbortSignal): Promise<T> {
    const response = await this.request(path, {
      method: "PATCH",
      params,
      body: JSON.stringify(body),
      extraHeaders: { "Content-Type": "application/json" },
      signal,
    });
    return response.json() as Promise<T>;
  }

  /** PUT request that returns the response body directly. Use for full-replace endpoints without `data` envelope. */
  async putRaw<T>(path: string, body: Record<string, unknown>, params?: Record<string, string | undefined>, signal?: AbortSignal): Promise<T> {
    const response = await this.request(path, {
      method: "PUT",
      params,
      body: JSON.stringify(body),
      extraHeaders: { "Content-Type": "application/json" },
      signal,
    });
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  /** DELETE request. Returns void — the API returns an empty body on success. */
  async delete(path: string, params?: Record<string, string | undefined>, signal?: AbortSignal): Promise<void> {
    await this.request(path, { method: "DELETE", params, signal });
  }

  private async request(
    path: string,
    options: {
      method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
      params?: Record<string, string | number | undefined>;
      body?: string;
      extraHeaders?: Record<string, string>;
      signal?: AbortSignal;
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

    // Combine caller signal (MCP cancellation) with timeout signal
    const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeoutSignal])
      : timeoutSignal;

    const response = await fetch(url.toString(), {
      method: options.method,
      headers: {
        "X-API-Key": this.apiKey,
        "Accept": "application/json",
        ...options.extraHeaders,
      },
      body: options.body,
      signal,
    });

    if (!response.ok) {
      const errorMessage = await this.formatError(response);
      this.onLog?.("error", { endpoint: path, method: options.method, status: response.status, message: errorMessage });
      throw new Error(errorMessage);
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
    return `Peec AI API error ${response.status}: ${message}`;
  }
}
