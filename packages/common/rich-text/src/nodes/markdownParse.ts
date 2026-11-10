/**
 * Shared by the callout and toggle markdown parse rules (#392). No React or
 * DOM, so the headless schema can use it.
 */
import type { JSONContent, MarkdownParseHelpers, MarkdownToken } from '@tiptap/core';

/**
 * True when the tokens lexed so far are those of a list item: marked lexes a
 * paragraph there as a block-level `text` token. The serializer never writes a
 * callout or toggle inside a list item, and lexing a body there makes marked
 * emit tokens the list item parser drops, so both tokenizers decline.
 */
export const inListItem = (siblings: MarkdownToken[]) => siblings.some((t) => t.type === 'text');

/** The block tokens of a container's body as its `block+` content. */
export function parseMarkdownBody(tokens: MarkdownToken[] | undefined, helpers: MarkdownParseHelpers): JSONContent[] {
  const content = (helpers.parseBlockChildren ?? helpers.parseChildren)(tokens ?? []);
  return content.length ? content : [{ type: 'paragraph' }];
}
