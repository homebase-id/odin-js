import { useOdinClientContext } from '@homebase-id/common-app';
import { processInbox, queryBatchOverPeer, queryModifiedOverPeer } from '@homebase-id/js-lib/peer';
import { useQueryClient, useQuery, QueryClient } from '@tanstack/react-query';
import { getTargetDriveFromCommunityId } from '../../../providers/CommunityDefinitionProvider';
import {
  COMMUNITY_MESSAGE_FILE_TYPE,
  CommunityMessage,
  dsrToMessage,
} from '../../../providers/CommunityMessageProvider';
import {
  OdinClient,
  FileQueryParams,
  queryBatch,
  queryModified,
  TargetDrive,
  HomebaseFile,
  DeletedHomebaseFile,
  DEFAULT_PAYLOAD_KEY,
} from '@homebase-id/js-lib/core';
import {
  hasDebugFlag,
  getQueryModifiedCursorFromTime,
  getQueryBatchCursorFromTime,
  stringGuidsEqual,
} from '@homebase-id/js-lib/helpers';
import {
  insertNewMessage,
  insertNewMessagesForChannel,
  invalidateCommunityMessages,
} from '../messages/useCommunityMessages';
import {
  COMMUNITY_CHANNEL_FILE_TYPE,
  dsrToCommunityChannel,
} from '../../../providers/CommunityProvider';
import { insertNewCommunityChannel } from '../channels/useCommunityChannels';
import {
  COMMUNITY_METADATA_FILE_TYPE,
  dsrToCommunityMetadata,
  LOCAL_COMMUNITY_APP_DRIVE,
} from '../../../providers/CommunityMetadataProvider';
import { insertNewcommunityMetadata } from '../useCommunityMetadata';
import { COMMUNITY_DRAFTS_FILE_TYPE, dsrToCommunityDrafts } from '../../../providers/CommunityDraftsProvider';
import { insertNewcommunityDrafts } from '../useCommunityDrafts';

const isDebug = hasDebugFlag();

const MINUTE_IN_MS = 60000;

const BATCH_SIZE = 2000;
// Process the inbox on startup
export const useCommunityInboxProcessor = (
  odinId: string | undefined,
  communityId: string | undefined
) => {
  const odinClient = useOdinClientContext();
  const queryClient = useQueryClient();
  const targetDrive = getTargetDriveFromCommunityId(communityId || '');

  const fetchData = async (communityId: string) => {
    const lastProcessedTime = queryClient.getQueryState([
      'process-community-inbox',
      communityId,
    ])?.dataUpdatedAt;
    const lastProcessedWithBuffer = lastProcessedTime && lastProcessedTime - MINUTE_IN_MS * 15;

    // Process community;
    const processedresult =
      !odinId || odinId === odinClient.getHostIdentity()
        ? await processInbox(odinClient, targetDrive, BATCH_SIZE)
        : null;

    isDebug &&
      console.debug('[CommunityInboxProcessor] fetching updates since', lastProcessedWithBuffer);
    if (lastProcessedWithBuffer) {
      const newMessages = await findChangesSinceTimestamp(
        odinClient,
        odinId,
        lastProcessedWithBuffer,
        {
          targetDrive: targetDrive,
          fileType: [COMMUNITY_MESSAGE_FILE_TYPE],
          fileState: [0, 1],
        }
      );
      isDebug && console.debug('[CommunityInboxProcessor] new messages', newMessages);

      await processCommunityMessagesBatch(
        odinClient,
        queryClient,
        odinId,
        targetDrive,
        communityId,
        newMessages
      );

      const newThreadMessages = await findChangesSinceTimestamp(
        odinClient,
        odinId,
        lastProcessedWithBuffer,
        {
          targetDrive: targetDrive,
          fileType: [COMMUNITY_MESSAGE_FILE_TYPE],
          fileState: [0, 1],
          systemFileType: 'Comment',
        }
      );
      isDebug && console.debug('[CommunityInboxProcessor] new thread messages', newThreadMessages);

      await processCommunityMessagesBatch(
        odinClient,
        queryClient,
        odinId,
        targetDrive,
        communityId,
        newThreadMessages
      );

      const newChannels = await findChangesSinceTimestamp(
        odinClient,
        odinId,
        lastProcessedWithBuffer,
        { targetDrive: targetDrive, fileType: [COMMUNITY_CHANNEL_FILE_TYPE], fileState: [0, 1] }
      );

      isDebug && console.debug('[CommunityInboxProcessor] new channels', newChannels.length);
      await Promise.all(
        newChannels.map(async (updatedDsr) => {
          const newChannel =
            updatedDsr.fileState === 'active'
              ? await dsrToCommunityChannel(odinClient, updatedDsr, odinId, targetDrive, true)
              : updatedDsr;

          if (!newChannel) return;
          insertNewCommunityChannel(queryClient, newChannel, communityId);
        })
      );

      const newCommunityMetadata = await findChangesSinceTimestamp(
        odinClient,
        undefined,
        lastProcessedWithBuffer,
        {
          targetDrive: LOCAL_COMMUNITY_APP_DRIVE,
          fileType: [COMMUNITY_METADATA_FILE_TYPE],
        }
      );

      isDebug && console.debug('[CommunityInboxProcessor] new community metadata');

      await Promise.all(
        newCommunityMetadata.map(async (updatedDsr) => {
          const newMetadata =
            updatedDsr.fileState === 'active'
              ? await dsrToCommunityMetadata(
                odinClient,
                updatedDsr,
                LOCAL_COMMUNITY_APP_DRIVE,
                true
              )
              : updatedDsr;
          if (!newMetadata) return;
          insertNewcommunityMetadata(queryClient, newMetadata);
        })
      );

      const newCommunityDrafts = await findChangesSinceTimestamp(
        odinClient,
        undefined,
        lastProcessedWithBuffer,
        {
          targetDrive: LOCAL_COMMUNITY_APP_DRIVE,
          fileType: [COMMUNITY_DRAFTS_FILE_TYPE],
        }
      );

      isDebug && console.debug('[CommunityInboxProcessor] new community drafts');

      await Promise.all(
        newCommunityDrafts.map(async (updatedDsr) => {
          const newDrafts =
            updatedDsr.fileState === 'active'
              ? await dsrToCommunityDrafts(
                odinClient,
                updatedDsr,
                LOCAL_COMMUNITY_APP_DRIVE,
                true
              )
              : updatedDsr;
          if (!newDrafts) return;
          insertNewcommunityDrafts(queryClient, newDrafts);
        })
      );
    } else {
      console.warn('[useCommunityInboxProcessor] Invalidating all community messages');
      // We have no reference to the last time we processed the inbox, so we can only invalidate all chat messages
      invalidateCommunityMessages(queryClient, communityId);
    }

    return processedresult;
  };

  // We refetch this one on mount as each mount the websocket would reconnect, and there might be a backlog of messages
  return useQuery({
    queryKey: ['process-community-inbox', communityId],
    queryFn: () => fetchData(communityId as string),
    enabled: !!communityId,
    staleTime: 1000 * 10, // 10 seconds
  });
};

