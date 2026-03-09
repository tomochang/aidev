import { findClaudeExecutable } from "./shared.js";

export type Provider = "claude" | "codex";

function autoDetect(): Provider {
  const claude = findClaudeExecutable();
  return claude ? "claude" : "codex";
}

export function getProvider(): Provider {
  const envProvider = process.env.AIDEV_PROVIDER as Provider | undefined;
  if (envProvider === "claude" || envProvider === "codex") {
    return envProvider;
  }
  return autoDetect();
}
