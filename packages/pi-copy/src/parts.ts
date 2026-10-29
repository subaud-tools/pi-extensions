// pi-copy parts — split an answer's markdown source into the parts the picker
// offers, and turn each into the text it copies.
//
// Parsing uses marked's lexer (the parser pi draws messages with), so a code
// block is found wherever pi would draw one, inside a list item included, and
// its text is marked's: fences and indent removed, no trailing newline.
// Prose is rendered to plain text here: one line per paragraph, inline marks
// dropped, links as `text (url)`, list markers kept, tables as source rows.

import { Lexer, type Token, type Tokens } from "marked";

export type Part = { kind: "code" | "prose" | "all"; label: string; text: string };

const PREVIEW = 60;

function preview(text: string): string {
  const first = text.split("\n").find((line) => line.trim() !== "") ?? "";
  const line = first.trim();
  return line.length > PREVIEW ? `${line.slice(0, PREVIEW - 1)}…` : line;
}

// Every code block, in source order, wherever it sits (lists, blockquotes).
function codeBlocks(tokens: Token[], out: Tokens.Code[] = []): Tokens.Code[] {
  for (const token of tokens) {
    if (token.type === "code") out.push(token as Tokens.Code);
    else if (token.type === "list") for (const item of (token as Tokens.List).items) codeBlocks(item.tokens, out);
    else if ("tokens" in token && Array.isArray(token.tokens)) codeBlocks(token.tokens, out);
  }
  return out;
}

// A code block's exact text, without the trailing newlines a blank line before the fence leaves.
function codeText(code: Tokens.Code): string {
  return code.text.replace(/\n+$/, "");
}

function inline(tokens: Token[] | undefined): string {
  if (!tokens) return "";
  return tokens.map(inlineToken).join("");
}

function inlineToken(token: Token): string {
  switch (token.type) {
    case "strong":
    case "em":
    case "del":
      return inline((token as Tokens.Strong).tokens);
    case "codespan":
      return (token as Tokens.Codespan).text;
    case "link":
    case "image": {
      const link = token as Tokens.Link;
      const text = link.tokens ? inline(link.tokens) : link.text;
      return text === link.href || text === "" ? link.href : `${text} (${link.href})`;
    }
    case "br":
      return "\n";
    case "text": {
      const text = token as Tokens.Text;
      return text.tokens ? inline(text.tokens) : text.text;
    }
    default:
      return "text" in token && typeof token.text === "string" ? token.text : token.raw;
  }
}

// A paragraph's soft and hard line breaks become spaces: one line each.
function oneLine(text: string): string {
  return text.replace(/[ \t]*\n[ \t]*/g, " ").trim();
}

// Blocks to plain text; withCode puts each code block's text in place.
function blocks(tokens: Token[], withCode: boolean): string[] {
  const out: string[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case "paragraph":
      case "heading":
      case "text":
        out.push(oneLine(inline((token as Tokens.Paragraph).tokens)));
        break;
      case "code":
        if (withCode) out.push(codeText(token as Tokens.Code));
        break;
      case "list":
        out.push(list(token as Tokens.List, 0, withCode).join("\n"));
        break;
      case "blockquote":
        out.push(...blocks((token as Tokens.Blockquote).tokens, withCode));
        break;
      case "table":
        out.push(token.raw.trimEnd());
        break;
      case "html":
        out.push(token.raw.trim());
        break;
      default:
        // space, hr, def: nothing to copy
        break;
    }
  }
  return out.filter((block) => block !== "");
}

function list(token: Tokens.List, depth: number, withCode: boolean): string[] {
  const indent = "  ".repeat(depth);
  const start = typeof token.start === "number" ? token.start : 1;
  const lines: string[] = [];
  token.items.forEach((item, index) => {
    const marker = token.ordered ? `${start + index}. ` : "- ";
    let first = true;
    for (const child of item.tokens) {
      if (child.type === "list") {
        lines.push(...list(child as Tokens.List, depth + 1, withCode));
        continue;
      }
      for (const block of blocks([child], withCode)) {
        // A code block keeps its own text: no marker, no indent.
        if (child.type === "code") lines.push(block);
        else lines.push(first ? `${indent}${marker}${block}` : `${indent}  ${block}`);
        if (child.type !== "code") first = false;
      }
    }
  });
  return lines;
}

export function splitParts(markdown: string): Part[] {
  const tokens = new Lexer().lex(markdown);
  const parts: Part[] = codeBlocks(tokens).map((code, index) => ({
    kind: "code",
    label: `Code block ${index + 1}${code.lang ? ` (${code.lang})` : ""}: ${preview(code.text)}`,
    text: codeText(code),
  }));
  const prose = blocks(tokens, false).join("\n\n");
  if (prose === "") return parts;
  parts.push({ kind: "prose", label: `Prose: ${preview(prose)}`, text: prose });
  if (parts.length > 1) parts.push({ kind: "all", label: "All of the answer", text: blocks(tokens, true).join("\n\n") });
  return parts;
}

const NOUN: Record<Part["kind"], string> = { code: "code block", prose: "prose", all: "the whole answer" };

export function notice(part: Part): string {
  const lines = part.text.split("\n").length;
  return `Copied ${NOUN[part.kind]} (${lines} ${lines === 1 ? "line" : "lines"}, ${part.text.length} chars)`;
}
