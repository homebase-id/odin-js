import { DotYouClient, ApiType } from '../../core/DotYouClient';
import { queryBatch, getPayload } from '../../core/DriveData/DriveProvider';
import { FileQueryParams, GetBatchQueryResultOptions } from '../../core/DriveData/DriveTypes';
import {
  getPayloadOverTransit,
  getDrivesByTypeOverTransit,
  queryBatchOverTransit,
} from '../../core/TransitData/TransitProvider';
import { CursoredResult } from '../../core/Types';
import { getChannelDrive } from '../../public/posts/PostDefinitionProvider';
import { getRecentPosts } from '../../public/posts/PostProvider';
import { ChannelDefinition, PostContent, PostFile, BlogConfig } from '../../public/posts/PostTypes';

const _internalChannelCache = new Map<string, Promise<ChannelDefinition[]>>();

export interface PostFileVm<T extends PostContent> extends PostFile<T> {
  dotYouId: string;
}

export interface RecentsFromConnectionsReturn extends CursoredResult<PostFileVm<PostContent>[]> {
  ownerCursorState?: Record<string, string>;
}

export const getRecentsFromConnectionsOverTransit = async (
  dotYouClient: DotYouClient,
  pageSize = 10,
  cursorState?: string,
  includeOwn?: boolean,
  ownerCursorState?: Record<string, string>
): Promise<RecentsFromConnectionsReturn> => {
  const feedDrive = BlogConfig.FeedDrive; //BlogConfig.PublicChannelDrive;

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
  // Parsing has to include the actual dotYouId of the author as well, so the render components can render the correct author and fetch from the right transit
  const allPostFiles = await Promise.all(
    result.searchResults.map(async (dsr) => {
      const dotYouId = window.location.hostname; // Needs to be passed along into the header files on the feed drive
      const targetDrive = BlogConfig.PublicChannelDrive; // Needs to be passed along into the header files on the feed drive

      const isLocal = dotYouId === window.location.hostname;
      const getPayloadParams = [
        targetDrive,
        dsr.fileId,
        dsr.fileMetadata,
        dsr.sharedSecretEncryptedKeyHeader,
        result.includeMetadataHeader,
      ] as const;

      return {
        fileId: dsr.fileId,
        acl: dsr.serverMetadata?.accessControlList,
        content: isLocal
          ? await getPayload<PostContent>(dotYouClient, ...getPayloadParams)
          : await getPayloadOverTransit<PostContent>(dotYouClient, dotYouId, ...getPayloadParams),
        dotYouId: dsr.fileMetadata.senderDotYouId || dotYouId,
        previewThumbnail: dsr.fileMetadata.appData.previewThumbnail,
        additionalThumbnails: dsr.fileMetadata.appData.additionalThumbnails,
      } as PostFileVm<PostContent>;
    })
  );

  // Return the results (with a single cursor)
  // return {
  //   results: allPostFiles,
  //   cursorState: result.cursorState,
  // };

  if (includeOwn) {
    const dotYouClientOwner = new DotYouClient({
      api: ApiType.Owner,
      sharedSecret: dotYouClient.getSharedSecret(),
    });
    const ownerDotYou = window.location.hostname;
    const resultOfOwn = await getRecentPosts(
      dotYouClientOwner,
      undefined,
      false,
      ownerCursorState,
      pageSize
    );

    // allCursors[ownerDotYou] = resultOfOwn.cursorState;
    const postsOfOwn = resultOfOwn.results
      .filter((file) => !file.isDraft)
      .map((postFile) => {
        return { ...postFile, dotYouId: ownerDotYou } as PostFileVm<PostContent>;
      });

    return {
      results: [...allPostFiles, ...postsOfOwn],
      cursorState: result.cursorState,
      ownerCursorState: resultOfOwn.cursorState,
    };
  }

  return {
    results: allPostFiles,
    cursorState: result.cursorState,
  };
};

export const getChannelsOverTransit = async (dotYouClient: DotYouClient, dotYouId: string) => {
  const cacheKey = `${dotYouId}`;
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
    dotYouId
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
          const definition = await getChannelOverTransit(dotYouClient, dotYouId, header.id);
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
  dotYouId: string,
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

  const result = await queryBatchOverTransit(dotYouClient, dotYouId, queryParams, ro);

  const posts = (
    await Promise.all(
      result.searchResults.map(async (dsr) => {
        return {
          fileId: dsr.fileId,
          acl: dsr.serverMetadata?.accessControlList,
          content: await getPayloadOverTransit<PostContent>(
            dotYouClient,
            dotYouId,
            targetDrive,
            dsr.fileId,
            dsr.fileMetadata,
            dsr.sharedSecretEncryptedKeyHeader,
            result.includeMetadataHeader
          ),
          dotYouId: dotYouId,
          previewThumbnail: dsr.fileMetadata.appData.previewThumbnail,
          additionalThumbnails: dsr.fileMetadata.appData.additionalThumbnails,
        } as PostFileVm<PostContent>;
      })
    )
  ).filter((item) => !!item);

  return { cursorState: result.cursorState, results: posts };
};

export const getChannelOverTransit = async (
  dotYouClient: DotYouClient,
  dotYouId: string,
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

  const response = await queryBatchOverTransit(dotYouClient, dotYouId, queryParams, ro);

  try {
    if (response.searchResults.length == 1) {
      const dsr = response.searchResults[0];
      return await getPayloadOverTransit<ChannelDefinition>(
        dotYouClient,
        dotYouId,
        targetDrive,
        dsr.fileId,
        dsr.fileMetadata,
        dsr.sharedSecretEncryptedKeyHeader,
        response.includeMetadataHeader
      );
    }
  } catch (ex) {
    // Catch al, as targetDrive might be inaccesible (when it doesn't exist yet)
  }
};

export const getPostOverTransit = async (
  dotYouClient: DotYouClient,
  dotYouId: string,
  channelId: string,
  postId: string
) => {
  const channel = await getChannelOverTransit(dotYouClient, dotYouId, channelId);
  if (!channel) {
    return;
  }

  const targetDrive = getChannelDrive(channelId);
  const params: FileQueryParams = {
    tagsMatchAtLeastOne: [postId],
    targetDrive: targetDrive,
    fileType: [BlogConfig.PostFileType],
  };

  const response = await queryBatchOverTransit(dotYouClient, dotYouId, params);

  if (response.searchResults.length >= 1) {
    if (response.searchResults.length > 1) {
      console.warn(`Found more than one file with id [${postId}].  Using first entry.`);
    }

    const dsr = response.searchResults[0];
    return {
      fileId: dsr.fileId,
      acl: dsr.serverMetadata?.accessControlList,
      content: await getPayloadOverTransit<PostContent>(
        dotYouClient,
        dotYouId,
        targetDrive,
        dsr.fileId,
        dsr.fileMetadata,
        dsr.sharedSecretEncryptedKeyHeader,
        response.includeMetadataHeader
      ),
      dotYouId: dotYouId,
      previewThumbnail: dsr.fileMetadata.appData.previewThumbnail,
      additionalThumbnails: dsr.fileMetadata.appData.additionalThumbnails,
    } as PostFileVm<PostContent>;
  }

  return;
};
