import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useCommunity } from '../../hooks/community/useCommunity';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import {
  AuthorImage,
  AuthorName,
  DialogWrapper,
  ErrorBoundary,
  formatDateExludingYearIfCurrent,
  LoadingBlock,
  t,
  usePortal,
} from '@homebase-id/common-app';
import { Arrow, ChevronLeft } from '@homebase-id/common-app/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { ROOT_PATH as COMMUNITY_ROOT } from '../../app/App';
import { CommunityChannel } from '../../providers/CommunityProvider';
import { useCommunityChannel } from '../../hooks/community/channels/useCommunityChannel';
import { createPortal } from 'react-dom';
import { MessageComposer } from '../../components/Community/Message/MessageComposer';
import { CommunityHistory } from '../../components/Community/channel/CommunityHistory';
import { useMarkCommunityAsRead } from '../../hooks/community/useMarkCommunityAsRead';
import { CommunityThread } from '../../components/Community/CommunityThread';

export const CommunityChannelDetail = () => {
  const [isEmptyChannel, setIsEmptyChannel] = useState<boolean>(false);
  const { odinKey, communityKey: communityId, channelKey: channelId, threadKey } = useParams();
  const { data: community, isFetched } = useCommunity({ odinId: odinKey, communityId }).fetch;
  const navigate = useNavigate();

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
      <div className="h-full w-full flex-grow bg-background">
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
  return (
    <ErrorBoundary>
      <div className="h-full w-full flex-grow bg-background">
        <div className="relative flex h-full flex-row">
          <div className="flex h-full flex-grow flex-col overflow-hidden">
            <CommunityChannelHeader community={community || undefined} channel={channelDsr} />
            <ErrorBoundary>
              {isEmptyChannel ? (
                <EmptyChannel channel={channelDsr} />
              ) : (
                <CommunityHistory
                  community={community || undefined}
                  channel={channelDsr || undefined}
                  doOpenThread={(thread) =>
                    navigate(
                      `${COMMUNITY_ROOT}/${odinKey}/${communityId}/${channelId}/${thread.fileMetadata.appData.uniqueId}/thread`
                    )
                  }
                  setIsEmptyChat={setIsEmptyChannel}
                />
              )}
            </ErrorBoundary>
            <ErrorBoundary>
              <MessageComposer
                community={community || undefined}
                channel={channelDsr || undefined}
                key={channelId}
                onSend={() => setIsEmptyChannel(false)}
              />
            </ErrorBoundary>
          </div>

          {threadKey ? (
            <ErrorBoundary>
              <CommunityThread
                community={community || undefined}
                channel={channelDsr || undefined}
                threadId={threadKey}
              />
            </ErrorBoundary>
          ) : null}
        </div>
      </div>
    </ErrorBoundary>
  );
};

const CommunityChannelHeader = ({
  community,
  channel,
}: {
  community?: HomebaseFile<CommunityDefinition>;
  channel?: HomebaseFile<CommunityChannel>;
}) => {
  const communityId = community?.fileMetadata.appData.uniqueId;
  const [showChatInfo, setShowChatInfo] = useState<boolean>(false);

  return (
    <>
      <div className="flex flex-row items-center gap-2 bg-page-background p-2 lg:p-5">
        <Link
          className="-m-1 p-1 lg:hidden"
          type="mute"
          to={`${COMMUNITY_ROOT}/${community?.fileMetadata.senderOdinId}/${communityId}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>

        {channel ? (
          <button
            onClick={() => setShowChatInfo(true)}
            className="flex cursor-pointer flex-row items-center gap-2"
          >
            # {channel.fileMetadata.appData.content?.title}
          </button>
        ) : null}
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
            to={`${COMMUNITY_ROOT}/${odinKey}/${communityKey}/direct/${creator}`}
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
                  to={`${COMMUNITY_ROOT}/${odinKey}/${communityKey}/direct/${recipient}`}
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

const EmptyChannel = ({ channel }: { channel: HomebaseFile<CommunityChannel> | undefined }) => {
  const { odinKey, communityKey } = useParams();

  if (!channel) return null;
  return (
    <div className="flex h-full flex-grow flex-col-reverse">
      <div className="p-5">
        <p className="mb-2 text-2xl"># {channel.fileMetadata.appData.content?.title}</p>
        <Link
          className="text-primary hover:underline"
          to={`${COMMUNITY_ROOT}/${odinKey}/${communityKey}/direct/${channel.fileMetadata.senderOdinId}`}
        >
          @<AuthorName odinId={channel.fileMetadata.senderOdinId} excludeLink={true} />
        </Link>{' '}
        {t('created this channel on')}{' '}
        {formatDateExludingYearIfCurrent(new Date(channel.fileMetadata.created))}
        <p>{channel.fileMetadata.appData.content?.description}</p>
      </div>
    </div>
  );
};
