import { DotYouClient, ApiType } from '../DotYouClient';
import { queryBatch, getPayload } from '../DriveData/DriveProvider';
import {
  EncryptedKeyHeader,
  FileMetadata,
  FileQueryParams,
  GetBatchQueryResultOptions,
} from '../DriveData/DriveTypes';
import {
  getPayloadOverTransit,
  getDrivesByTypeOverTransit,
  queryBatchOverTransit,
} from './TransitProvider';
import { CursoredResult } from '../helpers/Types';
import {
  getChannelDrive,
  GetTargetDriveFromChannelId,
} from '../../public-app/posts/PostDefinitionProvider';
import { getRecentPosts } from '../../public-app/posts/PostProvider';
import { parseReactionPreview } from '../../public-app/posts/PostReactionProvider';
import {
  ChannelDefinition,
  PostContent,
  PostFile,
  BlogConfig,
} from '../../public-app/posts/PostTypes';
import { decryptKeyHeader, decryptJsonContent } from '../DriveData/SecurityHelpers';

const _internalChannelCache = new Map<string, Promise<ChannelDefinition[]>>();

export interface PostFileVm<T extends PostContent> extends PostFile<T> {
  odinId: string;
}

export interface RecentsFromConnectionsReturn extends CursoredResult<PostFileVm<PostContent>[]> {
  ownerCursorState?: Record<string, string>;
}

const getSocialFeedPostPayload = async (
  odinId: string,
  dotYouClient: DotYouClient,
  fileId: string,
  fileMetadata: FileMetadata,
  sharedSecretEncryptedKeyHeader: EncryptedKeyHeader,
  includesJsonContent: boolean
) => {
  const isLocal = odinId === window.location.hostname;

  const getPayloadParams = [
    // targetDrive,
    { fileId, fileMetadata, sharedSecretEncryptedKeyHeader },
    includesJsonContent,
  ] as const;

  if (!includesJsonContent) {
    // Shouldn't ever happen..
    console.error('[DotYouCore-js] Missing content');
  }

  // Get and parse Json Content
  const keyheader = fileMetadata.payloadIsEncrypted
    ? await decryptKeyHeader(dotYouClient, sharedSecretEncryptedKeyHeader)
    : undefined;

  const contentFromHeader = await decryptJsonContent<PostContent>(fileMetadata, keyheader);
  if (fileMetadata.appData.contentIsComplete) return contentFromHeader;

  // Content isn't complete, we fetch the payload from the source drive with the drive baesd on the channelId in the post:
  const targetDrive =
    GetTargetDriveFromChannelId(contentFromHeader.channelId) || BlogConfig.PublicChannelDrive;
  return isLocal
    ? await getPayload<PostContent>(dotYouClient, targetDrive, ...getPayloadParams)
    : await getPayloadOverTransit<PostContent>(
        dotYouClient,
        odinId,
        targetDrive,
        ...getPayloadParams
      );
};

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
  const allPostFiles = await Promise.all(
    result.searchResults.map(async (dsr) => {
      const odinId = dsr.fileMetadata.senderOdinId || window.location.hostname;

      return {
        fileId: dsr.fileId,
        globalTransitId: dsr.fileMetadata.globalTransitId,
        acl: dsr.serverMetadata?.accessControlList,
        content: await getSocialFeedPostPayload(
          odinId,
          dotYouClient,
          dsr.fileId,
          dsr.fileMetadata,
          dsr.sharedSecretEncryptedKeyHeader,
          result.includeMetadataHeader
        ),
        odinId: odinId,
        previewThumbnail: dsr.fileMetadata.appData.previewThumbnail,
        reactionPreview: parseReactionPreview(dsr.fileMetadata.reactionPreview),
        additionalThumbnails: dsr.fileMetadata.appData.additionalThumbnails,
        payloadIsEncrypted: dsr.fileMetadata.payloadIsEncrypted,
      } as PostFileVm<PostContent>;
    })
  );

  // TODO: Could optimize by combining both feed and own querybatch into a single querybatchcollection...
  if (ownOption) {
    const dotYouClientOwner = new DotYouClient({
      api: ApiType.Owner,
      sharedSecret: dotYouClient.getSharedSecret(),
    });
    const ownerDotYou = window.location.hostname;
    const resultOfOwn = await getRecentPosts(
      dotYouClientOwner,
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
        return {
          fileId: dsr.fileId,
          globalTransitId: dsr.fileMetadata.globalTransitId,
          acl: dsr.serverMetadata?.accessControlList,
          content: await getPayloadOverTransit<PostContent>(
            dotYouClient,
            odinId,
            targetDrive,
            dsr,
            result.includeMetadataHeader
          ),
          odinId: odinId,
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
      return await getPayloadOverTransit<ChannelDefinition>(
        dotYouClient,
        odinId,
        targetDrive,
        dsr,
        response.includeMetadataHeader
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

    const dsr = response.searchResults[0];
    return {
      fileId: dsr.fileId,
      globalTransitId: dsr.fileMetadata.globalTransitId,
      acl: dsr.serverMetadata?.accessControlList,
      content: await getPayloadOverTransit<PostContent>(
        dotYouClient,
        odinId,
        targetDrive,
        dsr,
        response.includeMetadataHeader
      ),
      odinId: odinId,
      previewThumbnail: dsr.fileMetadata.appData.previewThumbnail,
      additionalThumbnails: dsr.fileMetadata.appData.additionalThumbnails,
    } as PostFileVm<PostContent>;
  }

  return;
};
