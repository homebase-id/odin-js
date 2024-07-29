import { useChannel } from '@youfoundation/common-app';
import { useManageChannel } from '@youfoundation/common-app/src/hooks/socialFeed/channels/useManageChannel';
import { BlogConfig } from '@youfoundation/js-lib/public';
import { useEffect } from 'react';

const useFixMissingPublicChannel = () => {
  const { data: publicChannel, isFetched } = useChannel({
    channelKey: BlogConfig.PublicChannelId,
  }).fetch;
  const { mutateAsync: saveChannel } = useManageChannel().save;

  useEffect(() => {
    if (isFetched) {
      if (!publicChannel) {
        console.warn('[Missing Public Channel], attempting to create');
        saveChannel(BlogConfig.PublicChannelNewDsr);
      } else if (publicChannel.fileMetadata.appData.content.name === 'Public Posts') {
        console.warn('[Old Public Channel], renaming public channel');
        publicChannel.fileMetadata.appData.content.name = 'Main';
        publicChannel.fileMetadata.appData.content.slug = BlogConfig.PublicChannelSlug;
        saveChannel(publicChannel);
      }
    }
  }, [isFetched]);
};

export const useAutofixDefaultConfig = () => {
  useFixMissingPublicChannel();
};
