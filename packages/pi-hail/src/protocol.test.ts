// Guards: a daemon frame split across two socket chunks must not be parsed as one, or the phone sees garbled events.
import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeLine, decodeLine, splitFrames, isAbortFrame } from "./protocol.ts";
import type { Inbound, Outbound } from "./protocol.ts";

// T2.3 — the askDone outcome is allowed|denied only; `deferred` is gone from
// the wire (one dialog, nothing to defer to). This is a type-level guard: the
// ts-expect-error directive below typechecks ONLY once `deferred` is no longer
// a member of the union.
test("askDone outcome union is allowed|denied only (no deferred)", () => {
  const allowed: Outbound = { askDone: { requestId: "r", outcome: "allowed", by: "mac" } };
  const denied: Outbound = { askDone: { requestId: "r", outcome: "denied", by: "phone" } };
  assert.ok(allowed && denied);
  const bad: Outbound = {
    // @ts-expect-error `deferred` is no longer a valid askDone outcome
    askDone: { requestId: "r", outcome: "deferred", by: "mac" },
  };
  assert.ok(bad);
});

test("encodeLine appends exactly one newline and round-trips", () => {
  const s = encodeLine({ turn: "start" });
  assert.equal(s, '{"turn":"start"}\n');
  assert.deepEqual(decodeLine(s.trimEnd()), { turn: "start" });
});

test("splitFrames keeps a partial trailing line as rest", () => {
  const { lines, rest } = splitFrames('{"a":1}\n{"b":2}\n{"c":');
  assert.deepEqual(lines, ['{"a":1}', '{"b":2}']);
  assert.equal(rest, '{"c":');
});

test("splitFrames returns no lines when no newline present", () => {
  const { lines, rest } = splitFrames('{"partial":');
  assert.deepEqual(lines, []);
  assert.equal(rest, '{"partial":');
});

// Guards: the phone's Stop reaches pi only as the daemon's { abort: {} } line;
// nothing else (ctl stop, a prompt, a malformed abort) may be read as one.
test("the abort frame parses from its wire line, and only it does", () => {
  const frame: Inbound = { abort: {} };
  assert.equal(encodeLine(frame), '{"abort":{}}\n');
  assert.equal(isAbortFrame(decodeLine('{"abort":{}}')), true);
  for (const line of ['{"ctl":"stop"}', '{"abort":null}', '{"abort":"now"}', '{"prompt":{"text":"abort"}}', "null"]) {
    assert.equal(isAbortFrame(decodeLine(line)), false, line);
  }
});

// Guards: the phone's one image rides the daemon's prompt line as {data, mimeType}.
test("a prompt line carries an optional image", () => {
  const frame: Inbound = {
    prompt: { text: "", from: "p1", requestId: "r1", image: { data: "/9j/4AAQ", mimeType: "image/jpeg" } },
  };
  const line = '{"prompt":{"text":"","from":"p1","requestId":"r1","image":{"data":"/9j/4AAQ","mimeType":"image/jpeg"}}}';
  assert.equal(encodeLine(frame), line + "\n");
  assert.deepEqual(decodeLine(line), frame);
});
