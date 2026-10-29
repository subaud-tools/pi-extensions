import { test } from "node:test";
import assert from "node:assert/strict";
import { notice, splitParts } from "./parts.ts";

const prose = (md: string) => splitParts(md).find((p) => p.kind === "prose")!.text;

test("a multi-line command with \\ continuations copies byte for byte", () => {
  const command = [
    "gh release create pi-copy-v0.1.0 \\",
    '  --repo subaud-tools/pi-extensions \\',
    '  --title "pi-copy 0.1.0" \\',
    "  --notes-file CHANGELOG.md --verify-tag",
  ].join("\n");
  const answer = `Run this to cut the release:\n\n\`\`\`bash\n${command}\n\`\`\`\n\nThen watch the workflow.`;

  const parts = splitParts(answer);

  assert.equal(parts[0]!.kind, "code");
  assert.equal(parts[0]!.text, command);
  assert.match(parts[0]!.label, /bash/);
  assert.match(parts[0]!.label, /gh release create pi-copy-v0\.1\.0/);
});

test("a code block inside a list item is a part copied without the list indent", () => {
  const answer = [
    "Two steps:",
    "",
    "1. Build the tarball:",
    "",
    "   ```sh",
    "   npm pack --workspace packages/pi-copy",
    "   ls *.tgz",
    "   ```",
    "",
    "2. Publish it.",
  ].join("\n");

  const code = splitParts(answer).filter((p) => p.kind === "code");

  assert.equal(code.length, 1);
  assert.equal(code[0]!.text, "npm pack --workspace packages/pi-copy\nls *.tgz");
});

test("a paragraph written across several source lines becomes one line", () => {
  const answer = [
    "Hi Dana,",
    "",
    "Thanks for sending the deck over. I went through it",
    "last night and the pricing section reads well,",
    "though slide 7 could lose a bullet.",
    "",
    "Can we talk Thursday?",
  ].join("\n");

  assert.equal(
    prose(answer),
    "Hi Dana,\n\nThanks for sending the deck over. I went through it last night and the pricing section reads well, though slide 7 could lose a bullet.\n\nCan we talk Thursday?",
  );
});

test("bold, italic, inline code and strike marks are removed", () => {
  const answer = "The **release** is _ready_: run `npm pack` ~~twice~~ once.";

  assert.equal(prose(answer), "The release is ready: run npm pack twice once.");
});

test("a link becomes its text and address, a bare URL just the address", () => {
  const answer = "See [the deck](https://x.io/d) or https://x.io/notes for detail.";

  assert.equal(prose(answer), "See the deck (https://x.io/d) or https://x.io/notes for detail.");
});

test("a heading becomes its text on a line of its own", () => {
  const answer = "## Next steps\n\nShip it on Friday.";

  assert.equal(prose(answer), "Next steps\n\nShip it on Friday.");
});

test("nested ordered and unordered lists keep markers, two spaces per level", () => {
  const answer = [
    "1. Prepare the release",
    "   - bump the **version**",
    "   - update the changelog",
    "2. Tag it",
  ].join("\n");

  assert.equal(
    prose(answer),
    "1. Prepare the release\n  - bump the version\n  - update the changelog\n2. Tag it",
  );
});

test("a blockquote becomes its text without the > mark", () => {
  const answer = "> Ship the smallest correct change.\n> Then stop.";

  assert.equal(prose(answer), "Ship the smallest correct change. Then stop.");
});

test("a table keeps its markdown source rows", () => {
  const table = "| Package | Status |\n|---|---|\n| pi-copy | new |";
  const answer = `Where things stand:\n\n${table}`;

  assert.equal(prose(answer), `Where things stand:\n\n${table}`);
});

test("an answer with only prose has the prose part alone", () => {
  const parts = splitParts("Hi Dana,\n\nThe deck looks good.\n\nCourt");

  assert.deepEqual(
    parts.map((p) => p.kind),
    ["prose"],
  );
});

test("an answer with only a code block has only the block", () => {
  const parts = splitParts("```bash\nnpm publish --access public\n```");

  assert.deepEqual(
    parts.map((p) => p.kind),
    ["code"],
  );
  assert.equal(parts[0]!.text, "npm publish --access public");
});

test("a blank line before the closing fence leaves no trailing newline", () => {
  const answer = "Run:\n\n```sh\necho ready\n\n```";

  const parts = splitParts(answer);

  assert.equal(parts[0]!.text, "echo ready");
  assert.equal(parts[2]!.text, "Run:\n\necho ready");
});

test("parts come in order: each code block, then prose, then all with code in place", () => {
  const answer = "First:\n\n```sh\nnpm ci\n```\n\nThen **test**:\n\n```sh\nnpm test\n```";

  const parts = splitParts(answer);

  assert.deepEqual(
    parts.map((p) => p.kind),
    ["code", "code", "prose", "all"],
  );
  assert.equal(parts[2]!.text, "First:\n\nThen test:");
  assert.equal(parts[3]!.text, "First:\n\nnpm ci\n\nThen test:\n\nnpm test");
});

test("notice names a one-line part and its size", () => {
  const text = "x".repeat(148);
  const [part] = splitParts("```\n" + text + "\n```");

  assert.equal(notice(part!), "Copied code block (1 line, 148 chars)");
});

test("notice counts lines of a multi-line part", () => {
  const parts = splitParts("Hello there.\n\nSecond paragraph.");

  assert.equal(notice(parts[0]!), "Copied prose (3 lines, 31 chars)");
});
