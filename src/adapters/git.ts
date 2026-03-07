import { execa } from "execa";

export interface PushResult {
  remote: string;
  forkOwner?: string;
}

export interface GitAdapter {
  createBranch(name: string, base: string, cwd: string): Promise<void>;
  addAll(cwd: string): Promise<void>;
  commit(message: string, cwd: string): Promise<void>;
  push(branch: string, cwd: string): Promise<PushResult>;
  diff(base: string, cwd: string): Promise<string>;
  currentBranch(cwd: string): Promise<string>;
  hasCommitsVsBase(branch: string, base: string, cwd: string): Promise<boolean>;
  addWorktree(path: string, baseBranch: string, cwd: string): Promise<void>;
  removeWorktree(path: string, cwd: string): Promise<void>;
}

export function createGitAdapter(): GitAdapter {
  return {
    async createBranch(name, base, cwd) {
      // `-B` creates the branch or resets it to the given base if it exists.
      await execa("git", ["checkout", "-B", name, base], { cwd });
    },

    async addAll(cwd) {
      await execa("git", ["add", "-A"], { cwd });
    },

    async commit(message, cwd) {
      await execa("git", ["commit", "-m", message], { cwd });
    },

    async push(branch, cwd) {
      try {
        await execa("git", ["push", "-u", "origin", branch], { cwd });
        return { remote: "origin" };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("Permission") && !msg.includes("denied") && !msg.includes("403")) {
          throw err;
        }
      }
      // origin push failed with permission error — find a fork remote
      const { stdout } = await execa("git", ["remote", "-v"], { cwd });
      for (const line of stdout.split("\n")) {
        const parts = line.split(/\s+/);
        if (parts.length < 2 || parts[0] === "origin") continue;
        if (!parts[1]!.includes("github.com")) continue;
        if (!line.includes("(push)")) continue;
        const remote = parts[0]!;
        const match = parts[1]!.match(/github\.com[/:]([^/]+)\//);
        if (!match) continue;
        await execa("git", ["push", "-u", remote, branch], { cwd });
        return { remote, forkOwner: match[1] };
      }
      throw new Error("Push to origin failed (permission denied) and no fork remote found");
    },

    async diff(base, cwd) {
      const { stdout } = await execa("git", ["diff", `${base}...HEAD`], {
        cwd,
      });
      return stdout;
    },

    async currentBranch(cwd) {
      const { stdout } = await execa(
        "git",
        ["rev-parse", "--abbrev-ref", "HEAD"],
        { cwd },
      );
      return stdout.trim();
    },

    async hasCommitsVsBase(branch, base, cwd) {
      const { stdout } = await execa(
        "git",
        ["rev-list", "--count", `${base}..${branch}`],
        { cwd },
      );
      return parseInt(stdout.trim(), 10) > 0;
    },

    async addWorktree(path, baseBranch, cwd) {
      await execa("git", ["worktree", "add", path, baseBranch], { cwd });
    },

    async removeWorktree(path, cwd) {
      await execa("git", ["worktree", "remove", "--force", path], { cwd });
    },
  };
}
