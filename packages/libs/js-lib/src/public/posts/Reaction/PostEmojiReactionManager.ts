import { AxiosError } from 'axios';
import { DotYouClient } from '../../../core/DotYouClient';
import { deleteReaction, uploadReaction } from '../../../core/ReactionData/ReactionService';
import { peerReactionsRootV2, reactionsRootV2 } from '../../../core/ReactionData/ReactionRoutesV2';
import { tryJsonParse } from '../../../helpers/DataUtil';
import { getChannelDrive, GetTargetDriveFromChannelId } from '../Channel/PostChannelManager';
import { RawReactionContent, ReactionContext } from '../PostTypes';

import { EmojiReactionSummary } from './PostCommentReactionManager';

interface ServerReactionsSummary {
  reactions: { reactionContent: string; count: number }[];
  total: number;
}

const emojiRoot = '/drive/files/reactions';
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
): Promise<EmojiReactionSummary> => {
  const isLocal = context.odinId === dotYouClient.getHostIdentity();

  const handleSummaryError = (e: AxiosError): EmojiReactionSummary => {
    dotYouClient.handleErrorResponse(e);
    return { reactions: [], totalCount: 0 };
  };

  const driveId = GetTargetDriveFromChannelId(context.channelId).alias;

  // Another identity's file, by the globalTransitId both copies share
  if (!isLocal) {
    return dotYouClient
      .createAxiosClient({ v2: true })
      .post<ServerReactionsSummary>(
        `${peerReactionsRootV2(context.odinId, driveId, context.target.globalTransitId)}/summary`,
        {}
      )
      .then((response) => mapReactionsSummary(response.data))
      .catch(handleSummaryError);
  }

  // V2 addresses a local file by fileId; the channel id is the drive alias. Cursor and max are ignored.
  // An anonymous visitor stays on V1: V2 reaction routes need a signed-in caller (OwnerOrAppOrGuest)
  if (isLocal && context.target.fileId && dotYouClient.isAuthenticated()) {
    return dotYouClient
      .createAxiosClient({ v2: true })
      .post<ServerReactionsSummary>(`${reactionsRootV2(driveId, context.target.fileId)}/summary`, {
        maxRecords: 5,
      })
      .then((response) => mapReactionsSummary(response.data))
      .catch(handleSummaryError);
  }

  const client = dotYouClient.createAxiosClient();

  const data = {
    file: {
      targetDrive: GetTargetDriveFromChannelId(context.channelId),
      fileId: context.target.fileId,
      globalTransitId: context.target.globalTransitId,
    },
    cursor: undefined,
    maxRecords: 5,
  };

  return client
    .post<ServerReactionsSummary>(emojiRoot + '/summary', data)
    .then((response) => mapReactionsSummary(response.data))
    .catch(handleSummaryError);
};

const mapEmojiStrings = (data: string[] | undefined) =>
  data?.map((emojiString) => tryJsonParse<{ emoji: string }>(emojiString).emoji);

export const getMyReactions = async (
  dotYouClient: DotYouClient,
  odinId: string | undefined,
  context: ReactionContext,
  pageSize = 15,
  cursor?: string
): Promise<string[] | undefined> => {
  const isLocal = context.odinId === dotYouClient.getHostIdentity();
  const identity = odinId || dotYouClient.getHostIdentity();
  const driveId = GetTargetDriveFromChannelId(context.channelId).alias;

  // Another identity's file, by the globalTransitId both copies share
  if (!isLocal) {
    return dotYouClient
      .createAxiosClient({ v2: true })
      .post<string[]>(
        `${peerReactionsRootV2(context.odinId, driveId, context.target.globalTransitId)}/listbyidentity`,
        { identity: identity }
      )
      .then((response) => mapEmojiStrings(response.data))
      .catch(dotYouClient.handleErrorResponse);
  }

  // An anonymous visitor stays on V1: V2 reaction routes need a signed-in caller (OwnerOrAppOrGuest)
  if (isLocal && context.target.fileId && dotYouClient.isAuthenticated()) {
    return dotYouClient
      .createAxiosClient({ v2: true })
      .post<string[]>(`${reactionsRootV2(driveId, context.target.fileId)}/listbyidentity`, {
        identity: identity,
      })
      .then((response) => mapEmojiStrings(response.data))
      .catch(dotYouClient.handleErrorResponse);
  }

  const client = dotYouClient.createAxiosClient();

  const data = {
    file: {
      targetDrive: GetTargetDriveFromChannelId(context.channelId),
      fileId: context.target.fileId,
      globalTransitId: context.target.globalTransitId,
    },
    identity: identity,
    cursor: cursor,
    maxRecords: pageSize,
  };

  return client
    .post<string[]>(emojiRoot + '/listbyidentity', data)
    .then((response) => mapEmojiStrings(response.data))
    .catch(dotYouClient.handleErrorResponse);
};
