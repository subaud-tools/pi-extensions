# Changelog

## 0.4.1

- An event's text can no longer end the `<channel>` block early: the `<` of any `</channel` in it (any case) is written `&lt;`. Nothing else in the text changes.
- A server's guidance is what follows the last `\n\n---\n` in an event's content, not the first, so that sequence inside the body stays body. A server whose guidance itself contains the sequence would now have it split there.

## 0.4.0

- channels.tools reports the session's activity to every connected channel server: `notifications/channels/report` with `{ event: "activity", working }`. Working is true while a turn runs (pi's `agent_start` until `agent_settled`) or any background agent does (`@tintinweb/pi-subagents`' `subagents:started`, by id, until its `subagents:completed` or `subagents:failed`). It is sent whenever that changes, and to a server each time it connects, a retry reconnect included. A server that does not know the event ignores it.

## 0.3.0

- An event whose meta carries a `report` token is reported back to its server with `notifications/channels/report`: `held` when it is buffered mid-turn, `landed` once its envelope is in a turn's context, and `turn_ended` when that turn settles.
