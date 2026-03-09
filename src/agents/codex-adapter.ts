import { execa } from "execa";
import type { SDKMessage } from "@anthropic-ai/claude-code";

export interface CodexQueryOptions {
  cwd: string;
}

/**
 * Runs `codex exec "<prompt>" --full-auto` in the given cwd and returns an
 * AsyncIterable of SDKMessage-compatible objects. The cwd must be a git repo.
 *
 * Codex returns plain text output, so we wrap it in a single synthetic
 * "result/success" message that streamAgentResponse can consume.
 */
export async function* queryCodex(
  prompt: string,
  options: CodexQueryOptions
): AsyncIterable<SDKMessage> {
  let stdout = "";
  let stderr = "";
  let exitCode = 0;

  try {
    const result = await execa("codex", ["exec", prompt, "--full-auto"], {
      cwd: options.cwd,
      reject: false,
      timeout: 10 * 60 * 1000, // 10 min
    });
    stdout = result.stdout ?? "";
    stderr = result.stderr ?? "";
    exitCode = result.exitCode ?? 0;
  } catch (err) {
    stderr = String(err);
    exitCode = 1;
  }

  const output = stdout || stderr || "";
  const succeeded = exitCode === 0;

  // Yield a synthetic SDKMessage that is compatible with streamAgentResponse.
  // Claude SDK's "result" message shape: { type, subtype, result, session_id, ... }
  yield {
    type: "result",
    subtype: succeeded ? "success" : "error_during_execution",
    result: output,
    session_id: "codex",
    total_cost_usd: 0,
    duration_ms: 0,
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
    num_turns: 1,
    is_error: !succeeded,
  } as unknown as SDKMessage;
}
