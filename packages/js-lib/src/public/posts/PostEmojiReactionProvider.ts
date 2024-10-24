import { DotYouClient } from '../../core/DotYouClient';
import { ReactionFile } from '../../core/DriveData/File/DriveFileReactionTypes';
import { tryJsonParse } from '../../helpers/DataUtil';
import { GetTargetDriveFromChannelId } from './PostDefinitionProvider';
import { EmojiReactionSummary } from './PostReactionProvider';
import { RawReactionContent, ReactionContext } from './PostTypes';

interface ServerReactionsSummary {
  reactions: { reactionContent: string; count: number }[];
  total: number;
}

interface ServerReactionsListWithCursor {
  reactions: {
    odinId: string;
    reactionContent: string;
  }[];
  cursor: string;
}

// TODO: Replace all of this with the new GroupReactionsProvider
const emojiRootTransit = '/transit/reactions';
const emojiRoot = '/drive/files/reactions';
export const saveEmojiReaction = async (
  dotYouClient: DotYouClient,
  emoji: RawReactionContent,
  context: ReactionContext
): Promise<string> => {
  const isLocal = context.odinId === dotYouClient.getIdentity();
  const client = dotYouClient.createAxiosClient();

  const data = {
    reaction: JSON.stringify({ emoji: emoji.body }),
    file: {
      targetDrive: GetTargetDriveFromChannelId(context.channelId),
      fileId: context.target.fileId,
      globalTransitId: context.target.globalTransitId,
    },
  };

  if (isLocal) {
    const url = emojiRoot + '/add';
    return client
      .post(url, data)
      .then((response) => {
        return { ...response.data, status: response.data?.status?.toLowerCase() };
      })
      .catch(dotYouClient.handleErrorResponse);
  } else {
    const url = emojiRootTransit + '/add';
    return client
      .post(url, { odinId: context.odinId, request: data })
      .then((response) => ({ ...response.data, status: response.data?.status?.toLowerCase() }))
      .catch(dotYouClient.handleErrorResponse);
  }
};

export const removeEmojiReaction = async (
  dotYouClient: DotYouClient,
  emoji: RawReactionContent,
  context: ReactionContext
): Promise<string> => {
  const isLocal = context.odinId === dotYouClient.getIdentity();
  const client = dotYouClient.createAxiosClient();

  const data = {
    odinId: emoji.authorOdinId,
    reaction: JSON.stringify({ emoji: emoji.body }),
    file: {
      targetDrive: GetTargetDriveFromChannelId(context.channelId),
      fileId: context.target.fileId,
      globalTransitId: context.target.globalTransitId,
    },
  };

  if (isLocal) {
    const url = emojiRoot + '/delete';
    return client
      .post(url, data)
      .then((response) => {
        return { ...response.data, status: response.data?.status?.toLowerCase() };
      })
      .catch(dotYouClient.handleErrorResponse);
  } else {
    const url = emojiRootTransit + '/delete';
    return client
      .post(url, { odinId: context.odinId, request: data })
      .then((response) => {
        return { ...response.data, status: response.data?.status?.toLowerCase() };
      })
      .catch(dotYouClient.handleErrorResponse);
  }
};

export const getReactionSummary = async (
  dotYouClient: DotYouClient,
  context: ReactionContext
): Promise<EmojiReactionSummary> => {
  const isLocal = context.odinId === dotYouClient.getIdentity();

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
        dotYouClient.handleErrorResponse(e);
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
        dotYouClient.handleErrorResponse(e);
        return { reactions: [], totalCount: 0 };
      });
  }
};

export const getReactions = async (
  dotYouClient: DotYouClient,
  context: ReactionContext,
  pageSize = 15,
  cursor?: string
): Promise<{ reactions: ReactionFile[]; cursor: string } | undefined> => {
  const isLocal = context.odinId === dotYouClient.getIdentity();
  const client = dotYouClient.createAxiosClient();

  const data = {
    file: {
      targetDrive: GetTargetDriveFromChannelId(context.channelId),
      fileId: context.target.fileId,
      globalTransitId: context.target.globalTransitId,
    },
    cursor: cursor,
    maxRecords: pageSize,
  };

  if (isLocal) {
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
  } else {
    const url = emojiRootTransit + '/list';
    return client
      .post<ServerReactionsListWithCursor>(url, { odinId: context.odinId, request: data })
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
  }
};

export const getMyReactions = async (
  dotYouClient: DotYouClient,
  odinId: string | undefined,
  context: ReactionContext,
  pageSize = 15,
  cursor?: string
): Promise<string[] | undefined> => {
  const isLocal = context.odinId === dotYouClient.getIdentity();
  const client = dotYouClient.createAxiosClient();

  const data = {
    file: {
      targetDrive: GetTargetDriveFromChannelId(context.channelId),
      fileId: context.target.fileId,
      globalTransitId: context.target.globalTransitId,
    },
    identity: odinId || dotYouClient.getIdentity(),
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
      .catch(dotYouClient.handleErrorResponse);
  } else {
    const url = emojiRootTransit + '/listbyidentity';
    return client
      .post<string[]>(url, { odinId: context.odinId, ...data })
      .then((response) => {
        return response.data?.map(
          (emojiString) => tryJsonParse<{ emoji: string }>(emojiString).emoji
        );
      })
      .catch(dotYouClient.handleErrorResponse);
  }
};
