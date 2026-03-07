import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockRunPreflightChecks } = vi.hoisted(() => ({
  mockRunPreflightChecks: vi.fn(),
}));

vi.mock("../src/preflight.js", () => ({
  runPreflightChecks: mockRunPreflightChecks,
}));

vi.mock("../src/adapters/git.js", () => ({
  createGitAdapter: vi.fn(() => ({})),
}));

vi.mock("../src/adapters/github.js", () => ({
  createGitHubAdapter: vi.fn(() => ({
    getIssue: vi.fn(async () => ({
      number: 42,
      title: "Issue 42",
      body: "Test",
      labels: [],
      author: "testuser",
    })),
    getAuthenticatedUser: vi.fn(async () => "testuser"),
  })),
}));

vi.mock("../src/workflow/states.js", () => ({
  createStateHandlers: vi.fn(() => ({
    init: vi.fn(async (ctx: any) => ({
      nextState: "done",
      ctx: { ...ctx, state: "done" },
    })),
  })),
}));

vi.mock("../src/workflow/engine.js", () => ({
  runWorkflow: vi.fn(async (ctx: any) => ({ ...ctx, state: "done" })),
}));

import { createCli } from "../src/cli.js";

describe("run command preflight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunPreflightChecks.mockResolvedValue(undefined);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs preflight checks before workflow execution", async () => {
    const cli = createCli();

    await cli.parseAsync([
      "node",
      "aidev",
      "run",
      "--issue",
      "42",
      "--repo",
      "owner/repo",
      "--cwd",
      "/tmp/repo",
      "-y",
    ]);

    expect(mockRunPreflightChecks).toHaveBeenCalledWith("/tmp/repo");
  });
});
