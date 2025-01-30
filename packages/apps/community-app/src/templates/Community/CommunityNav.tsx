import { useParams, useMatch, Link, useNavigate } from 'react-router-dom';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionButton,
  ActionGroup,
  COMMUNITY_ROOT_PATH,
  ConnectionImage,
  ConnectionName,
  ErrorBoundary,
  t,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import { HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { getNewXorId, isTouchDevice, tryJsonParse } from '@homebase-id/js-lib/helpers';
import { useCommunity } from '../../hooks/community/useCommunity';
import {
  ChannelWithRecentMessage,
  useCommunityChannelsWithRecentMessages,
} from '../../hooks/community/channels/useCommunityChannelsWithRecentMessages';
import { useCommunityMetadata } from '../../hooks/community/useCommunityMetadata';
import { CommunityMetadata } from '../../providers/CommunityMetadataProvider';
import {
  Chevron,
  Pin,
  Grid,
  ChevronDown,
  Bookmark,
  ChatBubble,
  RadioTower,
  Question,
  Plus,
  Pencil,
} from '@homebase-id/common-app/icons';
import { CommunityInfoDialog } from '../../components/Community/CommunityInfoDialog';
import { useConversationMetadata } from '@homebase-id/chat-app/src/hooks/chat/useConversationMetadata';
import { useChatMessages } from '@homebase-id/chat-app/src/hooks/chat/useChatMessages';
import { ChatMessage } from '@homebase-id/chat-app/src/providers/ChatProvider';
import { ConversationWithYourselfId } from '@homebase-id/chat-app/src/providers/ConversationProvider';
import { useCommunityMessages } from '../../hooks/community/messages/useCommunityMessages';
import { useHasUnreadThreads } from '../../hooks/community/threads/useCommunityThreads';
import { MyProfileStatus, ProfileStatus } from '../../components/Community/status/MyProfileStatus';
import { CreateOrUpdateChannelDialog } from '../../components/Community/channel/CreateOrUpdateChannelDialog';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';

const maxChannels = 7;
export const CommunityNav = memo(
  ({ isOnline, isHidden }: { isOnline: boolean; isHidden?: boolean }) => {
    const { odinKey, communityKey } = useParams();
    const [isCommunityInfoDialogOpen, setIsCommunityInfoDialogOpen] = useState(false);
    const { data: community, isLoading } = useCommunity({
      odinId: odinKey,
      communityId: communityKey,
    }).fetch;
    const { data: metadata } = useCommunityMetadata({
      odinId: odinKey,
      communityId: communityKey,
    }).single;

    const members = useMemo(() => community?.fileMetadata.appData.content?.members, [community]);
    const isRootPage = !!useMatch({ path: `${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}` });

    const { data: communityChannels } = useCommunityChannelsWithRecentMessages({
      odinId: odinKey,
      communityId: communityKey,
    }).fetch;

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

    const navigate = useNavigate();

    const [isExpanded, setIsExpanded] = useState(false);
    const [unreadCountsPerChannel, setUnreadCountsPerChannel] = useState<Record<string, number>>(
      {}
    );
    useEffect(() => {
      if ('setAppBadge' in navigator && unreadCountsPerChannel) {
        navigator.setAppBadge(Object.values(unreadCountsPerChannel).reduce((a, b) => a + b, 0));
      }
    }, [unreadCountsPerChannel]);

    const setUnreadCountCallback = useCallback((identifier: string, count: number) => {
      setUnreadCountsPerChannel((current) => ({
        ...current,
        [identifier]: count,
      }));
    }, []);

    if (!odinKey || !communityKey || isLoading || !community) return null;

    return (
      <>
        <div
          className={`${!isRootPage ? 'hidden' : ''} transition-all ${isHidden ? 'w-full lg:w-0 lg:overflow-hidden' : 'w-full'} relative h-[100dvh] flex-shrink-0 bg-page-background lg:block lg:max-w-[17rem] lg:border-r lg:shadow-inner`}
        >
          <div className="absolute inset-0 flex flex-col gap-5 overflow-auto px-2 py-5 lg:pl-2">
            <div className="flex flex-row items-center">
              <a
                className="-ml-2 p-2 lg:hidden"
                type="mute"
                href={COMMUNITY_ROOT_PATH}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(COMMUNITY_ROOT_PATH, {
                    state: { referrer: window.location.pathname },
                  });
                }}
              >
                <Grid className="h-5 w-5" />
              </a>

              <button
                className="flex flex-grow flex-row items-center gap-2 text-xl font-semibold"
                onClick={() => setIsCommunityInfoDialogOpen(true)}
              >
                <span
                  className={`h-3 w-3 rounded-full transition-colors ${
                    isOnline ? 'bg-green-400' : 'bg-red-400'
                  }`}
                  title={isOnline ? t('Connected') : t('Offline')}
                />
                {community.fileMetadata.appData.content?.title}
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <div className="flex w-full flex-col gap-1">
              <ThreadItem
                odinId={odinKey}
                communityId={communityKey}
                setUnreadCount={setUnreadCountCallback}
              />
              <ActivityItem odinId={odinKey} communityId={communityKey} />
              <LaterItem odinId={odinKey} communityId={communityKey} />
            </div>

            <div className="flex flex-col gap-1">
              <div className="group flex flex-row items-center justify-between px-1">
                <h2 className="font-semibold">{t('Channels')}</h2>
                <CreateNewChannelButton />
              </div>
              <ErrorBoundary>
                {pinnedChannels?.map((channel) => (
                  <ChannelItem
                    community={community}
                    channel={channel}
                    setUnreadCount={setUnreadCountCallback}
                    key={channel.fileId || channel.fileMetadata.appData.uniqueId}
                  />
                ))}
                {pinnedChannels?.length && unpinnedChannels?.length ? (
                  <hr className="my-1" />
                ) : null}

                {unpinnedChannels
                  ?.slice(0, isExpanded ? undefined : maxChannels - (pinnedChannels?.length || 0))
                  .map((channel) => (
                    <ChannelItem
                      community={community}
                      channel={channel}
                      setUnreadCount={setUnreadCountCallback}
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
              </ErrorBoundary>
            </div>

            <div className="flex w-full flex-col gap-1">
              <h2 className="px-1 font-semibold">{t('Direct messages')}</h2>
              <ErrorBoundary>
                {members?.map((recipient) => (
                  <DirectMessageItem
                    recipient={recipient}
                    key={recipient}
                    setUnreadCount={setUnreadCountCallback}
                  />
                ))}
              </ErrorBoundary>
            </div>
          </div>
        </div>
        {isCommunityInfoDialogOpen ? (
          <CommunityInfoDialog onClose={() => setIsCommunityInfoDialogOpen(false)} />
        ) : null}
      </>
    );
  }
);
CommunityNav.displayName = 'CommunityNav';

const ActivityItem = memo(({ odinId, communityId }: { odinId: string; communityId: string }) => {
  const href = `${COMMUNITY_ROOT_PATH}/${odinId}/${communityId}/activity`;
  const isActive = !!useMatch({ path: href, end: true });

  return (
    <Link
      to={href}
      className={`flex flex-row items-center gap-2 rounded-md px-2 py-1 ${isActive ? 'bg-primary/100 text-white' : `${!isTouchDevice() ? 'hover:bg-primary/10' : ''}`}`}
    >
      <RadioTower className="h-5 w-5" /> {t('Activity')}
    </Link>
  );
});
ActivityItem.displayName = 'ActivityItem';

const ThreadItem = memo(
  ({
    odinId,
    communityId,
    setUnreadCount,
  }: {
    odinId: string;
    communityId: string;
    setUnreadCount: (identifier: string, count: number) => void;
  }) => {
    const hasUnreadMessages = useHasUnreadThreads({ odinId, communityId });

    const href = `${COMMUNITY_ROOT_PATH}/${odinId}/${communityId}/threads`;
    const isActive = !!useMatch({ path: href, end: true });

    useEffect(() => setUnreadCount('threads', hasUnreadMessages ? 1 : 0), [hasUnreadMessages]);

    return (
      <Link
        to={href}
        className={`flex flex-row items-center gap-2 rounded-md px-2 py-1 ${isActive ? 'bg-primary/100 text-white' : `${!isTouchDevice() ? 'hover:bg-primary/10' : ''}`} ${hasUnreadMessages && !isActive ? 'font-bold' : ''}`}
      >
        <ChatBubble className="h-5 w-5" /> {t('Threads')}
        {hasUnreadMessages && !isActive ? (
          <span className="my-auto flex h-3 w-3 items-center justify-center rounded-full bg-current text-sm font-normal" />
        ) : null}
      </Link>
    );
  }
);
ThreadItem.displayName = 'ThreadItem';

const LaterItem = memo(({ odinId, communityId }: { odinId: string; communityId: string }) => {
  const href = `${COMMUNITY_ROOT_PATH}/${odinId}/${communityId}/later`;
  const isLaterActive = !!useMatch({ path: href, end: true });

  const pinsHref = `${COMMUNITY_ROOT_PATH}/${odinId}/${communityId}/pins`;
  const isPinsActive = !!useMatch({ path: pinsHref, end: true });

  return (
    <Link
      to={href}
      className={`flex flex-row items-center gap-2 rounded-md px-2 py-1 ${isLaterActive || isPinsActive ? 'bg-primary/100 text-white' : `${!isTouchDevice() ? 'hover:bg-primary/10' : ''}`}`}
    >
      <Bookmark className="h-5 w-5" /> {t('Later')}
    </Link>
  );
});
LaterItem.displayName = 'LaterItem';

const VISITS_STORAGE_KEY = 'community-sidebar-visited';
const ChannelItem = memo(
  ({
    community,
    channel,
    setUnreadCount,
  }: {
    community: HomebaseFile<CommunityDefinition>;
    channel: ChannelWithRecentMessage;
    setUnreadCount: (identifier: string, count: number) => void;
  }) => {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const { odinKey, communityKey } = useParams();

    const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
    const channelId = channel.fileMetadata.appData.uniqueId;
    const href = `${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/${channelId}`;
    const isActive = !!useMatch({ path: href, end: false });

    const vists = tryJsonParse<string[]>(sessionStorage.getItem(VISITS_STORAGE_KEY) || '[]') || [];
    const isVisited = channelId && vists.includes(channelId);

    useEffect(() => {
      if (isActive && !isVisited)
        sessionStorage.setItem(
          VISITS_STORAGE_KEY,
          JSON.stringify(Array.from(new Set([...vists, channelId])))
        );
    }, [isActive]);

    const {
      single: { data: metadata },
      update: { mutate: updateMetadata },
    } = useCommunityMetadata({ odinId: odinKey, communityId: communityKey });

    const isPinned = useMemo(
      () =>
        channelId && metadata?.fileMetadata.appData.content?.pinnedChannels?.includes(channelId),
      [metadata, channelId]
    );

    const { data: messages } = useCommunityMessages({
      odinId: odinKey,
      communityId: communityKey,
      channelId,
    }).all;

    const unreadMessagesCount = useMemo(() => {
      if (channel.lastMessage?.fileMetadata.senderOdinId === loggedOnIdentity) return 0;

      return (
        channelId &&
        metadata &&
        messages?.pages
          ?.flatMap((page) => page?.searchResults)
          ?.filter(
            (msg) =>
              msg &&
              (metadata?.fileMetadata.appData.content?.channelLastReadTime[channelId] || 0) <
                msg.fileMetadata.created &&
              msg.fileMetadata.senderOdinId !== loggedOnIdentity
          )?.length
      );
    }, [messages, metadata]);

    useEffect(
      () =>
        setUnreadCount(channel.fileMetadata.appData.uniqueId as string, unreadMessagesCount || 0),
      [unreadMessagesCount]
    );
    const hasUnreadMessages = !!unreadMessagesCount;

    const linkBackground = `${isActive ? 'bg-primary/100 text-white' : `${!isTouchDevice() ? 'hover:bg-primary/20' : ''}`}`;

    const togglePin = useCallback(() => {
      if (!metadata || !channelId) return;
      let newPins: string[] = [];
      if (isPinned) {
        newPins =
          metadata?.fileMetadata.appData.content?.pinnedChannels?.filter(
            (pin) => pin !== channelId
          ) || [];
      } else {
        newPins = [...(metadata?.fileMetadata.appData.content?.pinnedChannels || []), channelId];
      }

      const newMeta: NewHomebaseFile<CommunityMetadata> | HomebaseFile<CommunityMetadata> = {
        ...metadata,
      };
      newMeta.fileMetadata.appData.content.pinnedChannels = newPins;

      updateMetadata({ metadata: newMeta });
    }, [metadata, channelId, isPinned]);

    const toggleEdit = useCallback(() => setIsEditDialogOpen(true), []);
    const channelPath = `${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/${channelId}`;

    return (
      <>
        <Link
          to={channelPath}
          className={`group relative flex flex-row items-center gap-1 rounded-md py-[0.25rem] pl-2 pr-1 ${linkBackground} ${isVisited ? 'text-purple-700' : ''} ${hasUnreadMessages && !isActive ? 'font-semibold' : ''}`}
        >
          <p
            className={`flex-shrink overflow-hidden text-ellipsis whitespace-nowrap ${hasUnreadMessages && !isActive ? 'leading-tight' : 'leading-tight'}`}
          >
            # {channel.fileMetadata.appData.content?.title?.toLowerCase()}
          </p>
          <ActionGroup
            size="none"
            type="mute"
            className="absolute bottom-[0.1rem] right-[0.2rem] top-[0.1rem] my-auto hidden aspect-square flex-shrink-0 rounded-lg bg-background text-foreground opacity-0 group-hover:opacity-100 md:flex"
            options={[
              {
                label: isPinned ? 'Unpin' : 'Pin',
                icon: Pin,
                onClick: togglePin,
              },
              channel.fileMetadata.originalAuthor === loggedOnIdentity ||
              community.fileMetadata.originalAuthor === loggedOnIdentity
                ? {
                    label: 'Rename',
                    icon: Pencil,
                    onClick: toggleEdit,
                  }
                : undefined,
              {
                label: 'Channel info',
                icon: Question,
                href: `${channelPath}/info`,
              },
            ]}
            alwaysInPortal={true}
          >
            <span className="block p-1">
              <ChevronDown className="h-4 w-4" />
            </span>
          </ActionGroup>
          {unreadMessagesCount && !isActive ? (
            <span className="-my-1 ml-auto flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-current text-sm font-normal">
              <span
                className={isActive ? 'text-black dark:text-white' : 'text-white dark:text-black'}
              >
                {unreadMessagesCount}
              </span>
            </span>
          ) : null}
        </Link>
        {isEditDialogOpen ? (
          <CreateOrUpdateChannelDialog
            onClose={() => setIsEditDialogOpen(false)}
            defaultValue={channel}
          />
        ) : null}
      </>
    );
  }
);
ChannelItem.displayName = 'ChannelItem';

const DirectMessageItem = memo(
  ({
    recipient,
    setUnreadCount,
  }: {
    recipient: string;
    setUnreadCount: (identifier: string, count: number) => void;
  }) => {
    const { odinKey, communityKey } = useParams();
    const dotYouClient = useDotYouClientContext();
    const identity = dotYouClient.getHostIdentity();
    const href = `${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/direct/${recipient}`;
    const isActive = !!useMatch({ path: href });

    const [conversationId, setConversationId] = useState<string | undefined>();

    useEffect(() => {
      if (recipient === identity) setConversationId(ConversationWithYourselfId);
      else getNewXorId(identity, recipient).then((xorId) => setConversationId(xorId));
    }, [recipient]);

    const { data: conversationMetadata } = useConversationMetadata({ conversationId }).single;
    const { data: messages } = useChatMessages({ conversationId }).all;

    const unreadCount = useMemo(() => {
      const flatMessages = messages?.pages
        ?.flatMap((page) => page?.searchResults)
        ?.filter(Boolean) as HomebaseFile<ChatMessage>[];

      const lastMessage = flatMessages?.[0];
      const lastReadTime = conversationMetadata?.fileMetadata.appData.content.lastReadTime || 0;

      return conversationMetadata &&
        flatMessages &&
        lastMessage?.fileMetadata.senderOdinId &&
        lastMessage?.fileMetadata.senderOdinId !== identity
        ? flatMessages.filter(
            (msg) =>
              msg.fileMetadata.senderOdinId !== identity &&
              (msg.fileMetadata.transitCreated || msg.fileMetadata.created) > lastReadTime
          )?.length
        : 0;
    }, [messages, conversationMetadata]);

    useEffect(() => setUnreadCount(recipient, unreadCount || 0), [unreadCount]);
    const isYou = recipient === dotYouClient.getHostIdentity();

    return (
      <Link
        to={href}
        className={`flex flex-row gap-2 rounded-md px-2 py-[0.15rem] ${unreadCount ? 'font-bold' : ''} ${isActive ? 'bg-primary/100 text-white' : `${!isTouchDevice() ? 'hover:bg-primary/10' : ''}`}`}
      >
        <ConnectionImage odinId={recipient} size="xxs" className="flex-shrink-0" />
        <span className="my-auto flex w-20 flex-grow flex-row items-center">
          <p className="flex-shrink overflow-hidden text-ellipsis whitespace-nowrap leading-tight">
            <ConnectionName odinId={recipient} />
          </p>
          <span className="ml-1"></span>
          {isYou ? (
            <span className="text-sm leading-tight text-slate-400">{t('you')}</span>
          ) : (
            <ProfileStatus odinId={recipient} className="ml-1" />
          )}
          {unreadCount ? (
            <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm text-primary-contrast">
              {unreadCount}
            </span>
          ) : isYou ? (
            <MyProfileStatus className="ml-1" />
          ) : null}
        </span>
      </Link>
    );
  }
);
DirectMessageItem.displayName = 'DirectMessageItem';

const CreateNewChannelButton = memo(() => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <>
      {isCreateDialogOpen ? (
        <CreateOrUpdateChannelDialog onClose={() => setIsCreateDialogOpen(false)} />
      ) : null}
      <ActionButton
        size="none"
        type="mute"
        className="group-hover:opacity-100 md:opacity-0"
        onClick={() => setIsCreateDialogOpen(true)}
      >
        <Plus className="h-4 w-4" />
      </ActionButton>
    </>
  );
});
CreateNewChannelButton.displayName = 'CreateNewChannelButton';
