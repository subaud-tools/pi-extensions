// pi-copy — copy one part of the last answer: a code block exactly as
// written, or the prose as plain text.
//
// The answer is read from the session (the same message pi's /copy uses),
// never from the screen, so nothing copied carries pi's wrapping or borders.
// `/copy-part` always opens a picker of the parts; alt+c copies the one code
// block at once when there is exactly one, and opens the picker otherwise.
// The copy goes through pi's own copyToClipboard, which also reaches the
// local clipboard from tmux and over SSH (OSC 52).
//
// The pure splitting lives in parts.ts; this file is the thin pi wiring.

import { notice, splitParts, type Part } from "./parts.ts";

export type Deps = {
  // Injectable so the wiring is testable without pi's real clipboard.
  copy?: (text: string) => Promise<void>;
};

// Lazy: a top-level import of the pi package pulls its entire runtime, which
// only resolves inside a live pi process (and breaks node --test).
async function defaultCopy(text: string): Promise<void> {
  const mod: any = await import("@earendil-works/pi-coding-agent");
  await mod.copyToClipboard(text);
}

// The last assistant answer's text, as pi's getLastAssistantText reads it:
// an aborted message with no content is skipped.
export function lastAnswerText(branch: any[]): string | undefined {
  const entry = branch
    .slice()
    .reverse()
    .find((e) => {
      const m = e?.type === "message" ? e.message : undefined;
      if (m?.role !== "assistant") return false;
      return !(m.stopReason === "aborted" && (m.content ?? []).length === 0);
    });
  if (!entry) return undefined;
  let text = "";
  for (const content of entry.message.content ?? []) {
    if (content?.type === "text") text += content.text;
  }
  return text.trim() || undefined;
}

export function createCopy(pi: any, deps: Deps = {}): void {
  const copy = deps.copy ?? defaultCopy;

  async function run(ctx: any, alwaysPick: boolean): Promise<void> {
    const text = lastAnswerText(ctx.sessionManager.getBranch());
    if (!text) {
      ctx.ui.notify("No answer to copy yet.", "info");
      return;
    }
    const parts = splitParts(text);
    const code = parts.filter((p) => p.kind === "code");
    let part: Part | undefined;
    if (!alwaysPick && code.length === 1) {
      part = code[0];
    } else {
      const label = await ctx.ui.select(
        "Copy which part?",
        parts.map((p) => p.label),
      );
      part = parts.find((p) => p.label === label);
    }
    if (!part) return;
    try {
      await copy(part.text);
      ctx.ui.notify(notice(part), "info");
    } catch (error) {
      ctx.ui.notify(`pi-copy: could not copy: ${String(error)}`, "error");
    }
  }

  pi.registerCommand("copy-part", {
    description: "Copy one part of the last answer: a code block as written, or the prose as plain text",
    handler: async (_args: string, ctx: any) => run(ctx, true),
  });

  pi.registerShortcut("alt+c", {
    description: "Copy a part of the last answer (the one code block at once)",
    handler: async (ctx: any) => run(ctx, false),
  });
}

export default function (pi: any) {
  createCopy(pi);
}
