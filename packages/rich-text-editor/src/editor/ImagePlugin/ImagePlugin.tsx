import {
  createPluginFactory,
  useEventPlateId,
  useEditorRef,
  PlateEditor,
  PlateRenderElementProps,
} from '@udecode/plate-core';
import { Value, insertNodes, removeNodes, TElement } from '@udecode/plate-common';
import { ReactEditor } from 'slate-react';
import { DEFAULT_PAYLOAD_KEY, SecurityGroupType, TargetDrive } from '@youfoundation/js-lib/core';
import { useState } from 'react';
import { ImageIcon, Pencil, Trash, t, useImage } from '@youfoundation/common-app';
import { Image } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { ErrorNotification } from '@youfoundation/common-app';
import { ImageDialog } from '@youfoundation/common-app';
import { ToolbarButton, ToolbarButtonProps } from '../../components/plate-ui/toolbar';

export interface TImageElement extends TElement {
  targetDrive: TargetDrive;
  fileId: string;
  fileKey: string;
}

export const ELEMENT_IMAGE = 'local_image';

export const insertImage = <V extends Value>(
  editor: PlateEditor<V>,
  fileId: string,
  fileKey: string,
  targetDrive: TargetDrive
) => {
  const text = { text: '' };
  const image: TImageElement = {
    type: ELEMENT_IMAGE,
    fileId,
    fileKey,
    targetDrive,
    children: [text],
  };
  const paragraph = {
    type: 'paragraph',
    children: [text],
  };

  insertNodes<TImageElement | TElement>(editor, [image, paragraph]);
};

interface ImageToolbarButtonProps extends ToolbarButtonProps {
  targetDrive: TargetDrive;
}

export const ImageToolbarButton = ({ targetDrive, ...props }: ImageToolbarButtonProps) => {
  const [isActive, setIsActive] = useState(false);
  const editor = useEditorRef(useEventPlateId());

  return (
    <>
      <ToolbarButton
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsActive(true);
        }}
        {...props}
      >
        <ImageIcon />
      </ToolbarButton>
      <ImageDialog
        isOpen={isActive}
        onCancel={() => {
          setIsActive(false);
        }}
        onConfirm={(uploadResult) => {
          if (uploadResult) {
            insertImage(editor, uploadResult.fileId, DEFAULT_PAYLOAD_KEY, targetDrive);
            setIsActive(false);
          }
        }}
        title={t('Upload image')}
        confirmText={t('Add')}
        acl={{ requiredSecurityGroup: SecurityGroupType.Anonymous }}
        targetDrive={targetDrive} // TODO Add support for having the drive passed via props
      />
    </>
  );
};

export const ImageElementBlock = <V extends Value = Value>(
  props: PlateRenderElementProps<V, TImageElement>
) => {
  const [isActive, setIsActive] = useState(false);
  const { mutateAsync: removeImage, error: removeError } = useImage().remove;
  const { attributes, children, nodeProps, element } = props;

  const editor = useEditorRef(useEventPlateId());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const path = ReactEditor.findPath(editor as any, element as any);

  const doRemove = async () => {
    await removeImage({ targetDrive: element.targetDrive, fileId: element.fileId });
    removeNodes(editor, { at: path });
  };

  return (
    <>
      <div {...attributes} {...nodeProps}>
        {children}
        <div className="flex">
          <div className="relative mr-auto max-w-lg flex-grow">
            <Image
              targetDrive={element.targetDrive}
              fileId={element.fileId}
              fileKey={element.fileKey}
              className={` ${''}`}
            />
            <ActionButton
              onClick={() => setIsActive(true)}
              type="secondary"
              icon={Pencil}
              size="square"
              className="absolute right-3 top-3 z-10 rounded-md bg-white"
            />
            <ActionButton
              onClick={doRemove}
              type="remove"
              icon={Trash}
              size="square"
              className="absolute bottom-3 right-3 z-10 rounded-md"
            />
          </div>
        </div>
      </div>
      <ErrorNotification error={removeError} />
      <ImageDialog
        isOpen={isActive}
        onCancel={() => setIsActive(false)}
        onConfirm={async (uploadResult) => {
          if (uploadResult) {
            await removeImage({ targetDrive: element.targetDrive, fileId: element.fileId });

            element.fileId = uploadResult.fileId;
            setIsActive(false);
          }
        }}
        title={t('Upload image')}
        confirmText={t('Add')}
        acl={{ requiredSecurityGroup: SecurityGroupType.Anonymous }}
        targetDrive={element.targetDrive} // TODO Add support for having the drive passed via props
      />
    </>
  );
};

export const createImagePlugin = createPluginFactory({
  key: ELEMENT_IMAGE,
  isElement: true,
  component: ImageElementBlock,
});
