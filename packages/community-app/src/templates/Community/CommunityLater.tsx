import { Link, useParams } from 'react-router-dom';
import { useCommunityMetadata } from '../../hooks/community/useCommunityMetadata';
import { useCommunityMessage } from '../../hooks/community/messages/useCommunityMessage';
import { HomebaseFile, SystemFileType } from '@homebase-id/js-lib/core';
import {
  ActionLink,
  COMMUNITY_ROOT_PATH,
  ConnectionImage,
  ConnectionName,
  ellipsisAtMaxChar,
  ErrorBoundary,
  ErrorNotification,
  getOdinIdColor,
  getTextRootsRecursive,
  NotFound,
  OwnerImage,
  OwnerName,
  t,
  useDotYouClient,
} from '@homebase-id/common-app';
import { Bookmark, BookmarkSolid, ChevronLeft } from '@homebase-id/common-app/icons';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { useCommunity } from '../../hooks/community/useCommunity';
import { useMemo } from 'react';
import { useCommunityChannel } from '../../hooks/community/channels/useCommunityChannel';
import { CommunityDeliveryIndicator } from '../../components/Community/Message/CommunityDeliveryIndicator';
import { CommunitySentTimeIndicator } from '../../components/Community/Message/CommunitySentTimeIndicator';
import { useCommunityLater } from '../../hooks/community/useCommunityLater';

export const CommunityLater = () => {
  const { odinKey, communityKey } = useParams();

  const { data: community } = useCommunity({ odinId: odinKey, communityId: communityKey }).fetch;
  const { data: communityMeta } = useCommunityMetadata({
    odinId: odinKey,
    communityId: communityKey,
  }).single;

  const savedMessages = communityMeta?.fileMetadata.appData.content.savedMessages;

  if (!community) {
    return <NotFound />;
  }

  return (
    <ErrorBoundary>
      <div className="h-full w-full flex-grow bg-background">
        <div className="relative flex h-full flex-row">
          <div className="flex h-full flex-grow flex-col overflow-hidden">
            <div className="flex h-full flex-grow flex-col">
              <CommunityLaterHeader community={community} />
              {!savedMessages?.length ? (
                <p className="m-auto text-lg">{t('All done!')} 🎉</p>
              ) : (
                <div className="flex h-20 flex-grow flex-col gap-3 overflow-auto py-3 pt-[2rem]">
                  {savedMessages.map((message) => {
                    return <SavedMessage message={message} key={message.messageId} />;
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

const SavedMessage = ({
  message,
}: {
  message: {
    messageId: string;
    systemFileType: SystemFileType;
  };
}) => {
  const { odinKey, communityKey } = useParams();
  const { data: community } = useCommunity({
    odinId: odinKey,
    communityId: communityKey,
  }).fetch;

  const { data: msg } = useCommunityMessage({
    odinId: odinKey,
    communityId: communityKey,
    messageId: message.messageId,
    fileSystemType: message.systemFileType,
  }).get;

  const link = useMemo(() => {
    if (!msg) return null;

    if (message.systemFileType === 'Standard') {
      return `${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/${msg.fileMetadata.appData.content.channelId}/${msg.fileMetadata.appData.uniqueId}`;
    } else {
      if (!msg.fileMetadata.appData.content.channelId || !msg.fileMetadata.appData.content.threadId)
        return null;
      return `${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/${msg.fileMetadata.appData.content.channelId}/${msg.fileMetadata.appData.content.threadId}/thread/${msg.fileMetadata.appData.uniqueId}`;
    }
  }, [msg]);

  const { data: channel } = useCommunityChannel({
    communityId: community?.fileMetadata.appData.uniqueId,
    channelId: msg?.fileMetadata.appData.content.channelId,
  }).fetch;

  if (!msg) return null;

  const identity = useDotYouClient().getIdentity();
  const authorOdinId = msg?.fileMetadata.originalAuthor || identity || '';

  const messageFromMe = !authorOdinId || authorOdinId === identity;

  const {
    isSaved,
    toggleSave: { mutate: toggleSave, error: toggleSaveError },
  } = useCommunityLater({
    messageId: msg.fileMetadata.appData.uniqueId,
    systemFileType: msg.fileSystemType,
  });

  if (!msg || !link) return null;

  const plainText = getTextRootsRecursive(msg.fileMetadata.appData.content.message).join(' ');

  return (
    <>
      <ErrorNotification error={toggleSaveError} />

      <Link to={link} className="group px-2 py-1 hover:bg-page-background md:px-3">
        <p className="mb-1 text-primary">#{channel?.fileMetadata.appData.content.title}</p>

        <div className="flex flex-row gap-2">
          {!messageFromMe ? (
            <ConnectionImage
              odinId={authorOdinId}
              className={`flex-shrink-0 border border-neutral-200 dark:border-neutral-800`}
              size="xs"
            />
          ) : (
            <OwnerImage
              className={`flex-shrink-0 border border-neutral-200 dark:border-neutral-800`}
              size="xs"
            />
          )}

          <div className="flex w-20 flex-grow flex-col">
            <div className="flex flex-row items-center gap-2">
              <p
                className={`font-semibold`}
                style={{ color: getOdinIdColor(authorOdinId).darkTheme }}
              >
                {messageFromMe ? <OwnerName /> : <ConnectionName odinId={authorOdinId} />}
              </p>
              <CommunitySentTimeIndicator className="text-sm" msg={msg} />
              <CommunityDeliveryIndicator msg={msg} />
            </div>

            <p>{ellipsisAtMaxChar(plainText, 240)}</p>
          </div>

          <div className="invisible my-auto flex flex-row group-hover:visible">
            <button
              className="rounded-full p-2 text-slate-400 hover:bg-slate-300 hover:dark:bg-slate-700"
              onClick={() => toggleSave()}
            >
              {isSaved ? <BookmarkSolid className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </Link>
    </>
  );
};

const CommunityLaterHeader = ({ community }: { community?: HomebaseFile<CommunityDefinition> }) => {
  const communityId = community?.fileMetadata.appData.uniqueId;

  return (
    <>
      <div className="flex flex-row items-center gap-2 bg-page-background p-2 lg:p-5">
        <ActionLink
          className="lg:hidden"
          type="mute"
          href={`${COMMUNITY_ROOT_PATH}/${community?.fileMetadata.senderOdinId}/${communityId}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </ActionLink>
        <Bookmark className="h-6 w-6" /> {t('Later')}
      </div>
    </>
  );
};