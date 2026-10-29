import { test } from "node:test";
import assert from "node:assert/strict";
import { createCopy } from "./index.ts";

const assistant = (text: string) => ({
  type: "message",
  message: { role: "assistant", content: [{ type: "text", text }], stopReason: "stop" },
});
const user = (text: string) => ({ type: "message", message: { role: "user", content: text } });

// A fake pi capturing the command and shortcut, and a fake ctx whose branch,
// select answer, notices and clipboard are all observable.
function makeFixture(branch: any[], choose: (labels: string[]) => string | undefined = () => undefined) {
  const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
  const shortcuts = new Map<string, { handler: (ctx: any) => Promise<void> }>();
  const copied: string[] = [];
  const notices: string[] = [];
  const selects: string[][] = [];

  const pi = {
    registerCommand(name: string, options: any) {
      commands.set(name, options);
    },
    registerShortcut(key: string, options: any) {
      shortcuts.set(key, options);
    },
  };
  createCopy(pi, {
    copy: async (text: string) => {
      copied.push(text);
    },
  });

  const ctx = {
    sessionManager: { getBranch: () => branch },
    ui: {
      async select(_title: string, labels: string[]) {
        selects.push(labels);
        return choose(labels);
      },
      notify(message: string) {
        notices.push(message);
      },
    },
  };

  return {
    copied,
    notices,
    selects,
    altC: () => shortcuts.get("alt+c")!.handler(ctx),
    copyPart: () => commands.get("copy-part")!.handler("", ctx),
  };
}

const oneBlock = "Cut the release:\n\n```bash\ngit tag pi-copy-v0.1.0 && git push --tags\n```";
const twoBlocks = "Build:\n\n```sh\nnpm pack --workspace packages/pi-copy\n```\n\nThen:\n\n```sh\nnpm publish pi-copy-0.1.0.tgz\n```";

test("alt+c with one code block copies it without the picker", async () => {
  const f = makeFixture([user("how do I tag it?"), assistant(oneBlock)]);

  await f.altC();

  assert.equal(f.selects.length, 0);
  assert.deepEqual(f.copied, ["git tag pi-copy-v0.1.0 && git push --tags"]);
  assert.deepEqual(f.notices, ["Copied code block (1 line, 41 chars)"]);
});

const salomon =
  "Message for Salomon:\n\n> Dev Fetch’s CRM now works. Please walk a pitch deck through Make it.\n\nSaved and pushed as `d31765e`.";

test("alt+c with one quote and no code block copies the quote without the picker", async () => {
  const f = makeFixture([assistant(salomon)]);

  await f.altC();

  assert.equal(f.selects.length, 0);
  assert.deepEqual(f.copied, ["Dev Fetch’s CRM now works. Please walk a pitch deck through Make it."]);
  assert.deepEqual(f.notices, ["Copied quote (1 line, 68 chars)"]);
});

test("alt+c with one code block and one quote copies the code block", async () => {
  const f = makeFixture([assistant(`${oneBlock}\n\n> Tell Dana it is tagged.`)]);

  await f.altC();

  assert.equal(f.selects.length, 0);
  assert.deepEqual(f.copied, ["git tag pi-copy-v0.1.0 && git push --tags"]);
});

test("alt+c with two quotes and no code block opens the picker", async () => {
  const f = makeFixture([assistant("For Dana:\n\n> Deck is ready.\n\nFor Sam:\n\n> Room is booked.")], (labels) => labels[1]);

  await f.altC();

  assert.equal(f.selects.length, 1);
  assert.deepEqual(f.copied, ["Room is booked."]);
});

test("alt+c with two code blocks opens the picker and copies the choice", async () => {
  const f = makeFixture([assistant(twoBlocks)], (labels) => labels[1]);

  await f.altC();

  assert.equal(f.selects.length, 1);
  assert.deepEqual(f.copied, ["npm publish pi-copy-0.1.0.tgz"]);
});

test("/copy-part opens the picker even with one code block", async () => {
  const f = makeFixture([assistant(oneBlock)], (labels) => labels.find((l) => l.startsWith("Prose")));

  await f.copyPart();

  assert.equal(f.selects.length, 1);
  assert.deepEqual(f.copied, ["Cut the release:"]);
});

test("Escape in the picker copies nothing", async () => {
  const f = makeFixture([assistant(twoBlocks)], () => undefined);

  await f.copyPart();

  assert.deepEqual(f.copied, []);
  assert.deepEqual(f.notices, []);
});

test("no answer yet notifies and copies nothing", async () => {
  const f = makeFixture([user("hello")]);

  await f.altC();

  assert.deepEqual(f.copied, []);
  assert.deepEqual(f.notices, ["No answer to copy yet."]);
});

test("an aborted empty answer is skipped for the one before it", async () => {
  const aborted = { type: "message", message: { role: "assistant", content: [], stopReason: "aborted" } };
  const f = makeFixture([assistant(oneBlock), user("again"), aborted]);

  await f.altC();

  assert.deepEqual(f.copied, ["git tag pi-copy-v0.1.0 && git push --tags"]);
});
