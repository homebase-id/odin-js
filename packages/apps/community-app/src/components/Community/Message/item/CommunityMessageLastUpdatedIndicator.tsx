import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';
import { formatToTimeAgoWithRelativeDetail } from '@homebase-id/common-app';

export const CommunityMessageLastUpdatedIndicator = ({
  msg,
}: {
  msg: HomebaseFile<CommunityMessage>;
}) => {
  const created = msg.fileMetadata.created;
  const lastUpdated = msg.fileMetadata.updated;
  if (created === lastUpdated) return null;
  return (
    <div className="text-xs font-medium text-gray-500">
      {'· '} Last updated {formatToTimeAgoWithRelativeDetail(new Date(lastUpdated))}
    </div>
  );
};
