import {
  createPluginFactory,
  useEventPlateId,
  useEditorRef,
  PlateEditor,
  PlateRenderElementProps,
} from '@udecode/plate-core';
import { Value, insertNodes, TElement, getPluginOptions, removeNodes } from '@udecode/plate-common';
import { ReactEditor } from 'slate-react';
import { TargetDrive } from '@youfoundation/js-lib/core';
import { useState } from 'react';
import { ImageIcon, Pencil, Trash, t } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { ImageDialog } from '@youfoundation/common-app';
import { ToolbarButton, ToolbarButtonProps } from '../../components/plate-ui/toolbar';
import { Image } from '@youfoundation/common-app';

export interface TImageElement extends TElement {
  fileKey: string;
}

export const ELEMENT_IMAGE = 'local_image';

export const insertImage = <V extends Value>(editor: PlateEditor<V>, fileKey: string) => {
  const text = { text: '' };
  const image: TImageElement = {
    type: ELEMENT_IMAGE,
    fileKey,
    children: [text],
  };
  const paragraph = {
    type: 'paragraph',
    children: [text],
  };

  insertNodes<TImageElement | TElement>(editor, [image, paragraph]);
};

export interface MediaOptions {
  mediaDrive: TargetDrive;
  fileId: string;
  onAppend: (file: Blob) => Promise<{ fileId: string; fileKey: string } | null>;
  onRemove: (payload: {
    fileId: string;
    fileKey: string;
  }) => Promise<{ newVersionTag: string } | null>;
}

interface ImageToolbarButtonProps extends ToolbarButtonProps {
  mediaOptions: MediaOptions;
}

export const ImageToolbarButton = ({ mediaOptions, ...props }: ImageToolbarButtonProps) => {
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
        <ImageIcon className="h-5 w-5" />
      </ToolbarButton>
      <ImageDialog
        isOpen={isActive}
        onCancel={() => {
          setIsActive(false);
        }}
        onConfirm={async (image) => {
          if (image) {
            const uploadResult = await mediaOptions.onAppend(image);
            if (uploadResult) insertImage(editor, uploadResult.fileKey);
          }

          setIsActive(false);
        }}
        title={t('Upload image')}
        confirmText={t('Add')}
      />
    </>
  );
};

export const ImageElementBlock = <V extends Value = Value>(
  props: PlateRenderElementProps<V, TImageElement>
) => {
  const [isActive, setIsActive] = useState(false);
  const { attributes, children, nodeProps, element } = props;

  const editor = useEditorRef(useEventPlateId());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const path = ReactEditor.findPath(editor as any, element as any);

  const options = getPluginOptions<MediaOptions | undefined>(editor, ELEMENT_IMAGE);

  const doRemove = async () => {
    if (await options?.onRemove({ fileId: options.fileId, fileKey: element.fileKey })) {
      setTimeout(() => {
        removeNodes(editor, { at: path });
      }, 1000);
    }
  };

  if (!options || !options.mediaDrive) return <></>;

  return (
    <>
      <div {...attributes} {...nodeProps}>
        {children}
        <div className="flex">
          <div className="relative mr-auto max-w-lg flex-grow">
            <Image
              fileId={options.fileId}
              fileKey={element.fileKey}
              targetDrive={options.mediaDrive}
              lastModified={new Date().getTime()}
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
              confirmOptions={{
                title: t('Remove image'),
                body: t('Are you sure you want to remove this image?'),
                buttonText: t('Remove'),
              }}
              type="remove"
              icon={Trash}
              size="square"
              className="absolute bottom-3 right-3 z-10 rounded-md"
            />
          </div>
        </div>
      </div>
      <ImageDialog
        isOpen={isActive}
        onCancel={() => setIsActive(false)}
        onConfirm={async (newImage) => {
          if (!newImage) {
            doRemove();
          } else {
            const uploadResult = await options.onAppend(newImage);
            if (uploadResult) insertImage(editor, uploadResult.fileKey);
          }
          setIsActive(false);
        }}
        title={t('Upload image')}
        confirmText={t('Add')}
      />
    </>
  );
};

export const createImagePlugin = createPluginFactory({
  key: ELEMENT_IMAGE,
  isElement: true,
  component: (props) => ImageElementBlock({ ...props }),
});
