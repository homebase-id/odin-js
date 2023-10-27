import { DotYouClient } from '../../core/DotYouClient';
import {
  CursoredResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  queryBatch,
  DriveSearchResult,
  TargetDrive,
} from '../../core/core';
import {
  ChannelDefinition,
  PostContent,
  PostFile,
  BlogConfig,
  parseReactionPreview,
  getRecentPosts,
  getChannelDrive,
} from '../../public/public';
import {
  getPayloadOverTransit,
  getDrivesByTypeOverTransit,
  queryBatchOverTransit,
} from './TransitProvider';

const _internalChannelCache = new Map<string, Promise<ChannelDefinition[]>>();

export interface PostFileVm<T extends PostContent> extends PostFile<T> {
  odinId: string;
}

export interface RecentsFromConnectionsReturn extends CursoredResult<PostFileVm<PostContent>[]> {
  ownerCursorState?: Record<string, string>;
}

export const getSocialFeed = async (
  dotYouClient: DotYouClient,
  pageSize = 10,
  cursorState?: string,
  ownOption?: {
    ownCursorState?: Record<string, string>;
    ownChannels?: ChannelDefinition[];
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
  };

  const result = await queryBatch(dotYouClient, queryParams, ro);

  // Parse results and do getPayload (In most cases, data should be there in jsonContent, and nothing in actual payload);
  const allPostFiles = (
    await Promise.all(
      result.searchResults.map(async (dsr) => {
        const odinId = dsr.fileMetadata.senderOdinId || window.location.hostname;
        return dsrToPostFile(dotYouClient, odinId, dsr, feedDrive, result.includeMetadataHeader);
      })
    )
  ).filter(Boolean) as PostFileVm<PostContent>[];

  // TODO: Could optimize by combining both feed and own querybatch into a single querybatchcollection...
  if (ownOption) {
    const ownerDotYou = dotYouClient.getIdentity() || window.location.hostname;
    const resultOfOwn = await getRecentPosts(
      dotYouClient,
      undefined,
      false,
      ownOption.ownCursorState,
      pageSize,
      ownOption.ownChannels
    );

    const postsOfOwn = resultOfOwn.results
      .filter((file) => !file.isDraft)
      .map((postFile) => {
        return { ...postFile, odinId: ownerDotYou } as PostFileVm<PostContent>;
      });

    return {
      results: [...allPostFiles, ...postsOfOwn]
        .sort((a, b) => b.userDate - a.userDate)
        .slice(0, pageSize),
      cursorState: result.cursorState,
      ownerCursorState: resultOfOwn.cursorState,
    };
  }

  return {
    results: allPostFiles,
    cursorState: result.cursorState,
  };
};

export const getChannelsOverTransit = async (dotYouClient: DotYouClient, odinId: string) => {
  const cacheKey = `${odinId}`;
  if (_internalChannelCache.has(cacheKey)) {
    const cacheData = await _internalChannelCache.get(cacheKey);
    if (cacheData) {
      return cacheData;
    }
  }

  const drives = await getDrivesByTypeOverTransit(
    dotYouClient,
    BlogConfig.DriveType,
    1,
    1000,
    odinId
  );
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
          const definition = await getChannelOverTransit(dotYouClient, odinId, header.id);
          return definition;
        })
      )
    ).filter((channel) => channel !== undefined) as ChannelDefinition[];
  })();

  _internalChannelCache.set(cacheKey, promise);

  return await promise;
};

export const getRecentsOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  maxRecords = 10,
  cursorState?: string,
  channelId?: string
): Promise<CursoredResult<PostFileVm<PostContent>[]>> => {
  const targetDrive = channelId ? getChannelDrive(channelId) : BlogConfig.PublicChannelDrive;

  const queryParams: FileQueryParams = {
    targetDrive: targetDrive,
    fileType: [BlogConfig.PostFileType, BlogConfig.DraftPostFileType],
  };

  const ro: GetBatchQueryResultOptions = {
    cursorState: cursorState,
    maxRecords: maxRecords,
    includeMetadataHeader: true,
  };

  const result = await queryBatchOverTransit(dotYouClient, odinId, queryParams, ro);

  const posts = (
    await Promise.all(
      result.searchResults.map(async (dsr) => {
        return dsrToPostFile(dotYouClient, odinId, dsr, targetDrive, result.includeMetadataHeader);
      })
    )
  ).filter(Boolean) as PostFileVm<PostContent>[];

  return { cursorState: result.cursorState, results: posts };
};

export const getChannelOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  channelId: string
): Promise<ChannelDefinition | undefined> => {
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

  const response = await queryBatchOverTransit(dotYouClient, odinId, queryParams, ro);

  try {
    if (response.searchResults.length == 1) {
      const dsr = response.searchResults[0];
      return (
        (await getPayloadOverTransit<ChannelDefinition>(
          dotYouClient,
          odinId,
          targetDrive,
          dsr,
          response.includeMetadataHeader
        )) || undefined
      );
    }
  } catch (ex) {
    // Catch al, as targetDrive might be inaccesible (when it doesn't exist yet)
  }
};

export const getPostOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  channelId: string,
  postId: string
) => {
  const channel = await getChannelOverTransit(dotYouClient, odinId, channelId);
  if (!channel) {
    return;
  }

  const targetDrive = getChannelDrive(channelId);
  const params: FileQueryParams = {
    tagsMatchAtLeastOne: [postId],
    targetDrive: targetDrive,
    fileType: [BlogConfig.PostFileType],
  };

  const response = await queryBatchOverTransit(dotYouClient, odinId, params);

  if (response.searchResults.length >= 1) {
    if (response.searchResults.length > 1) {
      console.warn(`Found more than one file with id [${postId}].  Using first entry.`);
    }

    return dsrToPostFile(dotYouClient, odinId, response.searchResults[0], targetDrive, true);
  }

  return;
};

const dsrToPostFile = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  odinId: string,
  dsr: DriveSearchResult,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<PostFileVm<T> | undefined> => {
  try {
    const content = await getPayloadOverTransit<T>(
      dotYouClient,
      odinId,
      targetDrive,
      dsr,
      includeMetadataHeader
    );

    if (!content) return undefined;

    const file: PostFileVm<T> = {
      fileId: dsr.fileId,
      odinId: odinId,
      versionTag: dsr.fileMetadata.versionTag,
      globalTransitId: dsr.fileMetadata.globalTransitId,
      acl: dsr.serverMetadata?.accessControlList,
      userDate: dsr.fileMetadata.appData.userDate || dsr.fileMetadata.created,
      content: content,
      previewThumbnail: dsr.fileMetadata.appData.previewThumbnail,
      reactionPreview: parseReactionPreview(dsr.fileMetadata.reactionPreview),
      payloadIsEncrypted: dsr.fileMetadata.payloadIsEncrypted,
      isDraft: dsr.fileMetadata.appData.fileType === BlogConfig.DraftPostFileType,
    };

    return file;
  } catch (ex) {
    console.error('[DotYouCore-js] failed to get the payload of a dsr', dsr, ex);
    return undefined;
  }
};
