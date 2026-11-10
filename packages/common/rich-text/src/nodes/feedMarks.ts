/**
 * Nodes and marks the feed's Slate articles already use that journal has no
 * equivalent for, so old posts convert without loss.
 */
import { Mark, mergeAttributes } from '@tiptap/core';
import Mention from '@tiptap/extension-mention';

/** Keyboard key, as `<kbd>`; Slate's `kbd` leaf mark. */
export const Kbd = Mark.create({
  name: 'kbd',
  parseHTML: () => [{ tag: 'kbd' }],
  renderHTML: ({ HTMLAttributes }) => ['kbd', mergeAttributes(HTMLAttributes), 0],
});

/**
 * `@identity` mention; Slate's `{ type: 'mention', value }`. `id` holds the odin id.
 * The editor layers its suggestion popup on top.
 */
export const FeedMention = Mention.configure({
  renderText: ({ node }) => `@${node.attrs.id}`,
  renderHTML: ({ node, options }) => [
    'span',
    mergeAttributes({ 'data-type': 'mention', 'data-id': node.attrs.id }, options.HTMLAttributes),
    `@${node.attrs.id}`,
  ],
});
