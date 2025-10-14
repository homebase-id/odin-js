import { TElement } from '@udecode/plate';
import { createPlatePlugin } from '@udecode/plate-core/react';
import { RTEReferencedMessageElement } from './RTEReferencedMessageElement';
import { Editor, Range, Path, Transforms } from 'slate';

export const ELEMENT_REFERENCED_MESSAGE = 'referenced_message';
export interface TReferencedMessageElement extends TElement {
  messageId: string;
  channelId: string;
  threadId?: string;
  odinId: string;
  communityId: string;
  hint?: string;
}

const isRefMsgNode = (n: unknown): boolean =>
  (n as { type?: string })?.type === ELEMENT_REFERENCED_MESSAGE;

// Regex to detect referenced message URLs
const RE_MSG_URL = /^message:\/\/([A-Za-z0-9._-]+)(\?[^\s]+)?/i;
const RE_MSG_URL_GLOBAL = /message:\/\/([A-Za-z0-9._-]+)(\?[^\s]+)?/gi;

// Minimal shapes to avoid explicit 'any' while staying implementation-friendly
type PlateEditorLike = {
  selection: Range | null;
  api: {
    above: (opts: { at: unknown; match: (n: unknown) => boolean }) => [unknown, Path] | undefined;
    isStart: (point: unknown, at: unknown) => boolean;
    isEnd: (point: unknown, at: unknown) => boolean;
  };
  tf: {
    insertNodes: (node: unknown, options?: unknown) => void;
    select: (at: unknown) => void;
    insertText: (text: string) => void;
    removeNodes: (options?: unknown) => void;
    withoutNormalizing: (fn: () => void) => void;
  };
};

type KeyEventLike = { key: string; preventDefault: () => void };

type RefMsgParsed = {
  id: string;
  channelId: string;
  threadId?: string;
  odinId: string;
  communityId: string;
  hint?: string;
};

// Parse a single message:// URL into structured data; returns null if required params missing
function parseMessageUrl(input: string): RefMsgParsed | null {
  const match = input.match(RE_MSG_URL);
  if (!match) return null;
  const id = match[1];
  const query = match[2] ?? '';
  const params = new URLSearchParams(query.startsWith('?') ? query : query ? `?${query}` : '');
  if (!params.has('channelId') || !params.has('odinId') || !params.has('communityId')) return null;
  const channelId = params.get('channelId') ?? '';
  const threadId = params.get('threadId') ?? undefined;
  const odinId = params.get('odinId') ?? '';
  const communityId = params.get('communityId') ?? '';
  const hint = params.get('hint') || undefined;
  return { id, channelId, threadId, odinId, communityId, hint };
}

// Build the Slate element node for a referenced message
function createReferencedMessageNode(
  parsed: RefMsgParsed,
  labelOverride?: string
): TReferencedMessageElement {
  const { id, channelId, threadId, odinId, communityId, hint } = parsed;
  const label = labelOverride ?? hint ?? `message://${id}`;
  return {
    type: ELEMENT_REFERENCED_MESSAGE,
    messageId: id,
    channelId,
    ...(threadId ? { threadId } : {}),
    odinId,
    communityId,
    hint,
    children: [{ text: label }],
  } as TReferencedMessageElement;
}

// After inserting the node, ensure caret is placed after it and a space is inserted
function insertRefMsgNodeWithSpace(editor: PlateEditorLike, node: TReferencedMessageElement) {
  editor.tf.insertNodes(node);
  const insertedEntry = editor.api.above({
    at: editor.selection!,
    match: isRefMsgNode,
  });
  if (!insertedEntry) return;
  const elementPath = insertedEntry[1] as Path;
  const afterPoint = Editor.after(editor as unknown as Editor, elementPath);
  if (afterPoint) {
    editor.tf.select(afterPoint);
    editor.tf.insertText(' ');
  } else {
    const spacePath = Path.next(elementPath);
    editor.tf.insertNodes({ text: ' ' }, { at: spacePath, select: true });
    Transforms.collapse(editor as unknown as Editor, { edge: 'end' });
  }
}

