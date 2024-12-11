import { Icons } from '../../components/icons';

import { MarkToolbarButton } from './mark-toolbar-button';
import { ToolbarGroup } from './toolbar';
import { TurnIntoDropdownMenu } from './turn-into-dropdown-menu';
import { ImageToolbarButton, MediaOptions } from '../../editor/ImagePlugin/ImagePlugin';
import { Bold, Italic, Underline } from '@homebase-id/common-app/icons';
import { LinkToolbarButton } from './link-toolbar-button';
import { useEditorReadOnly } from '@udecode/plate-core/react';
import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
} from '@udecode/plate-basic-marks/react';
import { HEADING_KEYS } from '@udecode/plate-heading';
import { EmojiDropdownMenu } from './emoji-dropdown-menu/EmojiDropdownMenu';
import { CodeBlockToolbarButton } from './toolbar/CodeblockToolbarButton';

export function FixedToolbarButtons({
  disableHeadings,
  mediaOptions,
}: {
  disableHeadings?: boolean;
  mediaOptions: MediaOptions | undefined;
}) {
  const readOnly = useEditorReadOnly();

  return (
    <div className="w-full overflow-hidden">
      <div
        className={`flex flex-wrap py-1 ${readOnly ? 'pointer-events-none cursor-not-allowed' : ''}`}
        style={{
          transform: 'translateX(calc(-1px))',
        }}
      >
        <>
          <ToolbarGroup noSeparator>
            <TurnIntoDropdownMenu
              filterValues={disableHeadings ? [HEADING_KEYS.h1, HEADING_KEYS.h2] : undefined}
            />
          </ToolbarGroup>

          <ToolbarGroup>
            <MarkToolbarButton tooltip="Bold (⌘+B)" nodeType={BoldPlugin.key}>
              <Bold className="h-5 w-5" />
            </MarkToolbarButton>
            <MarkToolbarButton tooltip="Italic (⌘+I)" nodeType={ItalicPlugin.key}>
              <Italic className="h-5 w-5" />
            </MarkToolbarButton>
            <MarkToolbarButton tooltip="Underline (⌘+U)" nodeType={UnderlinePlugin.key}>
              <Underline className="h-5 w-5" />
            </MarkToolbarButton>
            <MarkToolbarButton tooltip="Strikethrough (⌘+⇧+M)" nodeType={StrikethroughPlugin.key}>
              <Icons.strikethrough className="h-5 w-5" />
            </MarkToolbarButton>
            <MarkToolbarButton tooltip="Code (⌘+E)" nodeType={CodePlugin.key}>
              <Icons.code className="h-5 w-5" />
            </MarkToolbarButton>
            <CodeBlockToolbarButton>
              <Icons.codeblock className="h-5 w-5" />
            </CodeBlockToolbarButton>
            <LinkToolbarButton />
            {mediaOptions ? <ImageToolbarButton /> : null}
            <EmojiDropdownMenu />
          </ToolbarGroup>
        </>
      </div>
    </div>
  );
}
