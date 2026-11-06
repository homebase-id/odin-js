import { stringifyToQueryParams, tryJsonParse } from '../../helpers/DataUtil';
import { DotYouClient } from '../DotYouClient';
import { EmojiReaction, TargetDrive } from '../DriveData/File/DriveFileTypes';
import { groupReactionsByGtidRootV2, groupReactionsRootV2 } from './ReactionRoutesV2';

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
  const client = dotYouClient.createAxiosClient({ v2: true });

  const data = {
    cursor: cursor,
    maxRecords: pageSize,
  };

  return client
    .get<ServerReactionsListWithCursor>(
      `${groupReactionsByGtidRootV2(context.target.targetDrive.alias, context.target.globalTransitId)}?${stringifyToQueryParams(data)}`
    )
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
  const axiosClient = dotYouClient.createAxiosClient({ v2: true });

  return await axiosClient.post(
    groupReactionsByGtidRootV2(targetDrive.alias, messageGlobalTransitId),
    {
      transitOptions: {
        recipients: [...recipients],
      },
      reaction: JSON.stringify({ emoji: reaction }),
    }
  );
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

  // With a fileId, V2 reads the globalTransitId off the local file (target.fileId on target.targetDrive)
  const route = target.fileId
    ? groupReactionsRootV2(target.targetDrive.alias, target.fileId)
    : groupReactionsByGtidRootV2(targetDrive.alias, target.globalTransitId);

  return await dotYouClient.createAxiosClient({ v2: true }).delete(route, {
    data: {
      transitOptions: {
        recipients: [...recipients],
      },
      reaction: reactionContent,
    },
  });
};
