import { useParams, useMatch, Link, useNavigate } from 'react-router-dom';

import { useEffect, useMemo, useState } from 'react';
import {
  ActionButton,
  COMMUNITY_ROOT_PATH,
  ConnectionImage,
  ConnectionName,
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
  RadioTower,
  Chevron,
  Pin,
  Grid,
  ChevronDown,
  Bookmark,
} from '@homebase-id/common-app/icons';
import { CommunityInfoDialog } from '../../components/Community/CommunityInfoDialog';
import { useConversationMetadata } from '@homebase-id/chat-app/src/hooks/chat/useConversationMetadata';
import { useChatMessages } from '@homebase-id/chat-app/src/hooks/chat/useChatMessages';
import { ChatMessage } from '@homebase-id/chat-app/src/providers/ChatProvider';
import { ConversationWithYourselfId } from '@homebase-id/chat-app/src/providers/ConversationProvider';
import { useCommunityMessages } from '../../hooks/community/messages/useCommunityMessages';

const maxChannels = 7;
export const CommunityChannelNav = () => {
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

  const members = community?.fileMetadata.appData.content?.members;

  const isActive = !!useMatch({ path: `${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}` });

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
  if (!odinKey || !communityKey || isLoading || !community) return null;

  return (
    <>
      <div
        className={`fixed ${isActive ? 'translate-x-full' : 'translate-x-0'} -left-full h-[100dvh] w-full bg-page-background transition-transform lg:relative lg:left-0 lg:max-w-[17rem] lg:translate-x-0 lg:border-r lg:shadow-inner`}
      >
        <div className="absolute inset-0 flex flex-col gap-5 overflow-auto px-2 py-5 md:pl-[calc(env(safe-area-inset-left)+4.3rem+0.5rem)] lg:pl-2">
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
              className="flex flex-row items-center gap-2 text-xl font-semibold"
              onClick={() => setIsCommunityInfoDialogOpen(true)}
            >
              {community.fileMetadata.appData.content?.title}
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <AllItem odinId={odinKey} communityId={communityKey} />
            <LaterItem odinId={odinKey} communityId={communityKey} />
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="px-1">{t('Channels')}</h2>

            {pinnedChannels?.map((channel) => (
              <ChannelItem
                odinId={odinKey}
                communityId={communityKey}
                channel={channel}
                key={channel.fileId || channel.fileMetadata.appData.uniqueId}
              />
            ))}

            {unpinnedChannels
              ?.slice(0, isExpanded ? undefined : maxChannels - (pinnedChannels?.length || 0))
              .map((channel) => (
                <ChannelItem
                  odinId={odinKey}
                  communityId={communityKey}
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
            {members?.map((recipient) => (
              <DirectMessageItem
                odinId={odinKey}
                communityId={communityKey}
                recipient={recipient}
                key={recipient}
              />
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

const AllItem = ({ odinId, communityId }: { odinId: string; communityId: string }) => {
  const href = `${COMMUNITY_ROOT_PATH}/${odinId}/${communityId}/all`;
  const isActive = !!useMatch({ path: href, end: true });

  return (
    <Link
      to={href}
      className={`flex flex-row items-center gap-2 rounded-md px-2 py-1 ${isActive ? 'bg-primary/100 text-white' : `${!isTouchDevice() ? 'hover:bg-primary/10' : ''}`}`}
    >
      <RadioTower className="h-5 w-5" /> {t('Activity')}
    </Link>
  );
};

const LaterItem = ({ odinId, communityId }: { odinId: string; communityId: string }) => {
  const href = `${COMMUNITY_ROOT_PATH}/${odinId}/${communityId}/later`;
  const isActive = !!useMatch({ path: href, end: true });

  return (
    <Link
      to={href}
      className={`flex flex-row items-center gap-2 rounded-md px-2 py-1 ${isActive ? 'bg-primary/100 text-white' : `${!isTouchDevice() ? 'hover:bg-primary/10' : ''}`}`}
    >
      <Bookmark className="h-5 w-5" /> {t('Later')}
    </Link>
  );
};

const VISITS_STORAGE_KEY = 'community-sidebar-visited';
const ChannelItem = ({
  odinId,
  communityId,
  channel,
}: {
  odinId: string;
  communityId: string;
  channel: ChannelWithRecentMessage;
}) => {
  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
  const channelId = channel.fileMetadata.appData.uniqueId;
  const href = `${COMMUNITY_ROOT_PATH}/${odinId}/${communityId}/${channelId}`;
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
  } = useCommunityMetadata({ odinId, communityId });

  const isPinned =
    channelId && metadata?.fileMetadata.appData.content?.pinnedChannels?.includes(channelId);

  const { data: messages } = useCommunityMessages({ odinId, communityId, channelId }).all;

  const lastMessage = messages?.pages?.flatMap((page) => page?.searchResults)?.[0];

  const hasUnreadMessages =
    channelId &&
    metadata &&
    lastMessage?.fileMetadata.created &&
    (metadata?.fileMetadata.appData.content?.channelLastReadTime[channelId] || 0) <
      lastMessage?.fileMetadata.created &&
    lastMessage.fileMetadata.senderOdinId !== loggedOnIdentity;

  return (
    <Link
      to={`${COMMUNITY_ROOT_PATH}/${odinId}/${communityId}/${channelId}`}
      className={`group flex flex-row items-center gap-1 rounded-md px-2 py-[0.15rem] ${isActive ? 'bg-primary/100 text-white' : `${!isTouchDevice() ? 'hover:bg-primary/10' : ''} ${isVisited ? 'text-purple-700' : ''}`} ${hasUnreadMessages ? 'font-bold' : ''}`}
    >
      # {channel.fileMetadata.appData.content?.title?.toLowerCase()}
      <button
        className={`-m-1 ml-auto rounded-sm p-1 ${isPinned ? '' : `opacity-0 transition-opacity ${!isTouchDevice() ? 'group-hover:opacity-100' : ''}`}`}
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
          className={`hidden h-5 w-5 flex-shrink-0 transition-opacity lg:block ${
            isPinned ? 'opacity-100 hover:opacity-60' : `opacity-60 hover:opacity-100`
          }`}
        />
      </button>
      {hasUnreadMessages ? (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-current text-sm font-normal">
          <span className="text-white">
            {messages?.pages?.flatMap((page) => page?.searchResults)?.filter(Boolean)?.length}
          </span>
        </span>
      ) : null}
    </Link>
  );
};

const DirectMessageItem = ({
  odinId,
  communityId,
  recipient,
}: {
  odinId: string;
  communityId: string;
  recipient: string;
}) => {
  const dotYouClient = useDotYouClientContext();
  const identity = dotYouClient.getHostIdentity();
  const href = `${COMMUNITY_ROOT_PATH}/${odinId}/${communityId}/direct/${recipient}`;
  const isActive = !!useMatch({ path: href });

  const [conversationId, setConversationId] = useState<string | undefined>();

  useEffect(() => {
    if (recipient === identity) {
      setConversationId(ConversationWithYourselfId);
    } else {
      getNewXorId(identity as string, recipient).then((xorId) => setConversationId(xorId));
    }
  }, [recipient]);

  const { data: conversationMetadata } = useConversationMetadata({ conversationId }).single;
  const { data: messages } = useChatMessages({ conversationId }).all;
  const flatMessages = useMemo(
    () =>
      messages?.pages
        ?.flatMap((page) => page?.searchResults)
        ?.filter(Boolean) as HomebaseFile<ChatMessage>[],
    [messages]
  );
  const lastMessage = useMemo(() => flatMessages?.[0], [flatMessages]);

  const lastReadTime = conversationMetadata?.fileMetadata.appData.content.lastReadTime || 0;
  const unreadCount =
    conversationMetadata &&
    flatMessages &&
    lastMessage?.fileMetadata.senderOdinId &&
    lastMessage?.fileMetadata.senderOdinId !== identity
      ? flatMessages.filter(
          (msg) =>
            msg.fileMetadata.senderOdinId !== identity &&
            (msg.fileMetadata.transitCreated || msg.fileMetadata.created) > lastReadTime
        )?.length
      : 0;

  return (
    <Link
      to={href}
      className={`flex flex-row items-center gap-1 rounded-md px-2 py-[0.15rem] ${unreadCount ? 'font-bold' : ''} ${isActive ? 'bg-primary/100 text-white' : `${!isTouchDevice() ? 'hover:bg-primary/10' : ''}`}`}
    >
      <ConnectionImage odinId={recipient} size="xxs" />
      <ConnectionName odinId={recipient} />{' '}
      <span className="text-sm text-slate-400">
        {recipient === dotYouClient.getHostIdentity() ? t('you') : ''}
      </span>
      {unreadCount ? (
        <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm text-primary-contrast">
          {unreadCount}
        </span>
      ) : null}
    </Link>
  );
};
