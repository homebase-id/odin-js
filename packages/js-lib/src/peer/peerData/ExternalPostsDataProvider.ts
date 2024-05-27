import { DotYouClient } from '../../core/DotYouClient';
import {
  CursoredResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  queryBatch,
  HomebaseFile,
  decryptKeyHeader,
  decryptJsonContent,
} from '../../core/core';
import { tryJsonParse } from '../../helpers/DataUtil';
import {
  ChannelDefinition,
  PostContent,
  BlogConfig,
  parseReactionPreview,
  getRecentPosts,
  getChannelDrive,
} from '../../public/public';
import { getDrivesByTypeOverPeer } from './Drive/PeerDriveProvider';
import { getContentFromHeaderOrPayloadOverPeerByGlobalTransitId } from './File/PeerFileByGlobalTransitProvider';
import { getContentFromHeaderOrPayloadOverPeer } from './File/PeerFileProvider';
import { queryBatchOverPeer } from './Query/PeerDriveQueryProvider';

const _internalChannelCache = new Map<string, Promise<HomebaseFile<ChannelDefinition>[]>>();

export interface RecentsFromConnectionsReturn extends CursoredResult<HomebaseFile<PostContent>[]> {
  ownerCursorState?: Record<string, string>;
}

export const getSocialFeed = async (
  dotYouClient: DotYouClient,
  pageSize = 10,
  cursorState?: string,
  ownOption?: {
    ownCursorState?: Record<string, string>;
    ownChannels?: HomebaseFile<ChannelDefinition>[];
  }
): Promise<RecentsFromConnectionsReturn> => {
  const feedDrive = BlogConfig.FeedDrive;

  // Query Batch the feed drive;
  const queryParams: FileQueryParams = {
    targetDrive: feedDrive,
    dataType: undefined,
    fileType: [BlogConfig.PostFileType],
  };

  const ro: GetBatchQueryResultOptions = {
    maxRecords: pageSize,
    cursorState: cursorState,
    includeMetadataHeader: true,
    ordering: 'newestFirst',
    sorting: 'userDate',
  };

  const result = await queryBatch(dotYouClient, queryParams, ro);

  // Parse results and do getPayload (In most cases, data should be there in content, and nothing in actual payload);
  const allPostFiles = (
    await Promise.all(
      result.searchResults.map(async (dsr) => {
        const odinId = dsr.fileMetadata.senderOdinId;
        // If the odinId is not set, we don't know who the author is, so we can't get the post; And something is up;
        if (!odinId) {
          console.warn('[ExtenalPostsDataProvider] Post without odinId', dsr?.fileId);
          return undefined;
        }
        return dsrToPostFile(dotYouClient, odinId, dsr, result.includeMetadataHeader);
      })
    )
  ).filter(Boolean) as HomebaseFile<PostContent>[];

  if (ownOption) {
    // const ownerDotYou = dotYouClient.getIdentity() || window.location.hostname;
    const resultOfOwn = await getRecentPosts(
      dotYouClient,
      undefined,
      false,
      ownOption.ownCursorState,
      pageSize,
      ownOption.ownChannels,
      true // include hidden channels
    );

    const postsOfOwn = resultOfOwn.results
      .filter((file) => file.fileMetadata.appData.fileType !== BlogConfig.DraftPostFileType)
      // We need to remove the senderOdinId, as it can be the authorOdinId in a grou channel, and that's not where it's actually stored
      .map((file) => ({ ...file, fileMetadata: { ...file.fileMetadata, senderOdinId: '' } }));

    return {
      results: [...allPostFiles, ...postsOfOwn].sort(
        (a, b) =>
          (b.fileMetadata.appData.userDate || b.fileMetadata.created) -
          (a.fileMetadata.appData.userDate || a.fileMetadata.created)
      ),
      cursorState: result.cursorState,
      ownerCursorState: resultOfOwn.cursorState,
    };
  }

  return {
    results: allPostFiles,
    cursorState: result.cursorState,
  };
};