// Handle Backspace/Delete to remove entire inline element when at boundaries or fully selected
function handleReferencedMessageDeletion(editor: PlateEditorLike, event: KeyEventLike): boolean {
  if (event.key !== 'Backspace' && event.key !== 'Delete') return false;
  const sel = editor.selection;
  if (!sel) return false;
  const aboveEntry = editor.api.above({ at: sel, match: isRefMsgNode });
  if (!aboveEntry) return false;
  const path = aboveEntry[1];

  const start = Range.start(sel);
  const end = Range.end(sel);

  // Entire element selected
  if (!Range.isCollapsed(sel) && editor.api.isStart(start, path) && editor.api.isEnd(end, path)) {
    event.preventDefault();
    editor.tf.removeNodes({ at: path });
    return true;
  }

  // Start + Backspace
  if (Range.isCollapsed(sel) && event.key === 'Backspace' && editor.api.isStart(sel.anchor, path)) {
    event.preventDefault();
    editor.tf.removeNodes({ at: path });
    return true;
  }

  // End + Delete
  if (Range.isCollapsed(sel) && event.key === 'Delete' && editor.api.isEnd(sel.anchor, path)) {
    event.preventDefault();
    editor.tf.removeNodes({ at: path });
    return true;
  }

  return false;
}

export const ReferenceMessagePlugin = createPlatePlugin({
  key: ELEMENT_REFERENCED_MESSAGE,

  node: { isElement: true, isInline: true, isVoid: false },
  render: {
    node: RTEReferencedMessageElement,
  },
})
  .extend({
    handlers: {
      onKeyDown: ({ editor, event }) => {
        if (
          handleReferencedMessageDeletion(
            editor as unknown as PlateEditorLike,
            event as unknown as KeyEventLike
          )
        )
          return;
      },
    },
    parsers: {
      html: {
        deserializer: {
          parse: ({ element }) => {
            if (!element || element.nodeName !== 'A') return;
            const href = (element as HTMLAnchorElement).getAttribute('href') || '';
            const parsed = parseMessageUrl(href);
            if (!parsed) return;
            const label = parsed.hint || element.textContent || `message://${parsed.id}`;
            return createReferencedMessageNode(parsed, label);
          },
          rules: [{ validNodeName: 'A' }],
        },
      },
    },
  })
  .overrideEditor(({ editor, tf }) => ({
    transforms: {
      insertData(data: DataTransfer) {
        const text = data.getData('text/plain');
        if (text && /message:\/\/[A-Za-z0-9._-]+/i.test(text)) {
          const lines = text.replace(/\r\n/g, '\n').split('\n');
          const re = RE_MSG_URL_GLOBAL;

          editor.tf.withoutNormalizing(() => {
            lines.forEach((line, idx) => {
              let lastIndex = 0;
              let match: RegExpExecArray | null;
              while ((match = re.exec(line)) !== null) {
                const start = match.index;
                const before = line.slice(lastIndex, start);
                if (before) tf.insertText(before);
                const token = match[0];
                const parsed = parseMessageUrl(token);
                if (parsed) {
                  const node = createReferencedMessageNode(parsed);
                  insertRefMsgNodeWithSpace(editor as unknown as PlateEditorLike, node);
                } else {
                  // If not strictly formatted, insert as plain text (no backward compat)
                  tf.insertText(match[0]);
                }
                lastIndex = re.lastIndex;
              }
              const tail = line.slice(lastIndex);
              if (tail) tf.insertText(tail);
              if (idx < lines.length - 1) tf.insertBreak();
              re.lastIndex = 0;
            });
          });
          return;
        }

        // fallback to default
        tf.insertData(data);
      },
    },
  }));
