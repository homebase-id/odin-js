import {
  DotYouClient,
  HomebaseFile,
  ReactionFile,
  TargetDrive,
  getContentFromHeaderOrPayload,
} from '@youfoundation/js-lib/core';
import { ChatDrive } from './ConversationProvider';
import { tryJsonParse } from '@youfoundation/js-lib/helpers';

export const ChatReactionFileType = 7979;
const PAGE_SIZE = 100;

export interface ChatReaction {
  // Content of the reaction
  message: string;
}

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
