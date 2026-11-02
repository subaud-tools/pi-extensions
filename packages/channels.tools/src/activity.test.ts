import { test } from "node:test";
import assert from "node:assert/strict";
import { createActivity } from "./activity.ts";

function harness() {
  const changes: boolean[] = [];
  const activity = createActivity((working) => changes.push(working));
  return { activity, changes };
}

test("starts idle and reports nothing until something changes", () => {
  const { activity, changes } = harness();
  assert.equal(activity.working(), false);
  assert.deepEqual(changes, []);
});

test("a turn reports working at agent_start and idle at agent_settled", () => {
  const { activity, changes } = harness();
  activity.turnStarted();
  assert.equal(activity.working(), true);
  activity.turnSettled();
  assert.equal(activity.working(), false);
  assert.deepEqual(changes, [true, false]);
});

test("a background agent keeps the session working after its turn settles", () => {
  const { activity, changes } = harness();
  activity.turnStarted();
  activity.backgroundStarted({ id: "a1" });
  activity.turnSettled();
  assert.equal(activity.working(), true);
  activity.backgroundEnded({ id: "a1" });
  assert.deepEqual(changes, [true, false]);
});

test("working stays until every background agent has ended", () => {
  const { activity, changes } = harness();
  activity.backgroundStarted({ id: "a1" });
  activity.backgroundStarted({ id: "a2" });
  activity.backgroundEnded({ id: "a1" });
  assert.equal(activity.working(), true);
  activity.backgroundEnded({ id: "a2" });
  assert.deepEqual(changes, [true, false]);
});

test("a repeated or unknown event, or one with no string id, changes nothing", () => {
  const { activity, changes } = harness();
  activity.turnStarted();
  activity.turnStarted();
  activity.backgroundStarted({ id: "a1" });
  activity.backgroundStarted({ id: "a1" });
  activity.backgroundStarted({});
  activity.backgroundStarted(null);
  activity.backgroundEnded({ id: "nope" });
  activity.turnSettled();
  activity.backgroundEnded({ id: "a1" });
  activity.backgroundEnded({ id: "a1" });
  activity.turnSettled();
  assert.deepEqual(changes, [true, false]);
});
