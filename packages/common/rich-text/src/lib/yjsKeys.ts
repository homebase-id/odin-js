/**
 * Journal syncs its editor through y-prosemirror; the feed does not. These read
 * y-prosemirror's plugin state by key name, so the schema keeps journal's behaviour
 * without depending on Yjs. Both are no-ops when no y-prosemirror plugin is installed.
 */
import type { EditorState, Transaction } from '@tiptap/pm/state';

/** True for a transaction y-prosemirror applied from a remote Yjs update. */
export const isRemoteChange = (tr: Transaction): boolean => !!tr.getMeta('y-sync$')?.isChangeOrigin;

/** y-prosemirror's undo manager, when the editor has one. */
export const yUndoManager = (state: EditorState): { stopCapturing(): void } | undefined =>
  (state as unknown as Record<string, { undoManager?: { stopCapturing(): void } } | undefined>)['y-undo$']
    ?.undoManager;
