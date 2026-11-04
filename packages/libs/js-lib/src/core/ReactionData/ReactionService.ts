import { tryJsonParse } from '../../helpers/DataUtil';

import { DotYouClient } from '../DotYouClient';
import {
  EmojiReaction,
  FileIdFileIdentifier,
  GlobalTransitIdFileIdentifier,
} from '../DriveData/File/DriveFileTypes';
import { getLocalFileId, reactionsRootV2 } from './ReactionRoutesV2';

const emojiRootTransit = '/transit/reactions';
const emojiRoot = '/drive/files/reactions';

export interface ServerReactionsListWithCursor {
  reactions: {
    odinId: string;
    reactionContent: string;
  }[];
  cursor: string;
}

// A local file with a fileId goes to V2; another identity's file, or a file addressed only by
// globalTransitId, keeps its V1 route (V2 has neither). So does an anonymous visitor: V2's reaction
// routes are OwnerOrAppOrGuest, which needs a signed-in caller, where V1's guest routes answer anyone.
const getV2Root = (
  dotYouClient: DotYouClient,
  odinId: string | undefined,
  file: FileIdFileIdentifier | GlobalTransitIdFileIdentifier
): string | undefined => {
  if (odinId !== dotYouClient.getHostIdentity()) return undefined;
  if (!dotYouClient.isAuthenticated()) return undefined;
  const fileId = getLocalFileId(file);
  return fileId ? reactionsRootV2(file.targetDrive.alias, fileId) : undefined;
};

const mapReactionsList = (data: ServerReactionsListWithCursor) => ({
  reactions: data.reactions.map((reaction) => ({
    authorOdinId: reaction.odinId,
    body: tryJsonParse<{ emoji: string }>(reaction.reactionContent).emoji,
  })),
  cursor: data.cursor,
});

export const uploadReaction = async (
  dotYouClient: DotYouClient,
  emoji: string,
  odinId: string | undefined,
  file: FileIdFileIdentifier | GlobalTransitIdFileIdentifier
): Promise<string> => {
  const v2Root = getV2Root(dotYouClient, odinId, file);
  if (v2Root) {
    return dotYouClient
      .createAxiosClient({ v2: true })
      .post(`${v2Root}/add`, { reaction: JSON.stringify({ emoji: emoji }) })
      .then((response) => ({ ...response.data, status: response.data?.status?.toLowerCase() }))
      .catch(dotYouClient.handleErrorResponse);
  }

  const isLocal = odinId === dotYouClient.getHostIdentity();
  const client = dotYouClient.createAxiosClient();

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
      .catch(dotYouClient.handleErrorResponse);
  } else {
    const url = emojiRootTransit + '/add';
    return client
      .post(url, { odinId: odinId, request: data })
      .then((response) => ({ ...response.data, status: response.data?.status?.toLowerCase() }))
      .catch(dotYouClient.handleErrorResponse);
  }
};

export const deleteReaction = async (
  dotYouClient: DotYouClient,
  emoji: EmojiReaction,
  odinId: string | undefined,
  file: FileIdFileIdentifier | GlobalTransitIdFileIdentifier
): Promise<string> => {
  const v2Root = getV2Root(dotYouClient, odinId, file);
  if (v2Root) {
    // The server removes the caller's own reaction; V1's odinId field is not part of the request
    return dotYouClient
      .createAxiosClient({ v2: true })
      .post(`${v2Root}/delete`, { reaction: JSON.stringify({ emoji: emoji.body }) })
      .then((response) => ({ ...response.data, status: response.data?.status?.toLowerCase() }))
      .catch(dotYouClient.handleErrorResponse);
  }

  const isLocal = odinId === dotYouClient.getHostIdentity();
  const client = dotYouClient.createAxiosClient();

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
      .catch(dotYouClient.handleErrorResponse);
  } else {
    const url = emojiRootTransit + '/delete';
    return client
      .post(url, { odinId: odinId, request: data })
      .then((response) => {
        return { ...response.data, status: response.data?.status?.toLowerCase() };
      })
      .catch(dotYouClient.handleErrorResponse);
  }
};

export const getReactions = async (
  dotYouClient: DotYouClient,
  odinId: string | undefined,
  file: FileIdFileIdentifier | GlobalTransitIdFileIdentifier,
  pageSize = 15,
  cursor?: string
): Promise<{ reactions: EmojiReaction[]; cursor: string } | undefined> => {
  const v2Root = getV2Root(dotYouClient, odinId, file);
  if (v2Root) {
    return dotYouClient
      .createAxiosClient({ v2: true })
      .post<ServerReactionsListWithCursor>(`${v2Root}/list`, {
        cursor: cursor,
        maxRecords: pageSize,
      })
      .then((response) => mapReactionsList(response.data))
      .catch(dotYouClient.handleErrorResponse);
  }

  const isLocal = odinId === dotYouClient.getHostIdentity();
  const client = dotYouClient.createAxiosClient();

  const data = {
    file: file,
    cursor: cursor,
    maxRecords: pageSize,
  };

  if (isLocal) {
    const url = emojiRoot + '/list';
    return client
      .post<ServerReactionsListWithCursor>(url, data)
      .then((response) => mapReactionsList(response.data))
      .catch(dotYouClient.handleErrorResponse);
  } else {
    const url = emojiRootTransit + '/list';
    return client
      .post<ServerReactionsListWithCursor>(url, { odinId: odinId, request: data })
      .then((response) => mapReactionsList(response.data))
      .catch(dotYouClient.handleErrorResponse);
  }
};
