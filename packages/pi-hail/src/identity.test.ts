import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveIdentity, validName } from "./identity.ts";

test("validName mirrors Go tmux.ValidName", () => {
  assert.equal(validName("bettor-help"), true);
  assert.equal(validName("a.b_c-9"), true);
  assert.equal(validName("x".repeat(64)), true);
  assert.equal(validName("x".repeat(65)), false);
  assert.equal(validName(""), false);
  assert.equal(validName("."), false);
  assert.equal(validName(".."), false);
  assert.equal(validName("has space"), false);
  assert.equal(validName("a/b"), false);
});

test("hail-owned pane keeps today's identity", () => {
  const id = deriveIdentity(
    { inTmux: true, hailSession: "H1", sessionName: "acceptance", windowName: "Test" },
    "pi-1",
    "/Users/c/hail-acceptance",
  );
  assert.deepEqual(id, { sessionId: "H1", project: "hail-acceptance", work: "Test", identity: "hail" });
});

test("cast session name project/work wins over window name and cwd", () => {
  const id = deriveIdentity(
    { inTmux: true, sessionName: "bettor-help/contests", windowName: "node" },
    "pi-7",
    "/Users/c/bettor-help",
  );
  assert.deepEqual(id, { sessionId: "pi-7", project: "bettor-help", work: "contests", identity: "cast" });
});

test("cast rule needs exactly one slash and valid parts", () => {
  for (const name of ["a/b/c", "/work", "cast/", "bad name/x", "../x"]) {
    const id = deriveIdentity({ inTmux: true, sessionName: name, windowName: "w" }, "pi-2", "/d/dirname");
    assert.equal(id.identity, "fallback", name);
  }
});

test("outside tmux falls back to cwd basename", () => {
  const id = deriveIdentity({ inTmux: false }, "pi-3", "/x/cast-dir");
  assert.deepEqual(id, { sessionId: "pi-3", project: "cast-dir", work: "cast-dir", identity: "fallback" });
});

test("tmux without cast naming falls back to window name", () => {
  const id = deriveIdentity({ inTmux: true, sessionName: "main", windowName: "scratch" }, "pi-4", "/x/repo");
  assert.deepEqual(id, { sessionId: "pi-4", project: "repo", work: "scratch", identity: "fallback" });
});
