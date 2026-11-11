/**
 * How an article stores a Tiptap document next to its Slate body.
 * `body` is the reduced copy old clients read; `slateHash` ties `bodyDoc` to that exact copy, so a
 * body an old client edited no longer matches and is read instead.
 */
import { slateToTiptap, tiptapText, tiptapToSlate, type SlateNode, type TiptapJSONContent } from './SlateTiptap';

export const BODY_DOC_FORMAT = 'tiptap-v1';

export type StoredBodyDoc = { format: typeof BODY_DOC_FORMAT; doc: TiptapJSONContent; slateHash: string };
export type StoredArticleBody = { body: SlateNode[]; bodyDoc: StoredBodyDoc };

/** Lowercase hex SHA-256 of the UTF-8 bytes of JSON.stringify(body). */
export async function slateHash(body: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(body)));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The `body` and `bodyDoc` an article stores for a document. */
export async function toStoredArticleBody(doc: TiptapJSONContent): Promise<StoredArticleBody> {
  const body = tiptapToSlate(doc);
  return { body, bodyDoc: { format: BODY_DOC_FORMAT, doc, slateHash: await slateHash(body) } };
}

/** The document to show for an article: `bodyDoc` while it still matches `body`, else `body` converted. */
export async function articleDocOf(content: {
  body?: string | Record<string, unknown>[] | null;
  bodyDoc?: { format: string; doc: unknown; slateHash: string } | null;
}): Promise<TiptapJSONContent> {
  const { body, bodyDoc } = content;
  if (bodyDoc?.format === BODY_DOC_FORMAT && bodyDoc.doc && bodyDoc.slateHash === (await slateHash(body)))
    return bodyDoc.doc as TiptapJSONContent;
  return slateToTiptap(body as string | SlateNode[] | undefined);
}

/** Reading time of a document, counted like `getReadingTime` in common-app: 200 words a minute. */
export function readingTimeOf(doc: TiptapJSONContent): { words: number; minutes: number } {
  const words = tiptapText(doc).split(/\s+/).filter(Boolean).length;
  return { words, minutes: Math.ceil(words / 200) };
}
