// utils.ts

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
 * Tokenize VALID JSON (pretty-printed). No HTML escaping here;
 * render as React text nodes so React escapes safely.
 */
export function tokenizeJson(jsonText: string): Token[] {
  // Strings (with optional trailing colon), literals, numbers, punctuation, whitespace.
  // Removed unnecessary escapes to satisfy `no-useless-escape`.
  const re =
    /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^"\\]*)")(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\],:]|\s+/g;

  const out: Token[] = [];
  let m: RegExpExecArray | null;

  while ((m = re.exec(jsonText)) !== null) {
    const [tok, strLit] = m;

    if (strLit !== undefined) {
      // Was a string; check if the regex consumed a trailing colon by comparing `tok`
      // e.g. `"key":` vs `"value"`
      if (tok.endsWith(":")) {
        out.push({ cls: "key", text: strLit });
        out.push({ cls: "punct", text: ":" });
      } else {
        out.push({ cls: "string", text: strLit });
      }
      continue;
    }

    if (tok === "true" || tok === "false") { out.push({ cls: "boolean", text: tok }); continue; }
    if (tok === "null") { out.push({ cls: "null", text: tok }); continue; }
    if (/^-?\d/.test(tok)) { out.push({ cls: "number", text: tok }); continue; }
    if (/^[{}[\],:]$/.test(tok)) { out.push({ cls: "punct", text: tok }); continue; }
    if (/^\s+$/.test(tok)) { out.push({ cls: "ws", text: tok }); continue; }

    out.push({ cls: "plain", text: tok });
  }

  return out;
}
