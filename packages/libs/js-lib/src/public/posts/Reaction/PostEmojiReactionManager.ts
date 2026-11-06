import { DotYouClient } from '../../../core/DotYouClient';
import { deleteReaction, uploadReaction } from '../../../core/ReactionData/ReactionService';
import { getReactionsRootV2 } from '../../../core/ReactionData/ReactionRoutesV2';
import { tryJsonParse } from '../../../helpers/DataUtil';
import { getChannelDrive, GetTargetDriveFromChannelId } from '../Channel/PostChannelManager';
import { RawReactionContent, ReactionContext } from '../PostTypes';

import { EmojiReactionSummary } from './PostCommentReactionManager';

interface ServerReactionsSummary {
  reactions: { reactionContent: string; count: number }[];
  total: number;
}

export const saveEmojiReaction = async (
  dotYouClient: DotYouClient,
  emoji: RawReactionContent,
  context: ReactionContext
): Promise<string> => {
  return uploadReaction(dotYouClient, emoji.body, context.odinId, {
    ...context.target,
    targetDrive: getChannelDrive(context.channelId),
  });
};

export const removeEmojiReaction = async (
  dotYouClient: DotYouClient,
  emoji: RawReactionContent,
  context: ReactionContext
): Promise<string> => {
  return deleteReaction(dotYouClient, emoji, context.odinId, {
    ...context.target,
    targetDrive: getChannelDrive(context.channelId),
  });
};

const reactionsRoot = (dotYouClient: DotYouClient, context: ReactionContext) =>
  getReactionsRootV2(dotYouClient, context.odinId, {
    fileId: context.target.fileId,
    globalTransitId: context.target.globalTransitId,
    targetDrive: GetTargetDriveFromChannelId(context.channelId),
  });

const mapReactionsSummary = (data: ServerReactionsSummary): EmojiReactionSummary => ({
  reactions: data.reactions
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
  totalCount: data.total,
});

export const getReactionSummary = async (
  dotYouClient: DotYouClient,
  context: ReactionContext
): Promise<EmojiReactionSummary> =>
  dotYouClient
    .createAxiosClient({ v2: true })
    .post<ServerReactionsSummary>(`${reactionsRoot(dotYouClient, context)}/summary`, {})
    .then((response) => mapReactionsSummary(response.data))
    .catch((e) => {
      dotYouClient.handleErrorResponse(e);
      return { reactions: [], totalCount: 0 };
    });

const mapEmojiStrings = (data: string[] | undefined) =>
  data?.map((emojiString) => tryJsonParse<{ emoji: string }>(emojiString).emoji);

export const getMyReactions = async (
  dotYouClient: DotYouClient,
  odinId: string | undefined,
  context: ReactionContext
): Promise<string[] | undefined> =>
  dotYouClient
    .createAxiosClient({ v2: true })
    .post<string[]>(`${reactionsRoot(dotYouClient, context)}/listbyidentity`, {
      identity: odinId || dotYouClient.getHostIdentity(),
    })
    .then((response) => mapEmojiStrings(response.data))
    .catch(dotYouClient.handleErrorResponse);
