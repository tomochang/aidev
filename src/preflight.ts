import { execa } from "execa";
import { findClaudeExecutable } from "./agents/shared.js";

async function requireCommand(
  command: string,
  description: string
): Promise<void> {
  try {
    await execa(command, ["--version"]);
  } catch {
    throw new Error(`${description} is not available: ${command}`);
  }
}

export async function runPreflightChecks(): Promise<void> {
  const claudeExecutable = findClaudeExecutable();
  if (!claudeExecutable) {
    throw new Error(
      "Claude Code executable is not available. Install Claude Code or set CLAUDE_EXECUTABLE."
    );
  }

  await requireCommand("git", "Git");
  await requireCommand("gh", "GitHub CLI");
}
