import { withRef } from '@udecode/cn';
import { BaseCodeBlockPlugin } from '@udecode/plate-code-block';

import { FileCode } from 'lucide-react';
import { ToolbarButton } from '../toolbar';
import { useToggleCodeBlockButton } from '@udecode/plate-code-block/react';
import { useEditorRef } from '@udecode/plate-core/react';
import { someNode } from '@udecode/plate-common';

export const CodeBlockToolbarButton = withRef<typeof ToolbarButton>(({}, ref) => {
  const { props } = useToggleCodeBlockButton();

  const editor = useEditorRef();

  const codeBlockType = editor.getType(BaseCodeBlockPlugin);
  const isActive = someNode(editor, {
    match: { type: codeBlockType },
  });

  return (
    <ToolbarButton pressed={isActive} ref={ref} tooltip={'Code block'} {...props}>
      <FileCode />
    </ToolbarButton>
  );
});