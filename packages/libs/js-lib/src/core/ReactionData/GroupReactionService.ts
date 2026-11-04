import { stringifyToQueryParams, tryJsonParse } from '../../helpers/DataUtil';
import { DotYouClient } from '../DotYouClient';
import { EmojiReaction, TargetDrive } from '../DriveData/File/DriveFileTypes';
import { groupReactionsRootV2 } from './ReactionRoutesV2';

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
// V1. getGroupReactions and uploadGroupReaction address the message by globalTransitId only; V2's group
// reaction routes take a fileId in the path and have no by-gtid form, so those two stay here.
const emojiRoot = '/drive/files/group/reactions';

export const getGroupReactions = async (
  dotYouClient: DotYouClient,
  context: {
    target: {
      globalTransitId: string;
      targetDrive: TargetDrive;
    };
  },
  pageSize = 15,
  cursor?: string
): Promise<{ reactions: EmojiReaction[]; cursor: string } | undefined> => {
  const client = dotYouClient.createAxiosClient();

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
    .catch(dotYouClient.handleErrorResponse);
};

export const uploadGroupReaction = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  messageGlobalTransitId: string,
  reaction: string,
  recipients: string[]
) => {
  const axiosClient = dotYouClient.createAxiosClient();

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
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  recipients: string[],
  emoji: EmojiReaction,
  target: {
    fileId: string;
    globalTransitId: string;
    targetDrive: TargetDrive;
  }
) => {
  const reactionContent = JSON.stringify({ emoji: emoji.body });

  if (target.fileId) {
    // V2 reads the globalTransitId off the local file (target.fileId on target.targetDrive)
    return await dotYouClient
      .createAxiosClient({ v2: true })
      .delete(groupReactionsRootV2(target.targetDrive.alias, target.fileId), {
        data: {
          transitOptions: {
            recipients: [...recipients],
          },
          reaction: reactionContent,
        },
      });
  }

  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient.delete(emojiRoot, {
    data: {
      transitOptions: {
        recipients: [...recipients],
      },
      file: {
        targetDrive: targetDrive,
        globalTransitId: target.globalTransitId,
      },
      reaction: reactionContent,
    },
  });
};
