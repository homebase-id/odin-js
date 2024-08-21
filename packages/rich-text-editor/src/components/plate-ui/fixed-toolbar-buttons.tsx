import {
  MARK_BOLD,
  MARK_CODE,
  MARK_ITALIC,
  MARK_STRIKETHROUGH,
  MARK_UNDERLINE,
} from '@udecode/plate-basic-marks';
import { useEditorReadOnly } from '@udecode/plate-common';

import { Icons } from '../../components/icons';

import { InsertDropdownMenu } from './insert-dropdown-menu';
import { MarkToolbarButton } from './mark-toolbar-button';
import { ToolbarGroup } from './toolbar';
import { TurnIntoDropdownMenu } from './turn-into-dropdown-menu';
import { ImageToolbarButton, MediaOptions } from '../../editor/ImagePlugin/ImagePlugin';
import { Bold, Italic, Underline } from '@youfoundation/common-app';
import { LinkToolbarButton } from './link-toolbar-button';

export function FixedToolbarButtons({ mediaOptions }: { mediaOptions: MediaOptions | undefined }) {
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
            <InsertDropdownMenu />
            <TurnIntoDropdownMenu />
          </ToolbarGroup>

          <ToolbarGroup>
            <MarkToolbarButton tooltip="Bold (⌘+B)" nodeType={MARK_BOLD}>
              <Bold className="h-5 w-5" />
            </MarkToolbarButton>
            <MarkToolbarButton tooltip="Italic (⌘+I)" nodeType={MARK_ITALIC}>
              <Italic className="h-5 w-5" />
            </MarkToolbarButton>
            <MarkToolbarButton tooltip="Underline (⌘+U)" nodeType={MARK_UNDERLINE}>
              <Underline className="h-5 w-5" />
            </MarkToolbarButton>

            <MarkToolbarButton tooltip="Strikethrough (⌘+⇧+M)" nodeType={MARK_STRIKETHROUGH}>
              <Icons.strikethrough className="h-5 w-5" />
            </MarkToolbarButton>
            <MarkToolbarButton tooltip="Code (⌘+E)" nodeType={MARK_CODE}>
              <Icons.code className="h-5 w-5" />
            </MarkToolbarButton>
            <LinkToolbarButton />
            {mediaOptions ? <ImageToolbarButton mediaOptions={mediaOptions} /> : null}
          </ToolbarGroup>
        </>
      </div>
    </div>
  );
}
