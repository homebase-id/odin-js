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
import { EmojiDropdownMenu } from './emoji-dropdown-menu/EmojiDropdownMenu';
import { CodeBlockToolbarButton } from './toolbar/CodeblockToolbarButton';
import { ListToolbarButton } from './list-toolbar-button';
import { BulletedListPlugin, NumberedListPlugin } from '@udecode/plate-list/react';
import { QuoteToolbarButton } from './quote-toolbar-button';

export function FixedToolbarButtons({
  disableTurnInto,
  mediaOptions,
}: {
  disableTurnInto?: boolean;
  mediaOptions: MediaOptions | undefined;
}) {
  const readOnly = useEditorReadOnly();

  return (
    <div className="w-full overflow-hidden">
      <div
        className={`flex overflow-x-auto py-1 ${readOnly ? 'pointer-events-none cursor-not-allowed' : ''}`}
        style={{
          transform: 'translateX(calc(-1px))',
        }}
      >
        <>
          {!disableTurnInto ? (
            <ToolbarGroup noSeparator>
              <TurnIntoDropdownMenu />
            </ToolbarGroup>
          ) : null}

          <ToolbarGroup noSeparator={disableTurnInto}>
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
          </ToolbarGroup>

          <ToolbarGroup>
            <LinkToolbarButton />
            <ListToolbarButton nodeType={NumberedListPlugin.key} />
            <ListToolbarButton nodeType={BulletedListPlugin.key} />
          </ToolbarGroup>

          <ToolbarGroup>
            {mediaOptions ? <ImageToolbarButton /> : null}
            <QuoteToolbarButton />
            <MarkToolbarButton tooltip="Code (⌘+E)" nodeType={CodePlugin.key}>
              <Icons.code className="h-5 w-5" />
            </MarkToolbarButton>
            <CodeBlockToolbarButton>
              <Icons.codeblock className="h-5 w-5" />
            </CodeBlockToolbarButton>

            <EmojiDropdownMenu />
          </ToolbarGroup>
        </>
      </div>
    </div>
  );
}
