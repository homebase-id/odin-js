import { Link, useParams } from 'react-router-dom';
import { useCommunityMetadata } from '../../hooks/community/useCommunityMetadata';
import { useCommunityMessage } from '../../hooks/community/messages/useCommunityMessage';
import { HomebaseFile, SystemFileType } from '@homebase-id/js-lib/core';
import {
  COMMUNITY_ROOT_PATH,
  ellipsisAtMaxChar,
  ErrorBoundary,
  ErrorNotification,
  getTextRootsRecursive,
  NotFound,
  t,
} from '@homebase-id/common-app';
import { Bookmark, BookmarkSolid, ChevronLeft } from '@homebase-id/common-app/icons';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { useCommunity } from '../../hooks/community/useCommunity';
import { useMemo } from 'react';
import { useCommunityChannel } from '../../hooks/community/channels/useCommunityChannel';
import { CommunityDeliveryIndicator } from '../../components/Community/Message/item/CommunityDeliveryIndicator';
import { CommunitySentTimeIndicator } from '../../components/Community/Message/item/CommunitySentTimeIndicator';
import { useCommunityLater } from '../../hooks/community/useCommunityLater';
import { CommunityMessageAuthorName } from '../../components/Community/Message/item/CommunityMesageAuthorName';
import { CommunityMessageAvatar } from '../../components/Community/Message/item/CommunityMessageAvatar';

export const CommunityLater = () => {
  const { odinKey, communityKey } = useParams();

  const { data: community } = useCommunity({ odinId: odinKey, communityId: communityKey }).fetch;
  const { data: communityMeta } = useCommunityMetadata({
    odinId: odinKey,
    communityId: communityKey,
  }).single;

  const savedMessages = communityMeta?.fileMetadata.appData.content.savedMessages;

  if (!community) return <NotFound />;

  return (
    <ErrorBoundary>
      <div className="h-full w-20 flex-grow bg-background">
        <div className="relative flex h-full flex-row">
          <div className="flex h-full flex-grow flex-col overflow-hidden">
            <div className="flex h-full flex-grow flex-col">
              <CommunityLaterHeader community={community} />
              {!savedMessages?.length ? (
                <p className="m-auto text-lg">{t('All done!')} 🎉</p>
              ) : (
                <div className="flex h-20 flex-grow flex-col overflow-auto">
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

    if (message.systemFileType.toLowerCase() === 'standard') {
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

  const {
    isSaved,
    toggleSave: { mutate: toggleSave, error: toggleSaveError },
  } = useCommunityLater({
    messageId: msg?.fileMetadata.appData.uniqueId,
    systemFileType: msg?.fileSystemType,
  });

  if (!msg || !link) return null;

  const plainText = getTextRootsRecursive(msg.fileMetadata.appData.content.message).join(' ');

  return (
    <>
      <ErrorNotification error={toggleSaveError} />

      <Link
        to={link}
        className="group border-b px-2 py-3 hover:bg-page-background md:px-3"
        style={{ order: new Date().getTime() - msg.fileMetadata.created }}
      >
        <p className="mb-2 text-sm text-slate-400">
          #{channel?.fileMetadata.appData.content.title}
        </p>

        <div className="flex flex-row gap-2">
          <CommunityMessageAvatar msg={msg} />

          <div className="flex w-20 flex-grow flex-col">
            <div className="flex flex-row items-center gap-2">
              <CommunityMessageAuthorName msg={msg} />
              <CommunitySentTimeIndicator className="text-sm" msg={msg} />
              <CommunityDeliveryIndicator msg={msg} />
            </div>

            <p>{ellipsisAtMaxChar(plainText, 240)}</p>
          </div>

          <div className="invisible my-auto flex flex-row group-hover:visible">
            <button
              className="rounded-full p-2 text-slate-400 hover:bg-slate-300 hover:dark:bg-slate-700"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSave();
              }}
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
        <Link
          className="-m-1 p-1 lg:hidden"
          type="mute"
          to={`${COMMUNITY_ROOT_PATH}/${community?.fileMetadata.senderOdinId}/${communityId}`}
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Link>
        <Bookmark className="h-4 w-4 sm:h-5 sm:w-5" /> {t('Later')}
      </div>
    </>
  );
};
