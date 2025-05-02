import { stringifyToQueryParams, tryJsonParse } from '../../helpers/DataUtil';
import { OdinClient } from '../OdinClient';
import { EmojiReaction, TargetDrive } from '../DriveData/File/DriveFileTypes';

export interface GroupEmojiReaction {
  odinId: string;
  reactionContent: string;
  fileId: {
    // driveId: string; => Never exposed from the BE, but currently there...
    fileId: string;
  };
  created: number;
}

interface ServerReactionsListWithCursor {
  reactions: GroupEmojiReaction[];
  cursor: string;
}
const emojiRoot = '/drive/files/group/reactions';

export const getGroupReactions = async (
  odinClient: OdinClient,
  context: {
    target: {
      globalTransitId: string;
      targetDrive: TargetDrive;
    };
  },
  pageSize = 15,
  cursor?: string
): Promise<{ reactions: EmojiReaction[]; cursor: string } | undefined> => {
  const client = odinClient.createAxiosClient();

  const data = {
    'file.targetDrive.alias.value': context.target.targetDrive.alias,
    'file.targetDrive.type.value': context.target.targetDrive.type,
    'file.globalTransitId': context.target.globalTransitId,
    cursor: cursor,
    maxRecords: pageSize,
  };

  return client
    .get<ServerReactionsListWithCursor>(`${emojiRoot}?${stringifyToQueryParams(data)}`)
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
    .catch(odinClient.handleErrorResponse);
};

export const uploadGroupReaction = async (
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  messageGlobalTransitId: string,
  reaction: string,
  recipients: string[]
) => {
  const axiosClient = odinClient.createAxiosClient();

  return await axiosClient.post(emojiRoot, {
    transitOptions: {
      recipients: [...recipients],
    },
    file: {
      targetDrive: targetDrive,
      globalTransitId: messageGlobalTransitId,
    },
    reaction: JSON.stringify({ emoji: reaction }),
  });
};

export const deleteGroupReaction = async (
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  recipients: string[],
  emoji: EmojiReaction,
  target: {
    fileId: string;
    globalTransitId: string;
    targetDrive: TargetDrive;
  }
) => {
  const axiosClient = odinClient.createAxiosClient();

  return await axiosClient.delete(emojiRoot, {
    data: {
      transitOptions: {
        recipients: [...recipients],
      },
      file: {
        targetDrive: targetDrive,
        globalTransitId: target.globalTransitId,
      },
      reaction: JSON.stringify({ emoji: emoji.body }),
    },
  });
};
