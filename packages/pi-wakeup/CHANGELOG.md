# Changelog

## 0.3.0

- Each session's pending wakeups are written to `$XDG_STATE_HOME/pi-wakeup/<session id>.json` (`~/.local/state/pi-wakeup` by default) as `{"session":"<id>","wakeups":[{"fire_at":"<RFC 3339 UTC>","reason":"<text>"}]}`, soonest first, so other programs can see them. The file is written atomically (temp file and rename) whenever a wakeup is scheduled, fires or is cancelled, and removed when none are pending or the session ends. A reload keeps it; a fresh start removes one a crashed run left behind.
