import { useEditorReadOnly } from '@udecode/plate-core/react';
import { Icons } from '../../components/icons';

import { MarkToolbarButton } from './mark-toolbar-button';
import { MoreDropdownMenu } from './more-dropdown-menu';
import { TurnIntoDropdownMenu } from './turn-into-dropdown-menu';
import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
} from '@udecode/plate-basic-marks/react';

export function FloatingToolbarButtons() {
  const readOnly = useEditorReadOnly();

  return (
    <>
      {!readOnly && (
        <>
          <TurnIntoDropdownMenu />

          <MarkToolbarButton nodeType={BoldPlugin.key} tooltip="Bold (⌘+B)">
            <Icons.bold />
          </MarkToolbarButton>
          <MarkToolbarButton nodeType={ItalicPlugin.key} tooltip="Italic (⌘+I)">
            <Icons.italic />
          </MarkToolbarButton>
          <MarkToolbarButton nodeType={UnderlinePlugin.key} tooltip="Underline (⌘+U)">
            <Icons.underline />
          </MarkToolbarButton>
          <MarkToolbarButton nodeType={StrikethroughPlugin.key} tooltip="Strikethrough (⌘+⇧+M)">
            <Icons.strikethrough />
          </MarkToolbarButton>
          {/* <MarkToolbarButton nodeType={CodePlugin.key} tooltip="Code (⌘+E)">
            <Icons.code />
          </MarkToolbarButton> */}
        </>
      )}

      <MoreDropdownMenu />
    </>
  );
}
