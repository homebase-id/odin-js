import { TargetDrive } from '@youfoundation/js-lib/core';
import { useDotYouClient } from '../../../../../hooks';
import { useMemo } from 'react';
import { OdinImage } from '@youfoundation/ui-lib';

export const CommentMedia = ({
  postAuthorOdinId,
  targetDrive,
  fileId,
  fileKey,
  lastModified,
}: {
  postAuthorOdinId?: string;
  targetDrive?: TargetDrive;
  fileId?: string;
  fileKey?: string;
  lastModified?: number;
}) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  if (!targetDrive) return null;
  return (
    <div className="max-w-[250px] mr-auto">
      <OdinImage
        odinId={postAuthorOdinId}
        dotYouClient={dotYouClient}
        fileId={fileId}
        targetDrive={targetDrive}
        fileKey={fileKey}
        lastModified={lastModified}
        className="my-1"
        maxWidth="250px"
        systemFileType="Comment"
        fit="contain"
      />
    </div>
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
