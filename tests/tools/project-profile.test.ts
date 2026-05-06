import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";
import { registerProjectProfileTools } from "../../src/tools/project-profile.js";

function getHandler(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

const mockExtra = { signal: new AbortController().signal, _meta: {}, sendNotification: vi.fn() };
const VALID_PID = "or_00000000-0000-0000-0000-000000000001";

const SAMPLE_PROFILE = {
  occupation: "B2B SaaS",
  industry: "MarTech",
  brandPresentation: ["enterprise-grade", "AI-powered"],
  productsAndServices: ["Analytics platform"],
  targetMarkets: [{ marketSize: "Global" as const, location: "Worldwide" }],
  audienceDistribution: {
    simpleRecommendationSeeker: 30,
    informedShopper: 40,
    evaluativeResearcher: 30,
  },
};

afterEach(() => vi.restoreAllMocks());

function setup(allowWrites = true) {
  const client = new PeecApiClient("test-key");
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerProjectProfileTools(server, client, allowWrites);
  return { client, server };
}

describe("get_project_profile tool", () => {
  it("returns profile when set", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "getRaw").mockResolvedValue({ profile: SAMPLE_PROFILE });

    const handler = getHandler(server, "get_project_profile");
    const result = await handler({ project_id: VALID_PID }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.profile).toEqual(SAMPLE_PROFILE);
    expect(parsed._summary).toContain("Profile loaded");
  });

  it("returns null profile when not set", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "getRaw").mockResolvedValue({ profile: null });

    const handler = getHandler(server, "get_project_profile");
    const result = await handler({ project_id: VALID_PID }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.profile).toBeNull();
    expect(parsed._summary).toBe("No profile set for project");
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "getRaw").mockRejectedValue(new Error("Forbidden"));

    const handler = getHandler(server, "get_project_profile");
    const result = await handler({ project_id: VALID_PID }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Forbidden");
  });
});

describe("set_project_profile tool", () => {
  it("is not registered when allowWrites=false", () => {
    const { server } = setup(false);
    expect((server as any)._registeredTools.set_project_profile).toBeUndefined();
  });

  it("PUTs the profile and returns _summary", async () => {
    const { client, server } = setup();
    const putSpy = vi.spyOn(client, "putRaw").mockResolvedValue(undefined);

    const handler = getHandler(server, "set_project_profile");
    const result = await handler({ project_id: VALID_PID, ...SAMPLE_PROFILE }, mockExtra);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed._summary).toBe("Project profile updated");
    expect(putSpy).toHaveBeenCalledWith(
      "/project-profile",
      expect.objectContaining({
        occupation: "B2B SaaS",
        audienceDistribution: SAMPLE_PROFILE.audienceDistribution,
      }),
      { project_id: VALID_PID },
      expect.any(AbortSignal),
    );
  });

  it("rejects audienceDistribution that does not sum to 100", async () => {
    const { client, server } = setup();
    const putSpy = vi.spyOn(client, "putRaw").mockResolvedValue(undefined);

    const handler = getHandler(server, "set_project_profile");
    const result = await handler({
      project_id: VALID_PID,
      ...SAMPLE_PROFILE,
      audienceDistribution: { simpleRecommendationSeeker: 10, informedShopper: 10, evaluativeResearcher: 10 },
    }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("must sum to 100");
    expect(putSpy).not.toHaveBeenCalled();
  });

  it("returns error on API failure", async () => {
    const { client, server } = setup();
    vi.spyOn(client, "putRaw").mockRejectedValue(new Error("Forbidden"));

    const handler = getHandler(server, "set_project_profile");
    const result = await handler({ project_id: VALID_PID, ...SAMPLE_PROFILE }, mockExtra);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Forbidden");
  });
});
