import { PlatePlugin, TEditableProps, Value } from '@udecode/plate-core';

import { LinkPlugin } from '@udecode/plate-link';
import { PlateFloatingLink } from '@udecode/plate-ui-link';

type RenderAfterEditable<V extends Value = Value> = (
  editableProps: TEditableProps<V>
) => JSX.Element | null;

export const linkPlugin: Partial<PlatePlugin<LinkPlugin>> = {
  renderAfterEditable: PlateFloatingLink as RenderAfterEditable<Value>,
};
