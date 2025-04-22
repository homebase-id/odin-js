import { useChannels, useOdinClientContext } from '@homebase-id/common-app';
import ChannelTeaser from '../ChannelTeaser/ChannelTeaser';

const Channels = ({ className }: { className?: string }) => {
  const odinClient = useOdinClientContext();
  const isOwner = odinClient.isOwner();
  const isAuthenticated = odinClient.isAuthenticated();

  const { data: channels } = useChannels({ isAuthenticated, isOwner });

  return channels?.length ? (
    <div className={className}>
      <div className="flex max-w-7xl flex-col gap-2 lg:flex-row xl:gap-4">
        <div className="lg:w-2/3">
          <div className="flex flex-row flex-wrap gap-2">
            {channels.map((channel) => {
              return (
                <ChannelTeaser
                  key={channel.fileMetadata.appData.uniqueId}
                  channel={channel}
                  className={'w-full md:w-1/2'}
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
