import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useCommunity } from '../../hooks/community/useCommunity';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import {
  AuthorImage,
  AuthorName,
  COMMUNITY_ROOT_PATH,
  DialogWrapper,
  ErrorBoundary,
  formatDateExludingYearIfCurrent,
  LoadingBlock,
  NotFound,
  t,
  usePortal,
} from '@homebase-id/common-app';
import { Arrow, ChatBubble, ChevronLeft, Pin } from '@homebase-id/common-app/icons';
import { Link, NavLink, useMatch, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { CommunityChannel } from '../../providers/CommunityProvider';
import { useCommunityChannel } from '../../hooks/community/channels/useCommunityChannel';
import { createPortal } from 'react-dom';
import { CommunityHistory } from '../../components/Community/channel/CommunityHistory';
import { useMarkCommunityAsRead } from '../../hooks/community/useMarkCommunityAsRead';
import { CommunityThread } from '../../components/Community/CommunityThread';
import { useEditLastMessageShortcut } from '../../hooks/community/messages/useEditLastMessageShortcut';
import { useCommunityPins } from '../../hooks/community/useCommunityPin';
import { CommunityMessageItem } from '../../components/Community/Message/item/CommunityMessageItem';
import { MessageComposer } from '../../components/Community/Message/composer/MessageComposer';

export const CommunityChannelDetail = () => {
  const { odinKey, communityKey: communityId, channelKey: channelId, threadKey } = useParams();
  const { data: community, isFetched } = useCommunity({ odinId: odinKey, communityId }).fetch;

  const { data: channelDsr } = useCommunityChannel({
    odinId: odinKey,
    communityId: communityId,
    channelId: channelId,
  }).fetch;

  useMarkCommunityAsRead({ odinId: odinKey, communityId, channelId });

  if (!community && isFetched)
    return (
      <div className="flex h-full flex-grow flex-col items-center justify-center">
        <p className="text-4xl">Homebase Community</p>
      </div>
    );

  if ((communityId && !community) || (channelId && !channelDsr)) {
    return (
      <div className="h-full w-20 flex-grow bg-background">
        <LoadingBlock className="h-16 w-full" />
        <div className="mt-8 flex flex-col gap-4 px-5">
          <LoadingBlock className="h-16 w-full" />
          <LoadingBlock className="h-16 w-full" />
          <LoadingBlock className="h-16 w-full" />
          <LoadingBlock className="h-16 w-full" />
          <LoadingBlock className="h-16 w-full" />
        </div>
      </div>
    );
  }

  const isPins = !!useMatch(`${COMMUNITY_ROOT_PATH}/${odinKey}/${communityId}/${channelId}/pins`);
  if (!community || !channelDsr) return <NotFound />;

  return (
    <ErrorBoundary>
      <div className="h-full w-20 flex-grow bg-background">
        <div className="relative flex h-full flex-row">
          <div
            className={`h-full flex-grow flex-col overflow-hidden ${threadKey ? 'hidden xl:flex' : 'flex'}`}
          >
            <CommunityChannelHeader community={community} channel={channelDsr} />
            {!isPins ? (
              <CommunityChannelMessages community={community} channel={channelDsr} />
            ) : (
              <CommunityChannelPins community={community} channel={channelDsr} />
            )}
          </div>

          {threadKey ? (
            <ErrorBoundary>
              <CommunityThread community={community} channel={channelDsr} threadId={threadKey} />
            </ErrorBoundary>
          ) : null}
        </div>
      </div>
    </ErrorBoundary>
  );
};

const CommunityChannelMessages = ({
  channel,
  community,
}: {
  channel: HomebaseFile<CommunityChannel>;
  community: HomebaseFile<CommunityDefinition>;
}) => {
  const { odinKey, communityKey: communityId, channelKey: channelId } = useParams();
  const navigate = useNavigate();

  const keyDownHandler = useEditLastMessageShortcut({ community, channel });

  return (
    <>
      <ErrorBoundary>
        <CommunityHistory
          community={community}
          channel={channel}
          doOpenThread={(thread) =>
            navigate(
              `${COMMUNITY_ROOT_PATH}/${odinKey}/${communityId}/${channelId}/${thread.fileMetadata.appData.uniqueId}/thread`
            )
          }
          emptyPlaceholder={<EmptyChannel community={community} channel={channel} />}
        />
      </ErrorBoundary>
      <ErrorBoundary>
        <MessageComposer
          community={community}
          channel={channel}
          key={channelId}
          onKeyDown={keyDownHandler}
        />
      </ErrorBoundary>
    </>
  );
};

const CommunityChannelPins = ({
  channel,
  community,
}: {
  channel: HomebaseFile<CommunityChannel>;
  community: HomebaseFile<CommunityDefinition>;
}) => {
  const { odinKey, communityKey, channelKey } = useParams();

  const { data: pinnedMessages, isFetching } = useCommunityPins({
    odinId: community.fileMetadata.senderOdinId,
    communityId: community.fileMetadata.appData.uniqueId,
    channelId: channel.fileMetadata.appData.uniqueId,
  }).all;

  if (isFetching)
    return (
      <div className="p-5">
        <LoadingBlock className="h-16 w-full" />
      </div>
    );

  return (
    <div className="flex flex-col gap-5 p-5">
      {pinnedMessages?.searchResults?.length ? (
        <>
          {pinnedMessages?.searchResults.map((pinned, index) => {
            return (
              <Link
                to={`${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/${channelKey}/${pinned.fileMetadata.appData.uniqueId}`}
                key={pinned.fileId || index}
              >
                <CommunityMessageItem
                  msg={pinned}
                  community={community}
                  className="cursor-pointer rounded-lg border px-2 py-1 hover:shadow-md md:px-3"
                />
              </Link>
            );
          })}
        </>
      ) : (
        <p className="text-slate-400">{t('No pinned messages')}</p>
      )}
    </div>
  );
};

const CommunityChannelHeader = ({
  community,
  channel,
}: {
  community?: HomebaseFile<CommunityDefinition>;
  channel?: HomebaseFile<CommunityChannel>;
}) => {
  const { odinKey, channelKey } = useParams();

  const communityId = community?.fileMetadata.appData.uniqueId;
  const [showChatInfo, setShowChatInfo] = useState<boolean>(false);
  const isPins = !!useMatch(`${COMMUNITY_ROOT_PATH}/${odinKey}/${communityId}/${channelKey}/pins`);

  return (
    <>
      <div className="flex flex-row flex-wrap items-center gap-2 bg-page-background p-2 lg:p-5">
        <Link
          className="-m-1 p-1 lg:hidden"
          type="mute"
          to={`${COMMUNITY_ROOT_PATH}/${community?.fileMetadata.senderOdinId}/${communityId}`}
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Link>

        {channel ? (
          <button
            onClick={() => setShowChatInfo(true)}
            className="flex cursor-pointer flex-row items-center gap-2"
          >
            # {channel.fileMetadata.appData.content?.title}
          </button>
        ) : null}

        <div className="-mb-2 ml-auto flex flex-row items-center gap-2 lg:-mb-5">
          <NavLink
            to={`${COMMUNITY_ROOT_PATH}/${community?.fileMetadata.senderOdinId}/${communityId}/${channel?.fileMetadata.appData.uniqueId}`}
            type="secondary"
            className={`flex flex-row items-center gap-1 border-b-2 px-3 py-2 transition-colors ${!isPins ? 'border-current' : 'border-transparent'}`}
            end={true}
          >
            <ChatBubble className="h-4 w-4" />
            {'Messages'}
          </NavLink>
          <NavLink
            to={`${COMMUNITY_ROOT_PATH}/${community?.fileMetadata.senderOdinId}/${communityId}/${channel?.fileMetadata.appData.uniqueId}/pins`}
            type="secondary"
            className={`flex flex-row items-center gap-1 border-b-2 px-3 py-2 transition-colors ${isPins ? 'border-current' : 'border-transparent'}`}
            end={true}
          >
            <Pin className="h-4 w-4" />
            {'Pins'}
          </NavLink>
        </div>
      </div>

      {showChatInfo && community && channel ? (
        <ChannelInfo
          community={community}
          channel={channel}
          onClose={() => setShowChatInfo(false)}
        />
      ) : null}
    </>
  );
};

const ChannelInfo = ({
  channel,
  community,
  onClose,
}: {
  channel: HomebaseFile<CommunityChannel>;
  community: HomebaseFile<CommunityDefinition>;
  onClose: () => void;
}) => {
  const { odinKey, communityKey } = useParams();
  const target = usePortal('modal-container');

  const channelContent = channel.fileMetadata.appData.content;
  const communityContent = community.fileMetadata.appData.content;
  const members = communityContent.members;

  const creator = channel.fileMetadata.senderOdinId || community.fileMetadata.senderOdinId;

  const dialog = (
    <DialogWrapper onClose={onClose} title={`# ${channelContent.title}`}>
      <div className="flex flex-col gap-5">
        <div>
          <Link
            className="text-primary hover:underline"
            to={`${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/direct/${creator}`}
          >
            @<AuthorName odinId={creator} excludeLink={true} />
          </Link>{' '}
          {t('created this channel on')}{' '}
          {formatDateExludingYearIfCurrent(
            new Date(channel.fileMetadata.created || community.fileMetadata.created)
          )}
          <p className="italic text-slate-400">{channelContent?.description}</p>
        </div>

        {members?.length > 1 ? (
          <div>
            <p className="mb-4 text-lg">{t('Members')}</p>
            <div className="flex flex-col gap-4">
              {members.map((recipient) => (
                <Link
                  to={`${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/direct/${recipient}`}
                  className="group flex flex-row items-center gap-3"
                  key={recipient}
                  style={{
                    order: Array.from(recipient)
                      .map((char) => char.charCodeAt(0))
                      .reduce((acc, curr) => acc + curr, 0),
                  }}
                >
                  <AuthorImage
                    odinId={recipient}
                    className="border border-neutral-200 dark:border-neutral-800"
                    size="sm"
                    excludeLink={true}
                  />
                  <div className="flex flex-col group-hover:underline">
                    <AuthorName odinId={recipient} excludeLink={true} />
                    <p className="text-slate-400">{recipient}</p>
                  </div>
                  <Arrow className="ml-auto h-5 w-5" />
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

const EmptyChannel = ({
  community,
  channel,
}: {
  community: HomebaseFile<CommunityDefinition> | undefined;
  channel: HomebaseFile<CommunityChannel> | undefined;
}) => {
  const { odinKey, communityKey } = useParams();

  if (!channel || !community) return null;

  const creator = channel.fileMetadata.senderOdinId || community.fileMetadata.senderOdinId;

  return (
    <div className="flex h-full flex-grow flex-col-reverse">
      <div className="p-5">
        <p className="mb-2 text-2xl"># {channel.fileMetadata.appData.content?.title}</p>
        <Link
          className="text-primary hover:underline"
          to={`${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/direct/${channel.fileMetadata.senderOdinId}`}
        >
          @<AuthorName odinId={creator} excludeLink={true} />
        </Link>{' '}
        {t('created this channel on')}{' '}
        {formatDateExludingYearIfCurrent(
          new Date(channel.fileMetadata.created || community.fileMetadata.created)
        )}
        <p className="italic text-slate-400">{channel.fileMetadata.appData.content?.description}</p>
      </div>
    </div>
  );
};
