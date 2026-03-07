import type { IssueConfig } from "./issue-config.js";

export function mergeConfigs(
  repoConfig: Partial<IssueConfig>,
  issueConfig: Partial<IssueConfig>,
  cliExplicit: Set<string>,
): Partial<IssueConfig> {
  const merged = { ...repoConfig, ...issueConfig };

  // Deep-merge stateTimeouts: issue overrides repo per-state
  if (repoConfig.stateTimeouts || issueConfig.stateTimeouts) {
    merged.stateTimeouts = {
      ...repoConfig.stateTimeouts,
      ...issueConfig.stateTimeouts,
    };
  }

  for (const key of cliExplicit) {
    delete merged[key as keyof IssueConfig];
  }

  return merged;
}
