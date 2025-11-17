export function safeStringify(value: unknown, space: number | string = 2): string {
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (k, v) => {
      if (typeof v === "bigint") return `${v}n`;
      if (typeof v === "object" && v !== null) {
        if (seen.has(v as object)) return "[Circular]";
        seen.add(v as object);
      }
      return v;
    },
    space
  )!;
}

export type Token =
  | { cls: "key" | "string" | "number" | "boolean" | "null" | "punct" | "ws" | "plain"; text: string };

/**
 * Tokenize VALID JSON (pretty-printed). Render as React text nodes (no HTML escaping here).
 */
export function tokenizeJson(jsonText: string): Token[] {
  // Improved regex pattern that properly handles all JSON escape sequences
  // String pattern: "..." with proper escape handling including \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
  // Followed by optional whitespace and colon (for keys)
  const re =
    // eslint-disable-next-line no-useless-escape
    /("(?:[^"\\]|\\["\\\/bfnrt]|\\u[0-9a-fA-F]{4})*")(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}\[\],:]|\s+/g;

  const out: Token[] = [];
  let m: RegExpExecArray | null;

  while ((m = re.exec(jsonText)) !== null) {
    const [tok, strLit, colonPart] = m;

    if (strLit !== undefined) {
      // It was a string literal; if regex consumed a colon, it's a key.
      if (colonPart) {
        out.push({ cls: "key", text: strLit });
        // Handle whitespace between string and colon
        const wsMatch = colonPart.match(/^(\s*)(:)$/);
        if (wsMatch) {
          if (wsMatch[1]) out.push({ cls: "ws", text: wsMatch[1] });
          out.push({ cls: "punct", text: wsMatch[2] });
        } else {
          out.push({ cls: "punct", text: ":" });
        }
      } else {
        out.push({ cls: "string", text: strLit });
      }
      continue;
    }

    if (tok === "true" || tok === "false") { out.push({ cls: "boolean", text: tok }); continue; }
    if (tok === "null") { out.push({ cls: "null", text: tok }); continue; }
    if (/^-?\d/.test(tok)) { out.push({ cls: "number", text: tok }); continue; }
    // eslint-disable-next-line no-useless-escape
    if (/^[{}\[\],:]$/.test(tok)) { out.push({ cls: "punct", text: tok }); continue; }
    if (/^\s+$/.test(tok)) { out.push({ cls: "ws", text: tok }); continue; }

    out.push({ cls: "plain", text: tok });
  }

  return out;
}
