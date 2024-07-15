import { HomebaseFile } from '@youfoundation/js-lib/core';
import { useCommunity } from '../../hooks/community/useCommunity';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { ConnectionImage, ConnectionName, t } from '@youfoundation/common-app';
import { COMMUNITY_ROOT } from './CommunityHome';
import { Link, useMatch } from 'react-router-dom';
import { useCommunityChannels } from '../../hooks/community/channels/useCommunityChannels';
import { CommunityChannel } from '../../providers/CommunityProvider';

export const CommunityDetail = ({ communityId }: { communityId: string | undefined }) => {
  const { data: community, isLoading, isFetched } = useCommunity({ communityId }).fetch;

  if (!communityId || isLoading || (!community && isFetched))
    return (
      <div className="flex h-full flex-grow flex-col items-center justify-center">
        <p className="text-4xl">Homebase Community</p>
      </div>
    );

  return (
    <div>
      <CommunitySidebar community={community || undefined} />
    </div>
  );
};

const CommunitySidebar = ({ community }: { community?: HomebaseFile<CommunityDefinition> }) => {
  const communityId = community?.fileMetadata.appData.uniqueId;
  const recipients = community?.fileMetadata.appData.content?.recipients;

  const isActive = !!useMatch({ path: `${COMMUNITY_ROOT}/${communityId}` });

  const { data: communityChannels } = useCommunityChannels({ communityId }).fetch;

  if (!community || !communityId) {
    return null;
  }

  return (
    <div
      className={`fixed ${isActive ? 'translate-x-full' : 'translate-x-0'} -left-full h-[100dvh] w-full bg-page-background transition-transform lg:relative lg:left-0 lg:max-w-xs lg:translate-x-0 lg:border-r lg:shadow-inner`}
    >
      <div className="absolute inset-0 flex flex-col gap-5 overflow-auto px-2 py-5">
        <p className="text-xl font-semibold">{community.fileMetadata.appData.content?.title}</p>

        <div className="flex flex-col gap-1">
          <h2 className="px-1">{t('Channels')}</h2>
          {communityChannels?.map((channel) => (
            <ChannelItem communityId={communityId} channel={channel} key={channel.fileId} />
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="px-1">{t('Direct messages')}</h2>
          {recipients?.map((recipient) => (
            <DirectMessageItem communityId={communityId} recipient={recipient} key={recipient} />
          ))}
        </div>
      </div>
    </div>
  );
};

const ChannelItem = ({
  communityId,
  channel,
}: {
  communityId: string;
  channel: HomebaseFile<CommunityChannel>;
}) => {
  const channelId = channel.fileMetadata.appData.uniqueId;
  const href = `${COMMUNITY_ROOT}/${communityId}/${channelId}`;
  const isActive = !!useMatch({ path: href });

  return (
    <Link
      to={`${COMMUNITY_ROOT}/${communityId}/${channelId}`}
      className={`flex flex-row items-center gap-1 rounded-md px-2 py-1 ${isActive ? 'bg-primary/100 text-white' : 'hover:bg-primary/10'}`}
    >
      # {channel.fileMetadata.appData.content?.title}
    </Link>
  );
};

const DirectMessageItem = ({
  communityId,
  recipient,
}: {
  communityId: string;
  recipient: string;
}) => {
  const href = `${COMMUNITY_ROOT}/${communityId}/${recipient}`;
  const isActive = !!useMatch({ path: href });

  return (
    <Link
      to={`${COMMUNITY_ROOT}/${communityId}/${recipient}`}
      className={`flex flex-row items-center gap-1 rounded-md px-2 py-1 ${isActive ? 'bg-primary/100 text-white' : 'hover:bg-primary/10'}`}
    >
      <ConnectionImage odinId={recipient} size="xxs" />
      <ConnectionName odinId={recipient} />
    </Link>
  );
};
