import { describe, expect, it } from 'vitest';
import { getSchema } from '@tiptap/core';
import { createBaseExtensions } from '../index';
import allBlocks from './fixtures/tiptap/all-blocks.json';

const schema = getSchema(createBaseExtensions());

describe('shared schema', () => {
  it('has every node and mark the feed and journal store', () => {
    const nodes = Object.keys(schema.nodes);
    for (const name of [
      'paragraph', 'heading', 'blockquote', 'codeBlock', 'bulletList', 'orderedList', 'listItem',
      'taskList', 'taskItem', 'table', 'tableRow', 'tableCell', 'tableHeader', 'image', 'gallery',
      'callout', 'toggle', 'linkPreview', 'footnoteReference', 'footnotes', 'footnote',
      'inlineMath', 'blockMath', 'mention', 'horizontalRule', 'hardBreak',
    ])
      expect(nodes).toContain(name);
    const marks = Object.keys(schema.marks);
    for (const name of ['bold', 'italic', 'underline', 'strike', 'code', 'kbd', 'link', 'subscript', 'superscript'])
      expect(marks).toContain(name);
  });

  it('accepts a document with every block', () => {
    const doc = schema.nodeFromJSON(allBlocks);
    expect(() => doc.check()).not.toThrow();
    // Attributes the feed needs survive the schema.
    expect(JSON.stringify(doc.toJSON())).toContain('"fileKey":"pst_rtei0"');
  });

  it('leaves journal-only nodes out', () => {
    expect(schema.nodes.noteLink).toBeUndefined();
  });
});
