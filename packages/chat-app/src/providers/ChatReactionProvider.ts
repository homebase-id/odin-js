import {
  DotYouClient,
  HomebaseFile,
  FileQueryParams,
  GetBatchQueryResultOptions,
  NewHomebaseFile,
  ScheduleOptions,
  SecurityGroupType,
  SendContents,
  TargetDrive,
  UploadFileMetadata,
  UploadInstructionSet,
  deleteFile,
  getContentFromHeaderOrPayload,
  queryBatch,
  uploadFile,
  PriorityOptions,
} from '@youfoundation/js-lib/core';
import { ChatDrive } from './ConversationProvider';
import { appId } from '../hooks/auth/useAuth';
import { getNewId, jsonStringify64 } from '@youfoundation/js-lib/helpers';
import { t } from '@youfoundation/common-app';

export const ChatReactionFileType = 7979;
const PAGE_SIZE = 100;

export interface ChatReaction {
  // Content of the reaction
  message: string;
}

export const getReactions = async (
  dotYouClient: DotYouClient,
  conversationId: string,
  messageId: string
) => {
  const params: FileQueryParams = {
    targetDrive: ChatDrive,
    groupId: [messageId],
  };

  const ro: GetBatchQueryResultOptions = {
    maxRecords: PAGE_SIZE,
    cursorState: undefined,
    includeMetadataHeader: true,
  };

  const response = await queryBatch(dotYouClient, params, ro);
  return {
    ...response,
    searchResults: (
      await Promise.all(
        response.searchResults.map(
          async (result) => await dsrToReaction(dotYouClient, result, ChatDrive, true)
        )
      )
    ).filter(Boolean) as HomebaseFile<ChatReaction>[],
  };
};

export const uploadReaction = async (
  dotYouClient: DotYouClient,
  conversationId: string,
  reaction: NewHomebaseFile<ChatReaction>,
  recipients: string[]
) => {
  const reactionContent = reaction.fileMetadata.appData.content;
  const distribute = recipients?.length > 0;

  const uploadInstructions: UploadInstructionSet = {
    storageOptions: {
      drive: ChatDrive,
      overwriteFileId: reaction.fileId,
    },
    transitOptions: distribute
      ? {
          recipients: [...recipients],
          schedule: ScheduleOptions.SendLater,
          priority: PriorityOptions.Medium,
          sendContents: SendContents.All,
          useGlobalTransitId: true,
          useAppNotification: true,
          appNotificationOptions: {
            appId: appId,
            typeId: conversationId,
            tagId: getNewId(),
            silent: false,
            unEncryptedMessage: t('{0} reacted to a message', dotYouClient.getIdentity()),
          },
        }
      : undefined,
  };

  const jsonContent: string = jsonStringify64({ ...reactionContent });
  const uploadMetadata: UploadFileMetadata = {
    versionTag: reaction?.fileMetadata.versionTag,
    allowDistribution: distribute,
    appData: {
      ...reaction.fileMetadata.appData,
      fileType: ChatReactionFileType,
      content: jsonContent,
    },
    isEncrypted: true,
    accessControlList: reaction.serverMetadata?.accessControlList || {
      requiredSecurityGroup: SecurityGroupType.Connected,
    },
  };

  return await uploadFile(
    dotYouClient,
    uploadInstructions,
    uploadMetadata,
    undefined,
    undefined,
    undefined,
    undefined
  );
};

export const deleteReaction = async (
  dotYouClient: DotYouClient,
  chatReaction: HomebaseFile<ChatReaction>,
  recipients: string[]
) => {
  return await deleteFile(dotYouClient, ChatDrive, chatReaction.fileId, recipients);
};

export const dsrToReaction = async (
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<ChatReaction> | null> => {
  try {
    const attrContent = await getContentFromHeaderOrPayload<ChatReaction>(
      dotYouClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );
    if (!attrContent) return null;

    const chatReaction: HomebaseFile<ChatReaction> = {
      ...dsr,
      fileMetadata: {
        ...dsr.fileMetadata,
        appData: {
          ...dsr.fileMetadata.appData,
          content: attrContent,
        },
      },
    };

    return chatReaction;
  } catch (ex) {
    console.error('[DotYouCore-js] failed to get the chatReaction payload of a dsr', dsr, ex);
    return null;
  }
};
