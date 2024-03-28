import { useChannel } from '@youfoundation/common-app';
import { BlogConfig } from '@youfoundation/js-lib/public';
import { useEffect } from 'react';

export const useAutofixDefaultConfig = () => {
  const { data: publicChannel, isFetched } = useChannel({
    channelId: BlogConfig.PublicChannelId,
  }).fetch;
  const { mutateAsync: saveChannel } = useChannel({ channelId: BlogConfig.PublicChannelId }).save;

  useEffect(() => {
    if (isFetched && !publicChannel) {
      console.warn('[Missing Public Channel], attempting to create');
      saveChannel(BlogConfig.PublicChannelNewDsr);
    }
  }, [isFetched]);
};
