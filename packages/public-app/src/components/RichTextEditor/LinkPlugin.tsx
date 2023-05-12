import {
  createPluginFactory,
  useEventPlateId,
  usePlateEditorRef,
  Value,
  PlateEditor,
  insertNodes,
  removeNodes,
  TElement,
  PlateRenderElementProps,
} from '@udecode/plate-core';
import { ToolbarButton, ToolbarButtonProps } from '@udecode/plate-ui-toolbar';
import { useState } from 'react';
import { t } from '@youfoundation/common-app';
import { ellipsisAtMaxChar } from '@youfoundation/common-app';
import ActionButton from '../ui/Buttons/ActionButton';
import { ReactEditor } from 'slate-react';
import LinkButtonDialog from './LinkButtonDialog/LinkButtonDialog';

export interface TLinkElement extends TElement {
  linkText: string;
  linkTarget: string;
}

export const ELEMENT_LINK = 'link';

export const insertButton = <V extends Value>(
  editor: PlateEditor<V>,
  linkText: string,
  linkTarget: string
) => {
  const text = { text: '' };
  const link: TLinkElement = {
    type: ELEMENT_LINK,
    linkText,
    linkTarget,
    children: [text],
  };
  const paragraph = {
    type: 'paragraph',
    children: [text],
  };

  insertNodes<TLinkElement | TElement>(editor, [link, paragraph]);
};

type LinkToolbarButtonProps = ToolbarButtonProps;

export const LinkToolbarButton = (props: LinkToolbarButtonProps) => {
  const [isActive, setIsActive] = useState(false);
  const editor = usePlateEditorRef(useEventPlateId());

  return (
    <>
      <ToolbarButton
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsActive(true);
        }}
        {...props}
      />

      <LinkButtonDialog
        isOpen={isActive}
        onCancel={() => {
          setIsActive(false);
        }}
        onConfirm={(props) => {
          insertButton(editor, props.linkText, props.linkTarget);
          setIsActive(false);
        }}
        title={t('Include link button')}
        confirmText={t('Save')}
      />
    </>
  );
};

export const LinkElementBlock = <V extends Value = Value>(
  props: PlateRenderElementProps<V, TLinkElement>
) => {
  const { attributes, children, nodeProps, element } = props;

  const editor = usePlateEditorRef(useEventPlateId());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const path = ReactEditor.findPath(editor as any, element as any);

  return (
    <div {...attributes} {...nodeProps}>
      {children}
      <div className="my-5 flex flex-row">
        <a
          className="pointer-events-none rounded-md rounded-r-none bg-slate-500 px-3 py-2 text-left text-white"
          title={element.linkTarget}
        >
          {element.linkText}
          <small className="block text-sm opacity-60">
            {ellipsisAtMaxChar(element.linkTarget, 60)}
          </small>
        </a>

        <ActionButton
          onClick={() => removeNodes(editor, { at: path })}
          type="remove"
          icon="trash"
          size="square"
          className="rounded-l-none rounded-r-md"
        />
      </div>
    </div>
  );
};

export const createLinkPlugin = createPluginFactory({
  key: ELEMENT_LINK,
  isElement: true,
  component: LinkElementBlock,
});
