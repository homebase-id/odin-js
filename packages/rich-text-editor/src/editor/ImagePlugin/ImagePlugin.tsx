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
import { useCallback, useState } from 'react';
import { ImageIcon, Pencil, Trash, t, useDotYouClient } from '@youfoundation/common-app';
import { ImageDialog } from '@youfoundation/common-app';
import { ToolbarButton, ToolbarButtonProps } from '../../components/plate-ui/toolbar';
import { OdinThumbnailImage } from '@youfoundation/ui-lib';
import { NewMediaFile } from '@youfoundation/js-lib/public';

export interface TImageElement extends TElement {
  fileKey: string;
  lastModified?: number;
}

export const ELEMENT_IMAGE = 'local_image';

export const insertImage = <V extends Value>(editor: PlateEditor<V>, fileKey: string) => {
  const text = { text: '' };
  const image: TImageElement = {
    type: ELEMENT_IMAGE,
    fileKey,
    lastModified: new Date().getTime(),
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
  pendingUploadFiles?: NewMediaFile[];
  onAppend: (file: Blob) => Promise<{ fileId: string; fileKey: string } | null>;
  onRemove: (payload: { fileId: string; fileKey: string }) => Promise<unknown | null>;
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
        onCancel={() => setIsActive(false)}
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
  const dotYouClient = useDotYouClient().getDotYouClient();

  const editor = useEditorRef(useEventPlateId());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const path = ReactEditor.findPath(editor as any, element as any);

  const options = getPluginOptions<MediaOptions | undefined>(editor, ELEMENT_IMAGE);

  const doRemove = async () => {
    if (await options?.onRemove({ fileId: options.fileId, fileKey: element.fileKey })) {
      setTimeout(() => {
        removeNodes(editor, { at: path });
      }, 10);
    }
  };

  if (!options || !options.mediaDrive) return <></>;

  const doOpenDialog = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsActive(true);
  }, []);

  const pendingUpload = options.pendingUploadFiles?.find(
    (file) => file.fileKey === element.fileKey
  );
  const pendingUrl = pendingUpload ? URL.createObjectURL(pendingUpload.file) : undefined;

  return (
    <>
      <div
        {...attributes}
        {...nodeProps}
        className="relative aspect-square w-full max-w-lg bg-slate-50 dark:bg-slate-800"
        data-file-id={options.fileId}
        data-file-key={element.fileKey}
      >
        {children}
        <div className="absolute inset-4 mr-auto max-w-lg flex-grow">
          {pendingUrl ? (
            <img src={pendingUrl} className="absolute inset-0 h-full w-full object-contain" />
          ) : (
            <OdinThumbnailImage
              dotYouClient={dotYouClient}
              fileId={options.fileId}
              fileKey={element.fileKey}
              targetDrive={options.mediaDrive}
              lastModified={element.lastModified || new Date().getTime()}
              loadSize={{
                pixelWidth: 400,
                pixelHeight: 400,
              }}
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}
        </div>
        {/* We use buttons instead of our ActionButton because of endless rerenders when used inside of the RTE */}
        <button
          onClick={doOpenDialog}
          className="absolute right-3 top-3 z-20 rounded-md bg-white p-2 dark:bg-slate-900"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            doRemove();
          }}
          className="absolute bottom-3 right-3 z-20 rounded-md bg-red-500 p-2 text-white hover:bg-red-600"
        >
          <Trash className="h-4 w-4" />
        </button>
      </div>

      <ImageDialog
        isOpen={isActive}
        onCancel={() => setIsActive(false)}
        onConfirm={async (newImage) => {
          if (!newImage) doRemove();
          else {
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
