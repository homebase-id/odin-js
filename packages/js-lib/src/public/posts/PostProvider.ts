import { getChannelDefinitions, GetTargetDriveFromChannelId } from './PostDefinitionProvider';
import { parseReactionPreview } from './PostReactionProvider';
import {
  BlogConfig,
  PostContent,
  ChannelDefinition,
  PostFile,
  PostType,
  postTypeToDataType,
} from './PostTypes';

import {
  CursoredResult,
  deleteFile,
  DotYouClient,
  DriveSearchResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  getFileHeader,
  getContentFromHeaderOrPayload,
  MultiRequestCursoredResult,
  queryBatch,
  queryBatchCollection,
  TargetDrive,
} from '../../core/core';
import { toGuidId } from '../../helpers/DataUtil';

//Gets posts. if type is specified, returns a filtered list of the requested type; otherwise all types are returned
export const getPosts = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  channelId: string,
  type: PostType | undefined,
  includeDrafts: true | 'only' | false,
  cursorState: string | undefined = undefined,
  pageSize = 10
): Promise<CursoredResult<PostFile<T>[]>> => {
  const targetDrive = GetTargetDriveFromChannelId(channelId);
  const params: FileQueryParams = {
    targetDrive: targetDrive,
    dataType: type ? [postTypeToDataType(type)] : undefined,
    fileType:
      includeDrafts === 'only'
        ? [BlogConfig.DraftPostFileType]
        : [
            BlogConfig.PostFileType,
            ...(includeDrafts === true ? [BlogConfig.DraftPostFileType] : []),
          ],
  };

  const ro: GetBatchQueryResultOptions = {
    maxRecords: pageSize,
    cursorState: cursorState,
    includeMetadataHeader: true,
  };

  const response = await queryBatch(dotYouClient, params, ro);

  const posts: PostFile<T>[] = (
    await Promise.all(
      response.searchResults.map(
        async (dsr) =>
          await dsrToPostFile(dotYouClient, dsr, targetDrive, response.includeMetadataHeader)
      )
    )
  ).filter((post) => !!post) as PostFile<T>[];

  return { cursorState: response.cursorState, results: posts };
};

//Gets posts across all channels, ordered by date
export const getRecentPosts = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  type: PostType | undefined,
  includeDrafts: true | 'only' | false,
  cursorState: Record<string, string> | undefined = undefined,
  pageSize = 10,
  channels?: ChannelDefinition[],
  includeHiddenChannels = false
): Promise<MultiRequestCursoredResult<PostFile<T>[]>> => {
  const chnls = channels || (await getChannelDefinitions(dotYouClient));
  const allCursors: Record<string, string> = {};

  const queries = chnls
    ?.filter((chnl) => includeHiddenChannels || chnl.showOnHomePage)
    .map((chnl) => {
      const targetDrive = GetTargetDriveFromChannelId(chnl.channelId);
      const params: FileQueryParams = {
        targetDrive: targetDrive,
        dataType: type ? [postTypeToDataType(type)] : undefined,
        fileType:
          includeDrafts === 'only'
            ? [BlogConfig.DraftPostFileType]
            : [
                BlogConfig.PostFileType,
                ...(includeDrafts === true ? [BlogConfig.DraftPostFileType] : []),
              ],
      };

      const ro: GetBatchQueryResultOptions = {
        maxRecords: pageSize,
        cursorState: cursorState?.[chnl.channelId],
        includeMetadataHeader: true,
      };

      return {
        name: chnl.channelId,
        queryParams: params,
        resultOptions: ro,
      };
    });

  const response = await queryBatchCollection(dotYouClient, queries);
  const postsPerChannel = await Promise.all(
    response.results.map(async (result) => {
      const targetDrive = GetTargetDriveFromChannelId(result.name);

      const posts: PostFile<T>[] = (
        await Promise.all(
          result.searchResults.map(
            async (dsr) =>
              await dsrToPostFile(dotYouClient, dsr, targetDrive, result.includeMetadataHeader)
          )
        )
      ).filter((post) => !!post) as PostFile<T>[];

      allCursors[result.name] = result.cursorState;
      return { posts, cursorState: result.cursorState };
    })
  );

  const sortedPosts = postsPerChannel
    .flatMap((chnl) => chnl?.posts)
    .sort((a, b) => b.userDate - a.userDate);

  return { results: sortedPosts, cursorState: allCursors };
};

