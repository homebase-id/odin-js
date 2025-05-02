import { OdinClient } from '../../../core/OdinClient';
import { deleteReaction, uploadReaction } from '../../../core/ReactionData/ReactionService';
import { tryJsonParse } from '../../../helpers/DataUtil';
import { getChannelDrive, GetTargetDriveFromChannelId } from '../Channel/PostChannelManager';
import { RawReactionContent, ReactionContext } from '../PostTypes';

import { EmojiReactionSummary } from './PostCommentReactionManager';

interface ServerReactionsSummary {
  reactions: { reactionContent: string; count: number }[];
  total: number;
}

const emojiRootTransit = '/transit/reactions';
const emojiRoot = '/drive/files/reactions';
export const saveEmojiReaction = async (
  odinClient: OdinClient,
  emoji: RawReactionContent,
  context: ReactionContext
): Promise<string> => {
  return uploadReaction(odinClient, emoji.body, context.odinId, {
    ...context.target,
    targetDrive: getChannelDrive(context.channelId),
  });
};

export const removeEmojiReaction = async (
  odinClient: OdinClient,
  emoji: RawReactionContent,
  context: ReactionContext
): Promise<string> => {
  return deleteReaction(odinClient, emoji, context.odinId, {
    ...context.target,
    targetDrive: getChannelDrive(context.channelId),
  });
};

export const getReactionSummary = async (
  odinClient: OdinClient,
  context: ReactionContext
): Promise<EmojiReactionSummary> => {
  const isLocal = context.odinId === odinClient.getHostIdentity();

  const client = odinClient.createAxiosClient();

  const data = {
    file: {
      targetDrive: GetTargetDriveFromChannelId(context.channelId),
      fileId: context.target.fileId,
      globalTransitId: context.target.globalTransitId,
    },
    cursor: undefined,
    maxRecords: 5,
  };

  if (isLocal) {
    const url = emojiRoot + '/summary';
    return client
      .post<ServerReactionsSummary>(url, data)
      .then((response) => {
        return {
          reactions: response.data.reactions
            .map((reaction) => {
              try {
                return {
                  emoji: tryJsonParse<{ emoji: string }>(reaction.reactionContent).emoji,
                  count: reaction.count,
                };
              } catch {
                console.error('[odin-js] parse failed for', reaction);
                return;
              }
            })
            .filter(Boolean) as { emoji: string; count: number }[],
          totalCount: response.data.total,
        };
      })
      .catch((e) => {
        odinClient.handleErrorResponse(e);
        return { reactions: [], totalCount: 0 };
      });
  } else {
    const url = emojiRootTransit + '/summary';
    return client
      .post<ServerReactionsSummary>(url, { odinId: context.odinId, request: data })
      .then((response) => {
        return {
          reactions: response.data.reactions
            .map((reaction) => {
              try {
                return {
                  emoji: tryJsonParse<{ emoji: string }>(reaction.reactionContent).emoji,
                  count: reaction.count,
                };
              } catch {
                console.error('[odin-js] parse failed for', reaction);
                return;
              }
            })
            .filter(Boolean) as { emoji: string; count: number }[],
          totalCount: response.data.total,
        };
      })
      .catch((e) => {
        odinClient.handleErrorResponse(e);
        return { reactions: [], totalCount: 0 };
      });
  }
};

export const getMyReactions = async (
  odinClient: OdinClient,
  odinId: string | undefined,
  context: ReactionContext,
  pageSize = 15,
  cursor?: string
): Promise<string[] | undefined> => {
  const isLocal = context.odinId === odinClient.getHostIdentity();
  const client = odinClient.createAxiosClient();

  const data = {
    file: {
      targetDrive: GetTargetDriveFromChannelId(context.channelId),
      fileId: context.target.fileId,
      globalTransitId: context.target.globalTransitId,
    },
    identity: odinId || odinClient.getHostIdentity(),
    cursor: cursor,
    maxRecords: pageSize,
  };

  if (isLocal) {
    const url = emojiRoot + '/listbyidentity';
    return client
      .post<string[]>(url, data)
      .then((response) => {
        return response.data?.map(
          (emojiString) => tryJsonParse<{ emoji: string }>(emojiString).emoji
        );
      })
      .catch(odinClient.handleErrorResponse);
  } else {
    const url = emojiRootTransit + '/listbyidentity';
    return client
      .post<string[]>(url, { odinId: context.odinId, ...data })
      .then((response) => {
        return response.data?.map(
          (emojiString) => tryJsonParse<{ emoji: string }>(emojiString).emoji
        );
      })
      .catch(odinClient.handleErrorResponse);
  }
};
