import { TargetDrive } from '@youfoundation/js-lib/core';
import { useDotYouClient } from '../../../../../hooks';
import { useMemo } from 'react';
import { OdinImage } from '@youfoundation/ui-lib';

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
  const dotYouClient = useDotYouClient().getDotYouClient();

  if (!targetDrive) return null;
  return (
    <OdinImage
      odinId={postAuthorOdinId}
      dotYouClient={dotYouClient}
      fileId={fileId}
      targetDrive={targetDrive}
      fileKey={fileKey}
      className="my-1 max-w-[250px]"
      systemFileType="Comment"
    />
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
