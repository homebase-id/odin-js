import { tryJsonParse } from '../../helpers/DataUtil';

import { DotYouClient } from '../DotYouClient';
import {
  EmojiReaction,
  FileIdFileIdentifier,
  GlobalTransitIdFileIdentifier,
} from '../DriveData/File/DriveFileTypes';
import { getReactionsRootV2 } from './ReactionRoutesV2';

export interface ServerReactionsListWithCursor {
  reactions: {
    odinId: string;
    reactionContent: string;
  }[];
  cursor: string;
}

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
    .post(`${getReactionsRootV2(dotYouClient, odinId, file)}/add`, {
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
    .post(`${getReactionsRootV2(dotYouClient, odinId, file)}/delete`, {
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
    .post<ServerReactionsListWithCursor>(`${getReactionsRootV2(dotYouClient, odinId, file)}/list`, {
      cursor: cursor,
      maxRecords: pageSize,
    })
    .then((response) => mapReactionsList(response.data))
    .catch(dotYouClient.handleErrorResponse);
