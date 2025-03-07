import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';
import { AuthorName, formatToTimeAgo, getOdinIdColor, t } from '@homebase-id/common-app';

export const CommunityMessageLastUpdatedIndicator = ({
  msg,
}: {
  msg: HomebaseFile<CommunityMessage>;
}) => {
  const created = msg.fileMetadata.created;
  const lastUpdated = msg.fileMetadata.updated;
  const lastUpdatedBy = msg.fileMetadata.appData.content.lastEditedBy;
  if (created === lastUpdated) return null;
  return (
    <div className="text-xs font-medium text-gray-500">
      {'· '} {formatToTimeAgo(new Date(lastUpdated))}
      {lastUpdatedBy && (
        <>
          {t(' by ')}
          <span
            className="font-semibold"
            style={{ color: getOdinIdColor(lastUpdatedBy).darkTheme }}
          >
            <AuthorName odinId={lastUpdatedBy} />
          </span>
        </>
      )}
    </div>
  );
};
