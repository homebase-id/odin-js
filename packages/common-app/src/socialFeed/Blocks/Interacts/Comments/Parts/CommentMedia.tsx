import { TargetDrive } from '@youfoundation/js-lib/core';
import { useCommentMedia } from '../../../../../hooks';
import { t } from '../../../../../helpers';
import { useMemo } from 'react';

export const CommentMedia = ({
  postAuthorOdinId,
  targetDrive,
  fileId,
  fileKey,
}: {
  postAuthorOdinId?: string;
  targetDrive?: TargetDrive;
  fileId?: string;
  fileKey?: string;
}) => {
  const { data: imageUrl } = useCommentMedia({
    odinId: postAuthorOdinId,
    targetDrive,
    fileId,
    fileKey,
  }).fetch;

  if (!imageUrl?.length)
    return (
      <div className="text-foreground my-1 flex h-10 animate-pulse flex-row items-center justify-center bg-white text-sm text-opacity-50">
        {t('loading')}
      </div>
    );

  return (
    <>
      <img src={imageUrl} className="my-1" />
    </>
  );
};

export const CommentMediaPreview = ({ attachment: file }: { attachment: File }) => {
  const imageUrl = useMemo(() => URL.createObjectURL(file), [file]);

  return (
    <>
      <img src={imageUrl} className="my-1 max-w-[250px]" />
    </>
  );
};
