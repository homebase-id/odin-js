import { useParams, useMatch, Link } from 'react-router-dom';

import { useEffect, useState } from 'react';
import {
  ActionButton,
  ConnectionImage,
  ConnectionName,
  t,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import { HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { tryJsonParse } from '@homebase-id/js-lib/helpers';
import { useCommunity } from '../../hooks/community/useCommunity';
import {
  ChannelWithRecentMessage,
  useCommunityChannelsWithRecentMessages,
} from '../../hooks/community/channels/useCommunityChannelsWithRecentMessages';
import { usecommunityMetadata } from '../../hooks/community/useCommunityMetadata';
import { CommunityMetadata } from '../../providers/CommunityMetadataProvider';
import {
  RadioTower,
  Chevron,
  Pin,
  Grid,
  ArrowDown,
  ChevronDown,
} from '@homebase-id/common-app/icons';
import { COMMUNITY_ROOT } from './CommunityHome';
import { CommunityInfoDialog } from '../../components/Community/CommunityInfoDialog';

const maxChannels = 7;
export const CommunityChannelNav = () => {
  const { communityKey } = useParams();
  const [isCommunityInfoDialogOpen, setIsCommunityInfoDialogOpen] = useState(false);
  const { data: community, isLoading } = useCommunity({ communityId: communityKey }).fetch;
  const { data: metadata } = usecommunityMetadata({ communityId: communityKey }).single;

  const communityId = community?.fileMetadata.appData.uniqueId;
  const recipients = community?.fileMetadata.appData.content?.recipients;

  const isActive = !!useMatch({ path: `${COMMUNITY_ROOT}/${communityId}` });

  const { data: communityChannels } = useCommunityChannelsWithRecentMessages({ communityId }).fetch;

  const pinnedChannels = communityChannels?.filter(
    (channel) =>
      channel.fileMetadata.appData.uniqueId &&
      metadata?.fileMetadata.appData.content.pinnedChannels?.includes(
        channel.fileMetadata.appData.uniqueId
      )
  );
  const unpinnedChannels = communityChannels?.filter(
    (channel) => !pinnedChannels?.includes(channel)
  );

  const [isExpanded, setIsExpanded] = useState(false);
  if (!communityId || isLoading || !community) return null;

  return (
    <>
      <div
        className={`fixed ${isActive ? 'translate-x-full' : 'translate-x-0'} -left-full h-[100dvh] w-full bg-page-background transition-transform lg:relative lg:left-0 lg:max-w-[17rem] lg:translate-x-0 lg:border-r lg:shadow-inner`}
      >
        <div className="absolute inset-0 flex flex-col gap-5 overflow-auto px-2 py-5 md:pl-[calc(env(safe-area-inset-left)+4.3rem+0.5rem)] lg:pl-2">
          <div className="flex flex-row items-center">
            <Link className="-ml-2 p-2 lg:hidden" type="mute" to={`${COMMUNITY_ROOT}`}>
              <Grid className="h-5 w-5" />
            </Link>

            <button
              className="flex flex-row items-center gap-2 text-xl font-semibold"
              onClick={() => setIsCommunityInfoDialogOpen(true)}
            >
              {community.fileMetadata.appData.content?.title}
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <AllItem communityId={communityId} />
          <div className="flex flex-col gap-1">
            <h2 className="px-1">{t('Channels')}</h2>

            {pinnedChannels?.map((channel) => (
              <ChannelItem
                communityId={communityId}
                channel={channel}
                key={channel.fileId || channel.fileMetadata.appData.uniqueId}
              />
            ))}

            {unpinnedChannels
              ?.slice(0, isExpanded ? undefined : maxChannels - (pinnedChannels?.length || 0))
              .map((channel) => (
                <ChannelItem
                  communityId={communityId}
                  channel={channel}
                  key={channel.fileId || channel.fileMetadata.appData.uniqueId}
                />
              ))}

            {communityChannels?.length && communityChannels?.length > 7 ? (
              <ActionButton
                type="mute"
                size="none"
                className="text-sm opacity-50 hover:opacity-100"
                onClick={() => setIsExpanded((val) => !val)}
              >
                {isExpanded ? t('See less') : t('See more')}
                <Chevron
                  className={`ml-2 h-3 w-3 transition-transform ${isExpanded ? '-rotate-90' : 'rotate-90'}`}
                />
              </ActionButton>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="px-1">{t('Direct messages')}</h2>
            {recipients?.map((recipient) => (
              <DirectMessageItem communityId={communityId} recipient={recipient} key={recipient} />
            ))}
          </div>
        </div>
      </div>
      {isCommunityInfoDialogOpen ? (
        <CommunityInfoDialog onClose={() => setIsCommunityInfoDialogOpen(false)} />
      ) : null}
    </>
  );
};

const AllItem = ({ communityId }: { communityId: string }) => {
  const href = `${COMMUNITY_ROOT}/${communityId}/all`;
  const isActive = !!useMatch({ path: href, end: true });

  return (
    <Link
      to={`${COMMUNITY_ROOT}/${communityId}/all`}
      className={`flex flex-row items-center gap-2 rounded-md px-2 py-1 ${isActive ? 'bg-primary/100 text-white' : 'hover:bg-primary/10'}`}
    >
      <RadioTower className="h-5 w-5" /> {t('Activity')}
    </Link>
  );
};

const VISITS_STORAGE_KEY = 'community-sidebar-visited';
const ChannelItem = ({
  communityId,
  channel,
}: {
  communityId: string;
  channel: ChannelWithRecentMessage;
}) => {
  const identity = useDotYouClientContext().getIdentity();
  const channelId = channel.fileMetadata.appData.uniqueId;
  const href = `${COMMUNITY_ROOT}/${communityId}/${channelId}`;
  const isActive = !!useMatch({ path: href, end: false });

  const vists = tryJsonParse<string[]>(sessionStorage.getItem(VISITS_STORAGE_KEY) || '[]') || [];
  const isVisited = channelId && vists.includes(channelId);

  useEffect(() => {
    if (isActive) {
      if (!isVisited) {
        sessionStorage.setItem(
          VISITS_STORAGE_KEY,
          JSON.stringify(Array.from(new Set([...vists, channelId])))
        );
      }
    }
  }, [isActive]);

  const {
    single: { data: metadata },
    update: { mutate: updateMetadata },
  } = usecommunityMetadata({ communityId });

  const isPinned =
    channelId && metadata?.fileMetadata.appData.content?.pinnedChannels?.includes(channelId);

  const hasUnreadMessages =
    channelId &&
    metadata &&
    channel.lastMessage?.fileMetadata.created &&
    (metadata?.fileMetadata.appData.content?.channelLastReadTime[channelId] || 0) <
      channel.lastMessage?.fileMetadata.created &&
    channel.lastMessage.fileMetadata.senderOdinId !== identity;

  return (
    <Link
      to={`${COMMUNITY_ROOT}/${communityId}/${channelId}`}
      className={`group flex flex-row items-center gap-1 rounded-md px-2 py-1 ${isActive ? 'bg-primary/100 text-white' : `hover:bg-primary/10 ${isVisited ? 'text-purple-600' : ''}`} ${hasUnreadMessages ? 'font-bold' : ''}`}
    >
      # {channel.fileMetadata.appData.content?.title?.toLowerCase()}
      <button
        className={`-m-1 ml-auto rounded-sm p-1 ${isPinned ? '' : 'opacity-0 transition-opacity group-hover:opacity-100'}`}
        onClick={() => {
          if (!metadata || !channelId) return;
          let newPins: string[] = [];
          if (isPinned) {
            newPins =
              metadata?.fileMetadata.appData.content?.pinnedChannels?.filter(
                (pin) => pin !== channelId
              ) || [];
          } else {
            newPins = [
              ...(metadata?.fileMetadata.appData.content?.pinnedChannels || []),
              channelId,
            ];
          }

          const newMeta: NewHomebaseFile<CommunityMetadata> | HomebaseFile<CommunityMetadata> = {
            ...metadata,
          };
          newMeta.fileMetadata.appData.content.pinnedChannels = newPins;
          updateMetadata({ metadata: newMeta });
        }}
      >
        <Pin
          className={`hidden h-5 w-5 flex-shrink-0 transition-opacity md:block ${
            isPinned ? 'opacity-100 hover:opacity-60' : `opacity-60 hover:opacity-100`
          }`}
        />
      </button>
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
  const href = `${COMMUNITY_ROOT}/${communityId}/direct/${recipient}`;
  const isActive = !!useMatch({ path: href });

  return (
    <Link
      to={href}
      className={`flex flex-row items-center gap-1 rounded-md px-2 py-1 ${isActive ? 'bg-primary/100 text-white' : 'hover:bg-primary/10'}`}
    >
      <ConnectionImage odinId={recipient} size="xxs" />
      <ConnectionName odinId={recipient} />
    </Link>
  );
};
