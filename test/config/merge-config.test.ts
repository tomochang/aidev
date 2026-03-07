import { describe, it, expect } from "vitest";
import { mergeConfigs } from "../../src/config/merge-config.js";
import type { IssueConfig } from "../../src/config/issue-config.js";

describe("mergeConfigs", () => {
  it("returns repo config when issue config is empty", () => {
    const repo: Partial<IssueConfig> = { base: "develop", autoMerge: true };
    const issue: Partial<IssueConfig> = {};

    const result = mergeConfigs(repo, issue, new Set());

    expect(result.base).toBe("develop");
    expect(result.autoMerge).toBe(true);
  });

  it("issue config overrides repo config", () => {
    const repo: Partial<IssueConfig> = { base: "develop", maxFixAttempts: 5 };
    const issue: Partial<IssueConfig> = { base: "release/1.0" };

    const result = mergeConfigs(repo, issue, new Set());

    expect(result.base).toBe("release/1.0");
    expect(result.maxFixAttempts).toBe(5);
  });

  it("cliExplicit fields are excluded from result", () => {
    const repo: Partial<IssueConfig> = { base: "develop" };
    const issue: Partial<IssueConfig> = { autoMerge: true, dryRun: true };
    const cliExplicit = new Set(["autoMerge", "base"]);

    const result = mergeConfigs(repo, issue, cliExplicit);

    expect(result).not.toHaveProperty("autoMerge");
    expect(result).not.toHaveProperty("base");
    expect(result.dryRun).toBe(true);
  });

  it("issue skip replaces repo skip (no merge)", () => {
    const repo: Partial<IssueConfig> = { skip: ["reviewing", "watching_ci"] };
    const issue: Partial<IssueConfig> = { skip: ["documenter"] };

    const result = mergeConfigs(repo, issue, new Set());

    expect(result.skip).toEqual(["documenter"]);
  });

  it("repo skip is used when issue has no skip", () => {
    const repo: Partial<IssueConfig> = { skip: ["reviewing"] };
    const issue: Partial<IssueConfig> = {};

    const result = mergeConfigs(repo, issue, new Set());

    expect(result.skip).toEqual(["reviewing"]);
  });

  it("returns empty object when both configs are empty", () => {
    const result = mergeConfigs({}, {}, new Set());

    expect(result).toEqual({});
  });

  it("deep-merges stateTimeouts (issue overrides repo per-state)", () => {
    const repo: Partial<IssueConfig> = {
      stateTimeouts: { planning: 30000, implementing: 600000 },
    };
    const issue: Partial<IssueConfig> = {
      stateTimeouts: { planning: 60000 },
    };

    const result = mergeConfigs(repo, issue, new Set());

    expect(result.stateTimeouts).toEqual({
      planning: 60000,
      implementing: 600000,
    });
  });

  it("uses repo stateTimeouts when issue has none", () => {
    const repo: Partial<IssueConfig> = {
      stateTimeouts: { planning: 30000 },
    };
    const issue: Partial<IssueConfig> = {};

    const result = mergeConfigs(repo, issue, new Set());

    expect(result.stateTimeouts).toEqual({ planning: 30000 });
  });

  it("uses issue stateTimeouts when repo has none", () => {
    const repo: Partial<IssueConfig> = {};
    const issue: Partial<IssueConfig> = {
      stateTimeouts: { implementing: 600000 },
    };

    const result = mergeConfigs(repo, issue, new Set());

    expect(result.stateTimeouts).toEqual({ implementing: 600000 });
  });
});
