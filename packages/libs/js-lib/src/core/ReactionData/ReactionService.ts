import { tryJsonParse } from '../../helpers/DataUtil';

import { DotYouClient } from '../DotYouClient';
import {
  EmojiReaction,
  FileIdFileIdentifier,
  GlobalTransitIdFileIdentifier,
} from '../DriveData/File/DriveFileTypes';
import { getLocalFileId, peerReactionsRootV2, reactionsRootV2 } from './ReactionRoutesV2';

export interface ServerReactionsListWithCursor {
  reactions: {
    odinId: string;
    reactionContent: string;
  }[];
  cursor: string;
}

// Local and peer routes take the same bodies, so a caller only needs the root: a local file by its fileId, and a file
// on another identity by its globalTransitId.
const getV2Root = (
  dotYouClient: DotYouClient,
  odinId: string | undefined,
  file: FileIdFileIdentifier | GlobalTransitIdFileIdentifier
): string => {
  if (odinId !== dotYouClient.getHostIdentity()) {
    const globalTransitId = 'globalTransitId' in file ? file.globalTransitId : undefined;
    if (!odinId || !globalTransitId) {
      throw new Error('A reaction on another identity needs its odinId and a globalTransitId');
    }
    return peerReactionsRootV2(odinId, file.targetDrive.alias, globalTransitId);
  }
  const fileId = getLocalFileId(file);
  if (!fileId) throw new Error('A reaction on a local file needs its fileId');
  return reactionsRootV2(file.targetDrive.alias, fileId);
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
): Promise<string> =>
  dotYouClient
    .createAxiosClient({ v2: true })
    .post(`${getV2Root(dotYouClient, odinId, file)}/add`, {
      reaction: JSON.stringify({ emoji: emoji }),
    })
    .then((response) => ({ ...response.data, status: response.data?.status?.toLowerCase() }))
    .catch(dotYouClient.handleErrorResponse);

// The server removes the caller's own reaction
export const deleteReaction = async (
  dotYouClient: DotYouClient,
  emoji: EmojiReaction,
  odinId: string | undefined,
  file: FileIdFileIdentifier | GlobalTransitIdFileIdentifier
): Promise<string> =>
  dotYouClient
    .createAxiosClient({ v2: true })
    .post(`${getV2Root(dotYouClient, odinId, file)}/delete`, {
      reaction: JSON.stringify({ emoji: emoji.body }),
    })
    .then((response) => ({ ...response.data, status: response.data?.status?.toLowerCase() }))
    .catch(dotYouClient.handleErrorResponse);

export const getReactions = async (
  dotYouClient: DotYouClient,
  odinId: string | undefined,
  file: FileIdFileIdentifier | GlobalTransitIdFileIdentifier,
  pageSize = 15,
  cursor?: string
): Promise<{ reactions: EmojiReaction[]; cursor: string } | undefined> =>
  dotYouClient
    .createAxiosClient({ v2: true })
    .post<ServerReactionsListWithCursor>(`${getV2Root(dotYouClient, odinId, file)}/list`, {
      cursor: cursor,
      maxRecords: pageSize,
    })
    .then((response) => mapReactionsList(response.data))
    .catch(dotYouClient.handleErrorResponse);