const findChangesSinceTimestamp = async (
  odinClient: OdinClient,
  odinId: string | undefined,
  timeStamp: number,
  params: FileQueryParams
) => {
  const modifiedCursor = getQueryModifiedCursorFromTime(timeStamp); // Friday, 31 May 2024 09:38:54.678
  const batchCursor = getQueryBatchCursorFromTime(new Date().getTime(), timeStamp);

  const newFiles =
    odinId && odinClient.getHostIdentity() !== odinId
      ? await queryBatchOverPeer(odinClient, odinId, params, {
        maxRecords: BATCH_SIZE,
        cursorState: batchCursor,
        includeMetadataHeader: true,
        includeTransferHistory: false,
      })
      : await queryBatch(odinClient, params, {
        maxRecords: BATCH_SIZE,
        cursorState: batchCursor,
        includeMetadataHeader: true,
        includeTransferHistory: false,
      });

  const modifiedFiles =
    odinId && odinClient.getHostIdentity() !== odinId
      ? await queryModifiedOverPeer(odinClient, odinId, params, {
        maxRecords: BATCH_SIZE,
        cursor: modifiedCursor + '',
        excludePreviewThumbnail: false,
        includeHeaderContent: true,
        includeTransferHistory: false,
      })
      : await queryModified(odinClient, params, {
        maxRecords: BATCH_SIZE,
        cursor: modifiedCursor + '',
        excludePreviewThumbnail: false,
        includeHeaderContent: true,
        includeTransferHistory: false,
      });

  return modifiedFiles.searchResults.concat(newFiles.searchResults);
};

// Process batched updates after a processInbox
const processCommunityMessagesBatch = async (
  odinClient: OdinClient,
  queryClient: QueryClient,
  odinId: string | undefined,
  targetDrive: TargetDrive,
  communityId: string,
  communityMessages: (HomebaseFile<string | CommunityMessage> | DeletedHomebaseFile<string>)[]
) => {
  const groupedMessages = communityMessages.reduce(
    (acc, dsr) => {
      if (!dsr.fileMetadata?.appData?.groupId || dsr.fileState === 'deleted') {
        return acc;
      }
      const groupId = dsr.fileMetadata.appData.groupId;

      if (!acc[groupId]) {
        acc[groupId] = [];
      }

      if (
        acc[groupId].some((m) => stringGuidsEqual(m.fileId, dsr.fileId)) ||
        acc[groupId].some((m) =>
          stringGuidsEqual(m.fileMetadata.appData.uniqueId, dsr.fileMetadata.appData.uniqueId)
        )
      ) {
        return acc;
      }

      acc[groupId].push(dsr);
      return acc;
    },
    {} as Record<string, HomebaseFile<string | CommunityMessage>[]>
  );
  isDebug &&
    console.debug(
      '[CommunityInboxProcessor] new conversation updates',
      Object.keys(groupedMessages).length
    );

  await Promise.all(
    Object.keys(groupedMessages).map(async (channelId) => {
      const updatedcommunityMessages = (
        await Promise.all(
          groupedMessages[channelId].map(async (newMessage) =>
            typeof newMessage.fileMetadata.appData.content === 'string' ||
              newMessage.fileMetadata.payloads?.some((pyld) => pyld.key === DEFAULT_PAYLOAD_KEY)
              ? await dsrToMessage(
                odinClient,
                newMessage as HomebaseFile<string>,
                odinId,
                targetDrive,
                true
              )
              : (newMessage as HomebaseFile<CommunityMessage>)
          )
        )
      ).filter(Boolean) as (HomebaseFile<CommunityMessage> | DeletedHomebaseFile)[];

      const threadMessages = updatedcommunityMessages.filter(
        (msg) => msg.fileSystemType.toLowerCase() === 'comment'
      );

      threadMessages.forEach((msg) => {
        insertNewMessage(queryClient, msg, communityId);
      });

      insertNewMessagesForChannel(
        queryClient,
        communityId,
        channelId,
        updatedcommunityMessages.filter((msg) => msg.fileSystemType.toLowerCase() === 'standard')
      );
    })
  );
};
