import { tryJsonParse } from '../../helpers/DataUtil';

import { DotYouClient } from '../DotYouClient';
import {
  EmojiReaction,
  FileIdFileIdentifier,
  GlobalTransitIdFileIdentifier,
} from '../DriveData/File/DriveFileTypes';
import { getLocalFileId, peerReactionsRootV2, reactionsRootV2 } from './ReactionRoutesV2';

const emojiRoot = '/drive/files/reactions';

export interface ServerReactionsListWithCursor {
  reactions: {
    odinId: string;
    reactionContent: string;
  }[];
  cursor: string;
}

// Local and peer routes take the same bodies, so a caller only needs the root. A local file with a fileId, and
// any file on another identity (by its globalTransitId), go to V2. A local file with no fileId keeps V1.
const getV2Root = (
  dotYouClient: DotYouClient,
  odinId: string | undefined,
  file: FileIdFileIdentifier | GlobalTransitIdFileIdentifier
): string | undefined => {
  if (odinId !== dotYouClient.getHostIdentity()) {
    const globalTransitId = 'globalTransitId' in file ? file.globalTransitId : undefined;
    if (!odinId || !globalTransitId) {
      throw new Error('A reaction on another identity needs its odinId and a globalTransitId');
    }
    return peerReactionsRootV2(odinId, file.targetDrive.alias, globalTransitId);
  }
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

  const client = dotYouClient.createAxiosClient();

  const data = {
    reaction: JSON.stringify({ emoji: emoji }),
    file: file,
  };

  return client
    .post(emojiRoot + '/add', data)
    .then((response) => {
      return { ...response.data, status: response.data?.status?.toLowerCase() };
    })
    .catch(dotYouClient.handleErrorResponse);
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

  const client = dotYouClient.createAxiosClient();

  const data = {
    odinId: emoji.authorOdinId,
    reaction: JSON.stringify({ emoji: emoji.body }),
    file: file,
  };

  return client
    .post(emojiRoot + '/delete', data)
    .then((response) => {
      return { ...response.data, status: response.data?.status?.toLowerCase() };
    })
    .catch(dotYouClient.handleErrorResponse);
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

  const client = dotYouClient.createAxiosClient();

  const data = {
    file: file,
    cursor: cursor,
    maxRecords: pageSize,
  };

  return client
    .post<ServerReactionsListWithCursor>(emojiRoot + '/list', data)
    .then((response) => mapReactionsList(response.data))
    .catch(dotYouClient.handleErrorResponse);
};
