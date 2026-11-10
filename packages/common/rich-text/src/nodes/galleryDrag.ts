/**
 * Building galleries by hand (#603): drop a dragged image beside another image to
 * make a gallery of the two (or add it to that image's gallery, which also reorders
 * one), and move a gallery image left or right from its toolbar. Each change is one
 * undo step. Dragging an image anywhere else is ProseMirror's own move; a gallery
 * it leaves with one image unwraps (GalleryNode.ts).
 *
 * Headless-safe: the plugin only touches the DOM through an EditorView.
 */
import { NodeSelection, Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import type { Node as PMNode, ResolvedPos } from '@tiptap/pm/model';
import { yUndoManager } from '../lib/yjsKeys';
import { GALLERY } from './GalleryNode';

export interface DropTarget {
  /** Position of the image dropped beside. */
  pos: number;
  side: 'left' | 'right';
}

const dropKey = new PluginKey<DropTarget | null>('galleryDrop');

/** Dispatches `tr` as an undo step of its own, not merged with typing just before or after. */
export function dispatchUndoStep(view: EditorView, tr: Transaction): void {
  const undoManager = yUndoManager(view.state);
  undoManager?.stopCapturing();
  view.dispatch(tr);
  undoManager?.stopCapturing();
}

/** True when the image at `$image` is in a gallery, or its paragraph could become one. */
function canHoldGallery($image: ResolvedPos): boolean {
  if ($image.parent.type.name === GALLERY) return true;
  const index = $image.index(-1);
  return $image.node(-1).canReplaceWith(index, index + 1, $image.doc.type.schema.nodes[GALLERY]);
}

/**
 * Removes the image at `from`, and its paragraph too when that held only the image,
 * so a moved image leaves no empty line behind.
 */
function removeImage(tr: Transaction, from: number): void {
  const $from = tr.doc.resolve(from);
  const alone = $from.depth === 1 && $from.parent.type.name === 'paragraph' && $from.parent.childCount === 1;
  if (alone) tr.delete($from.before(), $from.after());
  else tr.delete(from, from + $from.parent.child($from.index()).nodeSize);
}

/**
 * Puts `image` on the `side` of the image at `target.pos`: into its gallery, or into a
 * new gallery of the two in place of it. `from` is where `image` was (moved), or null
 * when it is a copy. Null when the drop makes no gallery.
 */
export function dropImageBeside(state: EditorState, image: PMNode, from: number | null, target: DropTarget): Transaction | null {
  if (from === target.pos) return null;
  const tr = state.tr;
  if (from !== null) removeImage(tr, from);
  const at = tr.mapping.map(target.pos);
  const beside = tr.doc.nodeAt(at);
  const $at = tr.doc.resolve(at);
  if (beside?.type.name !== 'image' || !canHoldGallery($at)) return null;

  if ($at.parent.type.name === GALLERY) {
    tr.insert(target.side === 'left' ? at : at + beside.nodeSize, image);
  } else {
    const gallery = state.schema.nodes[GALLERY].create(null, target.side === 'left' ? [image, beside] : [beside, image]);
    if ($at.parent.childCount === 1) tr.replaceWith($at.before(), $at.after(), gallery);
    // At the start of its line the gallery goes above it: replacing would leave an empty line there
    else if ($at.index() === 0) tr.delete(at, at + beside.nodeSize).insert($at.before(), gallery);
    // Elsewhere the line splits around the gallery
    else tr.replaceWith(at, at + beside.nodeSize, gallery);
  }
  // No node selection on the dropped image: y-prosemirror restores it on undo, at a
  // position that may no longer hold a node
  return tr;
}

/**
 * Moves the gallery image at `pos` one place left (-1) or right (1); null at either end.
 * The neighbour is what actually moves, so the image keeps its node view (and the
 * focused toolbar button) and stays selected.
 */
export function moveGalleryImage(state: EditorState, pos: number, dir: -1 | 1): Transaction | null {
  const $pos = state.doc.resolve(pos);
  const gallery = $pos.parent;
  const image = state.doc.nodeAt(pos);
  const neighbour = gallery.maybeChild($pos.index() + dir);
  if (gallery.type.name !== GALLERY || !image || !neighbour) return null;
  const tr = state.tr;
  if (dir === -1) {
    const from = pos - neighbour.nodeSize;
    return tr.delete(from, pos).insert(from + image.nodeSize, neighbour);
  }
  const from = pos + image.nodeSize;
  return tr.delete(from, from + neighbour.nodeSize).insert(pos, neighbour);
}

/** The image being dragged in this editor, and where it is (null if not a selected node). */
function draggedImage(view: EditorView): { image: PMNode; from: number | null } | null {
  const content = view.dragging?.slice.content;
  const image = content?.childCount === 1 ? content.firstChild : null;
  if (image?.type.name !== 'image') return null;
  const { selection } = view.state;
  return { image, from: selection instanceof NodeSelection && selection.node.eq(image) ? selection.from : null };
}

/** The image under the pointer that a dragged image would go beside, and which side. */
export function dropTargetAt(view: EditorView, event: DragEvent): DropTarget | null {
  const dragged = draggedImage(view);
  const at = dragged && view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!at || at.inside < 0 || at.inside === dragged.from) return null;
  if (view.state.doc.nodeAt(at.inside)?.type.name !== 'image' || !canHoldGallery(view.state.doc.resolve(at.inside))) return null;
  const dom = view.nodeDOM(at.inside);
  if (!(dom instanceof HTMLElement)) return null;
  // The box hugging the image (ImageNode.tsx): outside a gallery the node view spans the line
  const rect = (dom.querySelector('.image-node > div') ?? dom).getBoundingClientRect();
  return { pos: at.inside, side: event.clientX < rect.left + rect.width / 2 ? 'left' : 'right' };
}

