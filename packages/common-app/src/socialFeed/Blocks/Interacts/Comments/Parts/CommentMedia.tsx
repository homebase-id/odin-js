import { DEFAULT_PAYLOAD_KEY, TargetDrive } from '@youfoundation/js-lib/core';
import { useCommentMedia } from '../../../../../hooks';
import { t } from '../../../../../helpers';

export const CommentMedia = ({
  postAuthorOdinId,
  targetDrive,
  fileId,
}: {
  postAuthorOdinId?: string;
  targetDrive?: TargetDrive;
  fileId?: string;
}) => {
  // console.log({ odinId: postAuthorOdinId, targetDrive, fileId });
  const { data: imageUrl } = useCommentMedia({
    odinId: postAuthorOdinId,
    targetDrive,
    fileId,
    fileKey: DEFAULT_PAYLOAD_KEY,
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
