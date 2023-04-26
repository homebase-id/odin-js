import useChannels from '../../../../hooks/blog/useChannels';
import ChannelTeaser from '../ChannelTeaser/ChannelTeaser';

const Channels = ({ className }: { className?: string }) => {
  const { data: channels } = useChannels();
  return channels?.length ? (
    <div className={className}>
      <div className="-mx-2 flex max-w-6xl flex-col lg:flex-row xl:-mx-4">
        <div className="py-2 px-2 lg:w-2/3 xl:px-4">
          <div className="-m-2 flex flex-row flex-wrap">
            {channels.map((channel) => {
              return (
                <ChannelTeaser
                  key={channel.channelId}
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
