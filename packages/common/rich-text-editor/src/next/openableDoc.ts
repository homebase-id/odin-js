import { getSchema, type JSONContent } from '@tiptap/core';
// The module itself, not the package index, which brings the whole editor schema along
import { articleDocOf } from '@homebase-id/rich-text/src/stored';
import { createArticleEditorExtensions } from './editorExtensions';

export const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

/**
 * The document the editor opens for an article: `articleDocOf(article)`, checked against the
 * editor's schema. Rejects when the article can't be read or the document doesn't fit the schema,
 * which Tiptap would otherwise open as an empty document that the first change then saves.
 */
export async function openableDoc(article: {
  body?: unknown;
  bodyDoc?: { format: string; doc: unknown; slateHash: string } | null;
}): Promise<JSONContent> {
  const doc = await articleDocOf(article as Parameters<typeof articleDocOf>[0]);
  if (!doc.content?.length) return EMPTY_DOC;
  // The schema doesn't depend on the callbacks
  const schema = getSchema(
    createArticleEditorExtensions({ mentionables: () => [], insertImages: () => undefined })
  );
  schema.nodeFromJSON(doc).check();
  return doc;
}