export const getPostByFileId = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  channelId: string,
  fileId: string
): Promise<PostFile<T> | undefined> => {
  const targetDrive = GetTargetDriveFromChannelId(channelId);
  const header = await getFileHeader(dotYouClient, targetDrive, fileId);
  if (header) return await dsrToPostFile(dotYouClient, header, targetDrive, true);
};

//Gets the content for a given post id
export const getPost = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  channelId: string,
  id: string
): Promise<PostFile<T> | undefined> => {
  const targetDrive = GetTargetDriveFromChannelId(channelId);
  const params: FileQueryParams = {
    tagsMatchAtLeastOne: [id],
    targetDrive: targetDrive,
    fileType: [BlogConfig.PostFileType, BlogConfig.DraftPostFileType],
  };

  const response = await queryBatch(dotYouClient, params);

  if (response.searchResults.length >= 1) {
    if (response.searchResults.length > 1) {
      console.warn(`Found more than one file with alias [${id}].  Using first entry.`);
    }

    const dsr = response.searchResults[0];
    return await dsrToPostFile<T>(dotYouClient, dsr, targetDrive, response.includeMetadataHeader);
  }

  return;
};

export const getPostBySlug = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  channelId: string,
  postSlug: string
): Promise<PostFile<T> | undefined> => {
  const targetDrive = GetTargetDriveFromChannelId(channelId);
  const params: FileQueryParams = {
    clientUniqueIdAtLeastOne: [toGuidId(postSlug)],
    targetDrive: targetDrive,
    fileType: [BlogConfig.PostFileType, BlogConfig.DraftPostFileType],
  };

  const response = await queryBatch(dotYouClient, params);

  if (response.searchResults.length >= 1) {
    if (response.searchResults.length > 1) {
      console.warn(`Found more than one file with alias [${postSlug}].  Using first entry.`);
    }

    const dsr = response.searchResults[0];
    return await dsrToPostFile<T>(dotYouClient, dsr, targetDrive, response.includeMetadataHeader);
  }
  return;
};

export const removePost = async (dotYouClient: DotYouClient, fileId: string, channelId: string) => {
  const targetDrive = GetTargetDriveFromChannelId(channelId);
  deleteFile(dotYouClient, targetDrive, fileId);
};

///

export const dsrToPostFile = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  dsr: DriveSearchResult,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<PostFile<T> | undefined> => {
  try {
    const content = await getContentFromHeaderOrPayload<T>(
      dotYouClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );

    if (!content) return undefined;

    const file: PostFile<T> = {
      fileId: dsr.fileId,
      versionTag: dsr.fileMetadata.versionTag,
      globalTransitId: dsr.fileMetadata.globalTransitId,
      acl: dsr.serverMetadata?.accessControlList,
      userDate: dsr.fileMetadata.appData.userDate || dsr.fileMetadata.created,
      content: content,
      previewThumbnail: dsr.fileMetadata.appData.previewThumbnail,
      reactionPreview: parseReactionPreview(dsr.fileMetadata.reactionPreview),
      isEncrypted: dsr.fileMetadata.isEncrypted,
      isDraft: dsr.fileMetadata.appData.fileType === BlogConfig.DraftPostFileType,
    };

    return file;
  } catch (ex) {
    console.error('[DotYouCore-js] failed to get the payload of a dsr', dsr, ex);
    return undefined;
  }
};
