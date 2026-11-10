/**
 * Footnotes (#518): `footnoteReference` atoms in the text point by `id` at
 * `footnote` items in one `footnotes` section at the end of the note. Numbers
 * are never stored: footnote n is the n-th distinct id in reference order.
 * No React or DOM, so the editor plugin and the agent edit engine share it.
 */
import type { Node as PMNode } from '@tiptap/pm/model';
import type { Transform } from '@tiptap/pm/transform';

/** Footnote ids in reference order: footnote n is at index n - 1. */
export function footnoteOrder(doc: PMNode): string[] {
  const ids = new Set<string>();
  doc.descendants((node) => {
    if (node.type.name === 'footnoteReference') ids.add(node.attrs.id);
  });
  return [...ids];
}

/**
 * Makes the footnotes section match the references: one section, last in the
 * note, with one footnote per referenced id in reference order. A missing
 * footnote comes from `cache` (a note whose reference was cut, then pasted)
 * or starts empty; a dropped footnote goes into `cache`. No references, no
 * section. Returns whether it changed anything.
 */
export function normalizeFootnotes(tr: Transform, cache?: Map<string, PMNode>): boolean {
  const { doc } = tr;
  const order = footnoteOrder(doc);
  const notes = new Map<string, PMNode>();
  const sections: { pos: number; node: PMNode }[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'footnotes') sections.push({ pos, node });
    else if (node.type.name === 'footnote' && !notes.has(node.attrs.id)) notes.set(node.attrs.id, node);
  });

  const only = sections.length === 1 ? sections[0].node : undefined;
  if (only && only === doc.lastChild && only.childCount === order.length) {
    let same = true;
    only.forEach((note, _, i) => {
      if (note.attrs.id !== order[i]) same = false;
    });
    if (same) return false;
  }
  if (!sections.length && !order.length) return false;

  const { schema } = doc.type;
  for (const [id, note] of notes) if (!order.includes(id)) cache?.set(id, note);
  if (order.length) {
    const items = order.map(
      (id) => notes.get(id) ?? cache?.get(id) ?? schema.nodes.footnote.create({ id }, schema.nodes.paragraph.create()),
    );
    // Insert first: the old sections are all before the end, so their positions hold.
    tr.insert(tr.doc.content.size, schema.nodes.footnotes.create(null, items));
  }
  for (const { pos, node } of [...sections].reverse()) {
    // A parent can't be left empty (a note that was only a section keeps a paragraph).
    if (tr.doc.resolve(pos).parent.childCount === 1) tr.replaceWith(pos, pos + node.nodeSize, schema.nodes.paragraph.create());
    else tr.delete(pos, pos + node.nodeSize);
  }
  return true;
}
