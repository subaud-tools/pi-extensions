# Changelog

## 0.4.0

- channels.tools reports the session's activity to every connected channel server: `notifications/channels/report` with `{ event: "activity", working }`. Working is true while a turn runs (pi's `agent_start` until `agent_settled`) or any background agent does (`@tintinweb/pi-subagents`' `subagents:started`, by id, until its `subagents:completed` or `subagents:failed`). It is sent whenever that changes, and to a server each time it connects, a retry reconnect included. A server that does not know the event ignores it.

## 0.3.0

- An event whose meta carries a `report` token is reported back to its server with `notifications/channels/report`: `held` when it is buffered mid-turn, `landed` once its envelope is in a turn's context, and `turn_ended` when that turn settles.
