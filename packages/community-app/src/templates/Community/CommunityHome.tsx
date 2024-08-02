import { useParams, useMatch, Link, useNavigate } from 'react-router-dom';

import { ReactNode, useEffect, useState } from 'react';
import {
  ActionButton,
  ActionLink,
  Chevron,
  ChevronLeft,
  COMMUNITY_APP_ID,
  ConnectionImage,
  ConnectionName,
  ErrorBoundary,
  ExtendPermissionDialog,
  getOdinIdColor,
  Pin,
  Plus,
  RadioTower,
  Sidenav,
  t,
  useRemoveNotifications,
} from '@youfoundation/common-app';
import { drives, permissions } from '../../hooks/auth/useAuth';
import { Helmet } from 'react-helmet-async';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { HomebaseFile, NewHomebaseFile } from '@youfoundation/js-lib/core';
import { stringGuidsEqual, tryJsonParse } from '@youfoundation/js-lib/helpers';
import { useCommunities } from '../../hooks/community/useCommunities';
import { NewCommunity } from './CommunityNew';
import { useCommunity } from '../../hooks/community/useCommunity';
import { useLiveCommunityProcessor } from '../../hooks/community/useLiveCommunityProcessor';
import {
  ChannelWithRecentMessage,
  useCommunityChannelsWithRecentMessages,
} from '../../hooks/community/channels/useCommunityChannelsWithRecentMessages';
import { usecommunityMetadata } from '../../hooks/community/useCommunityMetadata';
import { CommunityMetadata } from '../../providers/CommunityMetadataProvider';

export const COMMUNITY_ROOT = '/apps/community';

export const CommunityHome = ({ children }: { children?: ReactNode }) => {
  const newCommunity = useMatch({ path: `${COMMUNITY_ROOT}/new` });
  const { communityKey } = useParams();
  const isCreateNew = !!newCommunity;

  useLiveCommunityProcessor(communityKey);
  useRemoveNotifications({ appId: COMMUNITY_APP_ID });

  const { data: communities } = useCommunities().all;
  const navigate = useNavigate();
  useEffect(() => {
    if (!communities) return;
    if (communityKey || newCommunity) return;
    if (window.innerWidth <= 1024) return;
    navigate(`${COMMUNITY_ROOT}/${communities[0].fileMetadata.appData.uniqueId}`);
  }, [communityKey, communities]);

  return (
    <>
      <Helmet>
        <title>Homebase | Community</title>
      </Helmet>

      <ExtendPermissionDialog
        appName={t('Homebase Community')}
        appId={COMMUNITY_APP_ID}
        drives={drives}
        permissions={permissions}
      />
      <div className={`flex h-[100dvh] w-full flex-row overflow-hidden`}>
        <CommunitySideNav />
        {isCreateNew ? (
          <NewCommunity />
        ) : (
          <>
            <CommunitySidebar />
            {children ? <>{children}</> : null}
          </>
        )}
      </div>
    </>
  );
};

const CommunitySideNav = () => {
  const { communityKey } = useParams();

  const rootChatMatch = useMatch({ path: COMMUNITY_ROOT });
  const isRoot = !!rootChatMatch;

  const isActive = isRoot;

  return (
    <>
      <Sidenav disablePinning={true} hideMobileDrawer={!isRoot} />
      <div
        className={`${isActive ? 'translate-x-full' : 'translate-x-0'} fixed bottom-0 left-[-100%] top-0 flex h-[100dvh] w-full flex-shrink-0 flex-col bg-page-background transition-transform lg:relative lg:left-0 lg:max-w-[4rem] lg:translate-x-0 `}
      >
        <ErrorBoundary>
          <CommunitiesSidebar activeCommunityId={communityKey} />
        </ErrorBoundary>
      </div>
    </>
  );
};

export const CommunitiesSidebar = ({
  activeCommunityId,
}: {
  activeCommunityId: string | undefined;
}) => {
  const { data: communities } = useCommunities().all;

  return (
    <ErrorBoundary>
      <div className="absolute inset-0 flex flex-grow flex-row flex-wrap overflow-auto md:pl-[calc(env(safe-area-inset-left)+4.3rem)] lg:flex-col lg:items-center lg:pl-0">
        <div className="px-4 pb-2 pt-4">
          <RadioTower className="h-7 w-7" />
        </div>
        <CommunitiesList
          communities={
            communities?.filter(
              (community) =>
                community.fileMetadata.appData.archivalStatus !== 2 ||
                community.fileMetadata.appData.uniqueId === activeCommunityId
            ) || []
          }
          activeCommunityId={activeCommunityId}
        />
      </div>
    </ErrorBoundary>
  );
};

const CommunitiesList = ({
  communities,
  activeCommunityId,
}: {
  communities: HomebaseFile<CommunityDefinition>[];
  activeCommunityId: string | undefined;
}) => {
  const newHref = `${COMMUNITY_ROOT}/new`;
  const newCommunity = useMatch({ path: newHref });
  const isCreateNew = !!newCommunity;

  return (
    <>
      {communities?.map((conversation) => (
        <CommunityListItem
          key={conversation.fileId}
          community={conversation}
          isActive={stringGuidsEqual(activeCommunityId, conversation.fileMetadata.appData.uniqueId)}
        />
      ))}

      <div className={`px-2 py-2 ${isCreateNew ? 'bg-primary/20' : ''}`}>
        <ActionLink
          href={newHref}
          type={communities?.length ? 'secondary' : 'primary'}
          size={'none'}
          className={`flex aspect-square w-full items-center justify-center rounded-2xl p-[0.606rem] hover:shadow-md`}
        >
          <Plus className="h-6 w-6" />
        </ActionLink>
      </div>
    </>
  );
};

const CommunityListItem = ({
  community,
  isActive,
}: {
  community: HomebaseFile<CommunityDefinition>;
  isActive: boolean;
}) => {
  return (
    <div className={`px-2 py-2 ${isActive ? 'bg-primary/20' : ''}`}>
      <ActionLink
        href={`${COMMUNITY_ROOT}/${community.fileMetadata.appData.uniqueId}`}
        className={`aspect-square w-full rounded-2xl p-4 uppercase hover:shadow-md`}
        style={{
          backgroundColor: getOdinIdColor(community.fileMetadata.appData.content.title).darkTheme,
        }}
      >
        {community.fileMetadata.appData.content.title.slice(0, 2)}
      </ActionLink>
    </div>
  );
};

const maxChannels = 7;
const CommunitySidebar = () => {
  const { communityKey } = useParams();
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
    <div
      className={`fixed ${isActive ? 'translate-x-full' : 'translate-x-0'} -left-full h-[100dvh] w-full bg-page-background transition-transform lg:relative lg:left-0 lg:max-w-[17rem] lg:translate-x-0 lg:border-r lg:shadow-inner`}
    >
      <div className="absolute inset-0 flex flex-col gap-5 overflow-auto px-2 py-5 md:pl-[calc(env(safe-area-inset-left)+4.3rem+0.5rem)] lg:pl-2">
        <div className="flex flex-row items-center">
          <ActionLink className="lg:hidden" type="mute" href={`${COMMUNITY_ROOT}`}>
            <ChevronLeft className="h-5 w-5" />
          </ActionLink>
          <p className="text-xl font-semibold">{community.fileMetadata.appData.content?.title}</p>
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
    !!channel.lastMessage.fileMetadata.senderOdinId;

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
