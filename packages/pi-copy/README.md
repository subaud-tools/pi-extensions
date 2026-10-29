# pi-copy

A pi extension that copies **one part** of the last answer so it pastes cleanly: a code block exactly as written (a long command continued with `\` pastes into a terminal and runs), or the prose as plain text (one line per paragraph, ready for an email).

Pi's own `/copy` (Ctrl+X) copies the whole last answer as markdown source, fences and marks included; drag-selecting copies the rendered screen, wraps and borders included. pi-copy reads the answer's source text from the session instead, never the screen.

## Use

- `/copy-part` opens a picker of the answer's parts. Enter copies the chosen part; Escape copies nothing.
- **alt+c** does the same, except that when the answer has exactly one code block it copies that block at once.
- After a copy, a one-line notice names what was copied and its size, such as `Copied code block (1 line, 148 chars)`. With no answer yet it says `No answer to copy yet.`

## The parts

- **Each code block**, in order, labelled with its language and its first line. Copied as its exact text: no fences, no indent, no trailing newline. A block inside a list item counts too.
- **The prose**: everything outside the code blocks, as plain text. Paragraphs are one line each, separated by a blank line; bold, italic, inline code and strike marks are removed; a link becomes `text (url)`, or just the address when the two are the same; headings are their text on a line of their own; list items keep `- ` or `1. ` with two spaces per nesting level; a blockquote loses its `>`; a table is copied as its markdown source rows.
- **All**: the whole answer, the prose as above with each code block's text in place.

An answer with no code blocks has only the prose part; one with no prose has its code blocks and all.

Only the last answer is read. An earlier answer can still be copied whole from `/tree` with Ctrl+X.

## Design

- Parsing uses `marked`'s lexer, the parser pi draws messages with, carried as this package's own dependency (pinned to the version pi uses) because pi doesn't provide it to extensions.
- The copy goes through pi's `copyToClipboard`, which also reaches the local clipboard from tmux and over SSH through OSC 52.
- `src/parts.ts` is the pure splitting and plain-text rendering; `src/index.ts` is the thin pi wiring.

## Tests

`node --test src/*.test.ts`: the parts and each part's copied text (continued commands, a block in a list, paragraphs, inline marks, links, headings, nested lists, blockquotes, tables, the notice), and the wiring against a fake pi (alt+c's one-block shortcut, the picker, Escape, no answer, an aborted answer skipped).

## Install

```sh
pi install npm:pi-copy
```

Or try it against a live session without installing:

```sh
pi -e ./packages/pi-copy/src/index.ts
```