function showTarget(view: EditorView, target: DropTarget | null): void {
  const shown = dropKey.getState(view.state);
  if (shown?.pos === target?.pos && shown?.side === target?.side) return;
  view.dispatch(view.state.tr.setMeta(dropKey, target));
}

/** Shows the drop indicator (`data-drop-side` on the image, src/index.css) and makes the drop. */
export function galleryDropPlugin(): Plugin<DropTarget | null> {
  return new Plugin<DropTarget | null>({
    key: dropKey,
    state: {
      init: () => null,
      apply: (tr, shown) => {
        const meta = tr.getMeta(dropKey) as DropTarget | null | undefined;
        if (meta !== undefined) return meta;
        return tr.docChanged ? null : shown;
      },
    },
    props: {
      decorations: (state) => {
        const shown = dropKey.getState(state);
        if (!shown) return null;
        return DecorationSet.create(state.doc, [Decoration.node(shown.pos, shown.pos + 1, { 'data-drop-side': shown.side })]);
      },
      handleDOMEvents: {
        dragover: (view, event) => {
          showTarget(view, dropTargetAt(view, event));
          return false;
        },
        dragleave: (view, event) => {
          if (!view.dom.contains(event.relatedTarget as Node | null)) showTarget(view, null);
          return false;
        },
        dragend: (view) => {
          showTarget(view, null);
          return false;
        },
        drop: (view) => {
          // Any other image move (out of a gallery, say) is one undo step too: it is
          // dispatched synchronously after this handler, before the microtask.
          if (!draggedImage(view)) return false;
          const undoManager = yUndoManager(view.state);
          undoManager?.stopCapturing();
          queueMicrotask(() => undoManager?.stopCapturing());
          return false;
        },
      },
      handleDrop: (view, event, _slice, moved) => {
        const target = dropTargetAt(view, event);
        const dragged = draggedImage(view);
        showTarget(view, null);
        // A move whose source isn't known is left to ProseMirror, which knows what to delete
        if (!target || !dragged || (moved && dragged.from === null)) return false;
        const tr = dropImageBeside(view.state, dragged.image, moved ? dragged.from : null, target);
        if (!tr) return false;
        view.focus();
        dispatchUndoStep(view, tr);
        return true;
      },
    },
  });
}
