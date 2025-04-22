import { ReactEditor } from 'slate-react';
import { TargetDrive, NewMediaFile } from '@homebase-id/js-lib/core';
import { useMemo, useState } from 'react';
import { ImageDialog, t, useOdinClientContext } from '@homebase-id/common-app';
import { ImageIcon, Trash } from '@homebase-id/common-app/icons';
import { ToolbarButton, ToolbarButtonProps } from '../../components/plate-ui/toolbar';
import { OdinThumbnailImage } from '@homebase-id/ui-lib';
import { insertImage, TImageElement } from './createImagePlugin';
import { PlateRenderElementProps, useEditorRef, useEventPlateId } from '@udecode/plate-core/react';
import { useMediaOptionsContext } from './context/useMediaOptionsContext';
import { useBlockSelected } from '@udecode/plate-selection/react';

export interface MediaOptions {
  odinId?: string;
  mediaDrive: TargetDrive;
  fileId: string;
  globalTransitId?: string;
  pendingUploadFiles?: NewMediaFile[];
  onAppend: (file: Blob) => Promise<{ fileId: string; fileKey: string } | null>;
  onRemove: (payload: { fileId: string; fileKey: string }) => Promise<unknown | null>;
}

type ImageToolbarButtonProps = ToolbarButtonProps;

export const ImageToolbarButton = ({ ...props }: ImageToolbarButtonProps) => {
  const [isActive, setIsActive] = useState(false);
  const editor = useEditorRef(useEventPlateId());
  const mediaOptions = useMediaOptionsContext();

  if (!mediaOptions) return null;

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
          if (image && mediaOptions?.onAppend) {
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

export const ImageElementBlock = <N extends TImageElement = TImageElement>(
  props: PlateRenderElementProps<N>
) => {
  const isBlockSelected = useBlockSelected();
  const [isActive, setIsActive] = useState(false);
  const { attributes, children, nodeProps, element } = props;
  const odinClient = useOdinClientContext();

  const editor = useEditorRef(useEventPlateId());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const path = ReactEditor.findPath(editor as any, element as any);

  const options = useMediaOptionsContext();

  const doRemove = async () => {
    if (await options?.onRemove({ fileId: options.fileId, fileKey: element.fileKey })) {
      setTimeout(() => {
        editor.tf.removeNodes({ at: path });
      }, 10);
    }
  };

  const pendingUrl = useMemo(() => {
    if (!options) return undefined;
    const pendingUpload = options.pendingUploadFiles?.find((file) => file.key === element.fileKey);
    return pendingUpload ? URL.createObjectURL(pendingUpload.file) : undefined;
  }, [options]);

  if (!options || !options.mediaDrive) return <>{children}</>;

  return (
    <>
      <div
        {...attributes}
        {...nodeProps}
        className={`relative aspect-square w-full max-w-lg bg-slate-50 dark:bg-slate-800 ${isBlockSelected ? 'bg-primary/20' : ''}`}
        data-file-id={options.fileId}
        data-file-key={element.fileKey}
        contentEditable={false}
      >
        {children}
        <div className="absolute inset-4 mr-auto max-w-lg flex-grow">
          {pendingUrl ? (
            <img src={pendingUrl} className="absolute inset-0 h-full w-full object-contain" />
          ) : (
            <OdinThumbnailImage
              odinId={options.odinId}
              odinClient={odinClient}
              fileId={options.fileId}
              globalTransitId={options.globalTransitId}
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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            doRemove();
          }}
          className="absolute bottom-3 right-3 z-20 rounded-md bg-red-500 p-2 text-white hover:bg-red-600"
        >
          <Trash className="h-5 w-5" />
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
