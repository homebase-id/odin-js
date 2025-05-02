import { tryJsonParse } from '../../helpers/DataUtil';

import { OdinClient } from '../OdinClient';
import {
  EmojiReaction,
  FileIdFileIdentifier,
  GlobalTransitIdFileIdentifier,
} from '../DriveData/File/DriveFileTypes';

const emojiRootTransit = '/transit/reactions';
const emojiRoot = '/drive/files/reactions';

export interface ServerReactionsListWithCursor {
  reactions: {
    odinId: string;
    reactionContent: string;
  }[];
  cursor: string;
}

export const uploadReaction = async (
  odinClient: OdinClient,
  emoji: string,
  odinId: string | undefined,
  file: FileIdFileIdentifier | GlobalTransitIdFileIdentifier
): Promise<string> => {
  const isLocal = odinId === odinClient.getHostIdentity();
  const client = odinClient.createAxiosClient();

  const data = {
    reaction: JSON.stringify({ emoji: emoji }),
    file: file,
  };

  if (isLocal) {
    const url = emojiRoot + '/add';
    return client
      .post(url, data)
      .then((response) => {
        return { ...response.data, status: response.data?.status?.toLowerCase() };
      })
      .catch(odinClient.handleErrorResponse);
  } else {
    const url = emojiRootTransit + '/add';
    return client
      .post(url, { odinId: odinId, request: data })
      .then((response) => ({ ...response.data, status: response.data?.status?.toLowerCase() }))
      .catch(odinClient.handleErrorResponse);
  }
};

export const deleteReaction = async (
  odinClient: OdinClient,
  emoji: EmojiReaction,
  odinId: string | undefined,
  file: FileIdFileIdentifier | GlobalTransitIdFileIdentifier
): Promise<string> => {
  const isLocal = odinId === odinClient.getHostIdentity();
  const client = odinClient.createAxiosClient();

  const data = {
    odinId: emoji.authorOdinId,
    reaction: JSON.stringify({ emoji: emoji.body }),
    file: file,
  };

  if (isLocal) {
    const url = emojiRoot + '/delete';
    return client
      .post(url, data)
      .then((response) => {
        return { ...response.data, status: response.data?.status?.toLowerCase() };
      })
      .catch(odinClient.handleErrorResponse);
  } else {
    const url = emojiRootTransit + '/delete';
    return client
      .post(url, { odinId: odinId, request: data })
      .then((response) => {
        return { ...response.data, status: response.data?.status?.toLowerCase() };
      })
      .catch(odinClient.handleErrorResponse);
  }
};

export const getReactions = async (
  odinClient: OdinClient,
  odinId: string | undefined,
  file: FileIdFileIdentifier | GlobalTransitIdFileIdentifier,
  pageSize = 15,
  cursor?: string
): Promise<{ reactions: EmojiReaction[]; cursor: string } | undefined> => {
  const isLocal = odinId === odinClient.getHostIdentity();
  const client = odinClient.createAxiosClient();

  const data = {
    file: file,
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
      .catch(odinClient.handleErrorResponse);
  } else {
    const url = emojiRootTransit + '/list';
    return client
      .post<ServerReactionsListWithCursor>(url, { odinId: odinId, request: data })
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
  }
};
