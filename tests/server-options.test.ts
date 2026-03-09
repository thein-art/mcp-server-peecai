import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("McpServer options", () => {
  it("sets instructions for LLM guidance", () => {
    const server = new McpServer(
      { name: "test", version: "0.0.1" },
      { instructions: "Test instructions for the server." },
    );

    const instructions = (server as any).server._instructions;
    expect(instructions).toBe("Test instructions for the server.");
  });
});
