import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExeca, mockFindClaudeExecutable } = vi.hoisted(() => ({
  mockExeca: vi.fn(),
  mockFindClaudeExecutable: vi.fn(),
}));

vi.mock("execa", () => ({
  execa: mockExeca,
}));

vi.mock("../src/agents/shared.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/agents/shared.js")>();
  return {
    ...actual,
    findClaudeExecutable: mockFindClaudeExecutable,
  };
});

import { runPreflightChecks } from "../src/preflight.js";

describe("runPreflightChecks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindClaudeExecutable.mockReturnValue("/usr/bin/claude");
    mockExeca.mockResolvedValue({ stdout: "ok" });
  });

  it("fails fast when the Claude executable is missing", async () => {
    mockFindClaudeExecutable.mockReturnValue(undefined);

    await expect(runPreflightChecks()).rejects.toThrow(/Claude Code executable/i);
  });

  it("reports missing git or gh before workflow execution", async () => {
    mockExeca.mockImplementation(async (command: string) => {
      if (command === "gh") {
        throw new Error("gh missing");
      }
      return { stdout: "ok" };
    });

    await expect(runPreflightChecks()).rejects.toThrow(/GitHub CLI/i);
  });
});
