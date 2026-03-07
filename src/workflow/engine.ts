import type { RunContext, RunState, StateHandler } from "../types.js";
import type { Logger } from "../util/logger.js";

export type StateHandlerMap = Partial<Record<RunState, StateHandler>>;

export interface Persistence {
  save(ctx: RunContext): Promise<void>;
  load(runId: string): Promise<RunContext | null>;
  findLatestByIssue?(issueNumber: number): Promise<RunContext | null>;
  findLatestByPr?(prNumber: number): Promise<RunContext | null>;
}

export interface WorkflowOptions {
  onTransition?: (from: RunState, to: RunState) => void;
  onComplete?: (ctx: RunContext) => Promise<void>;
  logger?: Logger;
}

const terminalStates: ReadonlySet<RunState> = new Set([
  "done",
  "failed",
  "manual_handoff",
]);

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<{ result: T; timedOut: false } | { timedOut: true }> {
  return Promise.race([
    promise.then((result) => ({ result, timedOut: false as const })),
    new Promise<{ timedOut: true }>((resolve) =>
      setTimeout(() => resolve({ timedOut: true }), timeoutMs),
    ),
  ]);
}

export async function runWorkflow(
  initial: RunContext,
  handlers: StateHandlerMap,
  persistence: Persistence,
  options?: WorkflowOptions,
): Promise<RunContext> {
  let ctx = initial;
  const logger = options?.logger;
  const workflowStart = performance.now();

  while (!terminalStates.has(ctx.state)) {
    const handler = handlers[ctx.state];
    if (!handler) {
      throw new Error(`No handler for state: ${ctx.state}`);
    }

    const from = ctx.state;
    const handlerStart = performance.now();
    const timeoutMs = ctx.stateTimeouts?.[from];

    if (timeoutMs != null) {
      const outcome = await withTimeout(handler(ctx), timeoutMs);
      if (outcome.timedOut) {
        const elapsedMs = Math.round(performance.now() - handlerStart);
        logger?.warn(`State ${from} timed out after ${timeoutMs}ms`, {
          state: from,
          timeoutMs,
          elapsedMs,
        });

        const nextState: RunState = "manual_handoff";
        options?.onTransition?.(from, nextState);

        ctx = {
          ...ctx,
          state: nextState,
          handoffReason: "timeout",
          handoffContext: `${from} timed out after ${timeoutMs}ms`,
          _timedOutState: from,
        };
        await persistence.save(ctx);
        break;
      }

      const { nextState, ctx: nextCtx } = outcome.result;
      const elapsedMs = Math.round(performance.now() - handlerStart);
      logger?.info(`State ${from} completed`, { state: from, elapsedMs });
      options?.onTransition?.(from, nextState);
      ctx = { ...nextCtx, state: nextState };
      await persistence.save(ctx);
    } else {
      const { nextState, ctx: nextCtx } = await handler(ctx);
      const elapsedMs = Math.round(performance.now() - handlerStart);

      logger?.info(`State ${from} completed`, { state: from, elapsedMs });
      options?.onTransition?.(from, nextState);

      ctx = { ...nextCtx, state: nextState };
      await persistence.save(ctx);
    }
  }

  const totalElapsedMs = Math.round(performance.now() - workflowStart);
  logger?.info("Workflow completed", { totalElapsedMs, finalState: ctx.state });

  try {
    await options?.onComplete?.(ctx);
  } catch {
    logger?.warn("onComplete callback failed");
  }

  return ctx;
}
