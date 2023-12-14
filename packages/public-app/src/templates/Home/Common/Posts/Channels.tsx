import { useChannels } from '@youfoundation/common-app';
import { useAuth } from '../../../../hooks/auth/useAuth';
import ChannelTeaser from '../ChannelTeaser/ChannelTeaser';

const Channels = ({ className }: { className?: string }) => {
  const { isOwner, isAuthenticated } = useAuth();
  const { data: channels } = useChannels({ isAuthenticated, isOwner });

  return channels?.length ? (
    <div className={className}>
      <div className="-mx-2 flex max-w-7xl flex-col lg:flex-row xl:-mx-4">
        <div className="px-2 py-2 lg:w-2/3 xl:px-4">
          <div className="-m-2 flex flex-row flex-wrap">
            {channels.map((channel) => {
              return (
                <ChannelTeaser
                  key={channel.fileMetadata.appData.uniqueId}
                  channel={channel}
                  className={'w-full p-2 md:w-1/2'}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  ) : null;
};
export default Channels;