export const getChannelsOverPeer = async (dotYouClient: DotYouClient, odinId: string) => {
  const cacheKey = `${odinId}`;
  if (_internalChannelCache.has(cacheKey)) {
    const cacheData = await _internalChannelCache.get(cacheKey);
    if (cacheData) {
      return cacheData;
    }
  }

  const drives = await getDrivesByTypeOverPeer(dotYouClient, BlogConfig.DriveType, 1, 1000, odinId);
  const channelHeaders = drives.results.map((drive) => {
    return {
      id: drive.targetDriveInfo.alias,
      name: drive.name,
    };
  });

  const promise = (async () => {
    return (
      await Promise.all(
        channelHeaders.map(async (header) => {
          const definition = await getChannelOverPeer(dotYouClient, odinId, header.id);
          return definition;
        })
      )
    ).filter((channel) => channel !== undefined) as HomebaseFile<ChannelDefinition>[];
  })();

  _internalChannelCache.set(cacheKey, promise);

  return await promise;
};

export const getChannelOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string,
  channelId: string
): Promise<HomebaseFile<ChannelDefinition> | undefined> => {
  const targetDrive = getChannelDrive(channelId);

  const queryParams: FileQueryParams = {
    targetDrive: targetDrive,
    fileType: [BlogConfig.ChannelDefinitionFileType],
  };

  const ro: GetBatchQueryResultOptions = {
    cursorState: undefined,
    maxRecords: 1,
    includeMetadataHeader: true,
  };

  const response = await queryBatchOverPeer(dotYouClient, odinId, queryParams, ro);

  try {
    if (response.searchResults.length == 1) {
      const dsr = response.searchResults[0];
      const definitionContent = await getContentFromHeaderOrPayloadOverPeer<ChannelDefinition>(
        dotYouClient,
        odinId,
        targetDrive,
        dsr,
        response.includeMetadataHeader
      );

      if (!definitionContent) return undefined;

      const file: HomebaseFile<ChannelDefinition> = {
        ...dsr,
        fileMetadata: {
          ...dsr.fileMetadata,
          appData: {
            ...dsr.fileMetadata.appData,
            content: definitionContent,
          },
        },
      };
      return file;
    }
  } catch (ex) {
    // Catch al, as targetDrive might be inaccesible (when it doesn't exist yet)
  }
};

export const getPostOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string,
  channelId: string,
  postId: string
) => {
  const targetDrive = getChannelDrive(channelId);
  const params: FileQueryParams = {
    tagsMatchAtLeastOne: [postId],
    targetDrive: targetDrive,
    fileType: [BlogConfig.PostFileType],
  };

  const response = await queryBatchOverPeer(dotYouClient, odinId, params);

  if (!response.searchResults || response.searchResults.length === 0) return undefined;

  if (response.searchResults.length > 1)
    console.warn(`Found more than one file with id [${postId}].  Using first entry.`);

  return dsrToPostFile(dotYouClient, odinId, response.searchResults[0], true);
};

const dsrToPostFile = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  odinId: string,
  dsr: HomebaseFile,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<T> | undefined> => {
  try {
    if (!dsr.fileMetadata.globalTransitId) return undefined;
    // The header as a mimimum should have the channel id
    const keyHeader = dsr.fileMetadata.isEncrypted
      ? await decryptKeyHeader(dotYouClient, dsr.sharedSecretEncryptedKeyHeader)
      : undefined;
    const decryptedJsonContent = await decryptJsonContent(dsr.fileMetadata, keyHeader);

    const parsedHeaderContent = tryJsonParse<PostContent>(decryptedJsonContent);
    const targetDrive =
      getChannelDrive(parsedHeaderContent?.channelId) || BlogConfig.PublicChannelDrive;

    const postContent = await getContentFromHeaderOrPayloadOverPeerByGlobalTransitId<T>(
      dotYouClient,
      odinId,
      targetDrive,
      {
        globalTransitId: dsr.fileMetadata.globalTransitId,
        ...dsr,
      },
      includeMetadataHeader
    );

    if (!postContent) return undefined;

    const file: HomebaseFile<T> = {
      ...dsr,
      fileMetadata: {
        ...dsr.fileMetadata,
        reactionPreview: parseReactionPreview(dsr.fileMetadata.reactionPreview),
        appData: {
          ...dsr.fileMetadata.appData,
          content: postContent,
        },
        // Fallback to the author odin id if the sender odin id is not set; (Sanity after the issues we had with the senderOdinId being reset)
        senderOdinId: dsr.fileMetadata.senderOdinId || postContent.authorOdinId,
      },
    };

    return file;
  } catch (ex) {
    console.error('[DotYouCore-js] failed to get the payload of a dsr', dsr, ex);
    return undefined;
  }
};
