import { PostComposer } from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { ChannelDefinition } from '@homebase-id/js-lib/public';
import { useCheckWriteAccessOnChannel } from './useCheckWriteAccessOnChannel';

export const PublicPostComposer = ({
  activeChannel,
}: {
  activeChannel: HomebaseFile<ChannelDefinition>;
}) => {
  const hasWriteAccess = useCheckWriteAccessOnChannel({ activeChannel });
  if (!hasWriteAccess) return null;

  return (
    <div className="mb-8 max-w-xl">
      <PostComposer
        forcedChannel={activeChannel || undefined}
        className="mb-2 w-full rounded-md border-gray-200 border-opacity-60 bg-background p-4 shadow-sm dark:border-gray-800 lg:border"
      />
    </div>
  );
};
