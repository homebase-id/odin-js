import { COMMUNITY_ROOT_PATH, NotFound } from '@homebase-id/common-app';
import { Navigate, useParams } from 'react-router-dom';
import { useCommunities } from '../../hooks/community/useCommunities';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useCommunityMessage } from '../../hooks/community/messages/useCommunityMessage';
import { useMemo } from 'react';

export const CommunityNotificationRedirect = () => {
  const { communityKey, messageKey } = useParams();

  const { data: communities } = useCommunities().all;

  const matchingCommunity = useMemo(
    () =>
      communities?.find((community) =>
        stringGuidsEqual(community.fileMetadata.appData.uniqueId, communityKey)
      ),
    [communities]
  );

  const { data: standardMessage, isFetched: standardMessageIsFetched } = useCommunityMessage({
    odinId: matchingCommunity?.fileMetadata.senderOdinId,
    communityId: communityKey,
    messageId: messageKey,
    fileSystemType: 'Standard',
  }).get;

  const { data: threadMessage, isFetched: threadMessageIsFetched } = useCommunityMessage({
    odinId: matchingCommunity?.fileMetadata.senderOdinId,
    communityId: communityKey,
    messageId: messageKey,
    fileSystemType: 'Comment',
  }).get;

  const message = standardMessage || threadMessage;
  const messageIsFetched = standardMessageIsFetched && threadMessageIsFetched;

  if (matchingCommunity) {
    const communityPath = `${COMMUNITY_ROOT_PATH}/${matchingCommunity.fileMetadata.senderOdinId}/${matchingCommunity.fileMetadata.appData.uniqueId}`;
    if (!messageKey || (!message && messageIsFetched)) return <Navigate to={communityPath} />;

    if (message) {
      if (message.fileSystemType.toLowerCase() === 'standard') {
        return (
          <Navigate
            to={`${communityPath}/${message.fileMetadata.appData.content.channelId}/${message.fileMetadata.appData.uniqueId}`}
          />
        );
      } else {
        if (
          message.fileMetadata.appData.content.channelId &&
          message.fileMetadata.appData.content.threadId
        )
          return (
            <Navigate
              to={`${communityPath}/${message.fileMetadata.appData.content.channelId}/${message.fileMetadata.appData.content.threadId}/thread/${message.fileMetadata.appData.uniqueId}`}
            />
          );
      }
    }
  }

  if (!communityKey) return <NotFound />;

  return <></>;
};
