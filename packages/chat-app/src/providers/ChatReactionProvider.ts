import {
  DotYouClient,
  DriveSearchResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  NewDriveSearchResult,
  ReactionFile,
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
} from '@youfoundation/js-lib/core';
import { ChatDrive } from './ConversationProvider';
import { appId } from '../hooks/auth/useAuth';
import { getNewId, jsonStringify64, tryJsonParse } from '@youfoundation/js-lib/helpers';

export const ChatReactionFileType = 7979;
const PAGE_SIZE = 100;

export interface ChatReaction {
  // Content of the reaction
  message: string;
}

// export const getReactions = async (
//   dotYouClient: DotYouClient,
//   messageGlobalTransitId: string,
// ) => {
//   const params: FileQueryParams = {
//     targetDrive: ChatDrive,
//     groupId: [messageId],
//   };

//   const ro: GetBatchQueryResultOptions = {
//     maxRecords: PAGE_SIZE,
//     cursorState: undefined,
//     includeMetadataHeader: true,
//   };

//   const response = await queryBatch(dotYouClient, params, ro);
//   return {
//     ...response,
//     searchResults: (
//       await Promise.all(
//         response.searchResults.map(
//           async (result) => await dsrToReaction(dotYouClient, result, ChatDrive, true)
//         )
//       )
//     ).filter(Boolean) as DriveSearchResult<ChatReaction>[],
//   };
// };

interface ServerReactionsListWithCursor {
  reactions: {
    odinId: string;
    reactionContent: string;
  }[];
  cursor: string;
}
const emojiRoot = '/drive/files/reactions';

export const getReactions = async (
  dotYouClient: DotYouClient,
  context: {
    target: {
      fileId: string;
      globalTransitId: string;
      targetDrive: TargetDrive;
    };
  },
  pageSize = 15,
  cursor?: string
): Promise<{ reactions: ReactionFile[]; cursor: string } | undefined> => {
  const client = dotYouClient.createAxiosClient();

  const data = {
    file: {
      targetDrive: context.target.targetDrive,
      fileId: context.target.fileId,
      globalTransitId: context.target.globalTransitId,
    },
    cursor: cursor,
    maxRecords: pageSize,
  };

  const url = emojiRoot + '/list';
  return client
    .post<ServerReactionsListWithCursor>(url, data)
    .then((response) => {
      return {
        reactions: response.data.reactions.map((reaction) => {
          return {
            authorOdinId: reaction.odinId,
            body: tryJsonParse<{ emoji: string }>(reaction.reactionContent).emoji,
          };
        }),
        cursor: response.data.cursor,
      };
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const uploadReaction = async (
  dotYouClient: DotYouClient,
  messageGlobalTransitId: string,
  reaction: string,
  recipients: string[]
) => {
  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient.post(`/transit/reactions/group-add`, {
    recipients: [...recipients, dotYouClient.getIdentity()],
    request: {
      file: {
        targetDrive: ChatDrive,
        globalTransitId: messageGlobalTransitId,
      },
      reaction: JSON.stringify({ emoji: reaction }),
    },
  });
};

export const deleteReaction = async (
  dotYouClient: DotYouClient,
  recipients: string[],
  emoji: ReactionFile,
  target: {
    fileId: string;
    globalTransitId: string;
    targetDrive: TargetDrive;
  }
) => {
  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient.post(`/transit/reactions/group-delete`, {
    recipients: [...recipients, dotYouClient.getIdentity()],
    request: {
      file: {
        targetDrive: ChatDrive,
        globalTransitId: target.globalTransitId,
      },
      reaction: JSON.stringify({ emoji: emoji.body }),
    },
  });
};

export const dsrToReaction = async (
  dotYouClient: DotYouClient,
  dsr: DriveSearchResult,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<DriveSearchResult<ChatReaction> | null> => {
  try {
    const attrContent = await getContentFromHeaderOrPayload<ChatReaction>(
      dotYouClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );
    if (!attrContent) return null;

    const chatReaction: DriveSearchResult<ChatReaction> = {
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
