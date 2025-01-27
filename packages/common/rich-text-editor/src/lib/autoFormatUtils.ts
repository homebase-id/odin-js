import { AutoformatBlockRule } from '@udecode/plate-autoformat';
import { CodePlugin } from '@udecode/plate-basic-marks/react';
import { CodeBlockPlugin } from '@udecode/plate-code-block/react';
import { ElementApi, isType } from '@udecode/plate';
import { PlateEditor } from '@udecode/plate-core/react';
import { toggleList, unwrapList } from '@udecode/plate-list';

export const preFormat: AutoformatBlockRule['preFormat'] = (editor) => unwrapList(editor);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const format = (editor: PlateEditor, customFormatting: any) => {
  if (editor.selection) {
    const parentEntry = editor.api.parent(editor.selection);
    if (!parentEntry) return;
    const [node] = parentEntry;
    if (
      ElementApi.isElement(node) &&
      !isType(editor, node, CodeBlockPlugin.key) &&
      !isType(editor, node, CodePlugin.key)
    ) {
      customFormatting();
    }
  }
};

export const formatList = (editor: PlateEditor, elementType: string) => {
  format(editor, () =>
    toggleList(editor, {
      type: elementType,
    })
  );
};

export const formatText = (editor: PlateEditor, text: string) => {
  format(editor, () => editor.tf.insertText(text));
};
