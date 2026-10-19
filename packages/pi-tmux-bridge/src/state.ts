import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { TmuxContext } from "./tmux.ts";

function defaultDir(): string {
  const base = process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache");
  return join(base, "claude-status");
}

// TWO-SIDED CONTRACT. dotfiles/bin/tmux-claude-context.sh derives the identical
// key from '#{socket_path}' on the reading side. Change the two together.
//
// Keying on the pane alone is what this replaced: pane ids are only unique per
// server, this machine runs a socket per project, so every server's %NN
// collided on one file and the bar showed some other socket's context.
export function stateKey(ctx: TmuxContext): string {
  const raw = `${ctx.socket}_${ctx.pane.replace(/^%/, "")}`;
  return raw.replace(/[^A-Za-z0-9_.-]/g, "_");
}

export function writeState(opts: {
  ctx: TmuxContext;
  // Undefined until pi knows it (a model switch before the first turn);
  // written empty so the reader shows no context badge rather than a fake 0.
  contextPct: number | undefined;
  model: string;
  // The thinking level of a reasoning model; undefined for any other model.
  thinking?: string;
  dir?: string;
}): void {
  const dir = opts.dir ?? defaultDir();
  try {
    mkdirSync(dir, { recursive: true });
    // The file is line-oriented key=value and the reader splits on the first
    // '='. A newline in a value would forge a key, so values are flattened.
    const flat = (value: string) => value.replace(/[\r\n]+/g, " ");
    const pct = opts.contextPct === undefined ? "" : String(Math.trunc(opts.contextPct));
    const body =
      `context_pct=${pct}\n` +
      `model=${flat(opts.model)}\n` +
      `thinking=${flat(opts.thinking ?? "")}\n` +
      `updated=${Math.floor(Date.now() / 1000)}\n` +
      `pane=${opts.ctx.pane}\n` +
      `socket=${opts.ctx.socket}\n`;
    writeFileSync(join(dir, stateKey(opts.ctx)), body);
  } catch {
    // Best-effort: a status bar is not worth failing a turn over.
  }
}

// Removing this on shutdown is what lets the reader stop guessing. Claude Code
// has no reliable way to say it is gone, so tmux-claude-context.sh sniffs
// pane_current_command instead; a pi session cleans up after itself.
export function removeState(ctx: TmuxContext, dir?: string): void {
  try {
    rmSync(join(dir ?? defaultDir(), stateKey(ctx)), { force: true });
  } catch {
    // Best-effort.
  }
}
