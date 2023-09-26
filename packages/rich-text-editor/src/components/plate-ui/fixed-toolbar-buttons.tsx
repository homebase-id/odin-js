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
import { ImageToolbarButton } from '../../editor/ImagePlugin/ImagePlugin';
import { TargetDrive } from '@youfoundation/js-lib/core';
import { Bold, Italic, Underline } from '@youfoundation/common-app';
import { LinkToolbarButton } from './link-toolbar-button';

export function FixedToolbarButtons({ mediaDrive }: { mediaDrive?: TargetDrive }) {
  const readOnly = useEditorReadOnly();

  return (
    <div className="w-full overflow-hidden">
      <div
        className="flex flex-wrap"
        style={{
          transform: 'translateX(calc(-1px))',
        }}
      >
        {!readOnly && (
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
                <Icons.strikethrough />
              </MarkToolbarButton>
              <MarkToolbarButton tooltip="Code (⌘+E)" nodeType={MARK_CODE}>
                <Icons.code />
              </MarkToolbarButton>
              <LinkToolbarButton />
              {mediaDrive ? <ImageToolbarButton targetDrive={mediaDrive} /> : null}
            </ToolbarGroup>
          </>
        )}
      </div>
    </div>
  );
}
