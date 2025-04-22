import { EmbeddedThumb, TargetDrive } from '@homebase-id/js-lib/core';
import { useMemo, useState } from 'react';
import { OdinImage } from '@homebase-id/ui-lib';
import { ImageLightbox } from '../../../../../dialogs/ImageLightbox/ImageLightbox';
import { useOdinClientContext } from '../../../../../hooks/auth/useOdinClientContext';

export const CommentMedia = ({
  postAuthorOdinId,
  targetDrive,
  fileId,
  fileKey,
  lastModified,
  previewThumbnail,
}: {
  postAuthorOdinId?: string;
  targetDrive?: TargetDrive;
  fileId?: string;
  fileKey?: string;
  lastModified?: number;
  previewThumbnail?: EmbeddedThumb;
}) => {
  const odinClient = useOdinClientContext();
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);

  if (!targetDrive) return null;
  return (
    <>
      <div className="max-w-[250px] mr-auto">
        <a onClick={() => setIsImageLightboxOpen(true)} className="cursor-pointer">
          <OdinImage
            odinId={postAuthorOdinId}
            odinClient={odinClient}
            fileId={fileId}
            targetDrive={targetDrive}
            fileKey={fileKey}
            lastModified={lastModified}
            previewThumbnail={previewThumbnail}
            className="my-1"
            maxWidth="250px"
            systemFileType="Comment"
            fit="contain"
          />
        </a>
      </div>
      {isImageLightboxOpen && fileId && fileKey ? (
        <ImageLightbox
          targetDrive={targetDrive}
          fileId={fileId}
          fileKey={fileKey}
          lastModified={lastModified}
          previewThumbnail={previewThumbnail}
          systemFileType="Comment"
          onClose={() => setIsImageLightboxOpen(false)}
        />
      ) : null}
    </>
  );
};

export const CommentMediaPreview = ({ attachment: file }: { attachment: File | undefined }) => {
  const imageUrl = useMemo(() => file && URL.createObjectURL(file), [file]);
  if (!file) return null;

  return (
    <>
      <img src={imageUrl} className="my-1 max-w-[250px]" />
    </>
  );
};
