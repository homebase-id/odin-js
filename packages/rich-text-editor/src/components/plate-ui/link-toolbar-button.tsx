import { useLinkToolbarButton, useLinkToolbarButtonState } from '@udecode/plate-link';

import { Icons } from '../icons';

import { ToolbarButton } from './toolbar';

export function LinkToolbarButton() {
  const state = useLinkToolbarButtonState();
  const { props } = useLinkToolbarButton(state);

  return (
    <ToolbarButton tooltip="Link" {...props}>
      <Icons.link className="h-5 w-5" />
    </ToolbarButton>
  );
}
