import { getChannelDefinitions, GetTargetDriveFromChannelId } from './PostDefinitionProvider';
import { parseReactionPreview } from './PostReactionProvider';
import {
  BlogConfig,
  PostContent,
  ChannelDefinition,
  PostType,
  postTypeToDataType,
} from './PostTypes';

import {
  CursoredResult,
  deleteFile,
  DotYouClient,
  HomebaseFile,
  FileQueryParams,
  GetBatchQueryResultOptions,
  getFileHeader,
  getContentFromHeaderOrPayload,
  MultiRequestCursoredResult,
  queryBatch,
  queryBatchCollection,
  TargetDrive,
  deleteFilesByGroupId,
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
): Promise<CursoredResult<HomebaseFile<T>[]>> => {
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

  const posts: HomebaseFile<T>[] = (
    await Promise.all(
      response.searchResults.map(
        async (dsr) =>
          await dsrToPostFile(dotYouClient, dsr, targetDrive, response.includeMetadataHeader)
      )
    )
  ).filter((post) => !!post) as HomebaseFile<T>[];

  return { cursorState: response.cursorState, results: posts };
};

//Gets posts across all channels, ordered by date
export const getRecentPosts = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  type: PostType | undefined,
  includeDrafts: true | 'only' | false,
  cursorState: Record<string, string> | undefined = undefined,
  pageSize = 10,
  channels?: HomebaseFile<ChannelDefinition>[],
  includeHiddenChannels = false
): Promise<MultiRequestCursoredResult<HomebaseFile<T>[]>> => {
  const chnls = channels || (await getChannelDefinitions(dotYouClient));
  const allCursors: Record<string, string> = {};

  const queries = chnls
    ?.filter((chnl) => includeHiddenChannels || chnl.fileMetadata.appData.content.showOnHomePage)
    .map((chnl) => {
      const targetDrive = GetTargetDriveFromChannelId(chnl.fileMetadata.appData.uniqueId as string);
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
        cursorState: cursorState?.[chnl.fileMetadata.appData.uniqueId as string],
        includeMetadataHeader: true,
      };

      return {
        name: chnl.fileMetadata.appData.uniqueId as string,
        queryParams: params,
        resultOptions: ro,
      };
    });

  const response = await queryBatchCollection(dotYouClient, queries);
  const postsPerChannel = await Promise.all(
    response.results.map(async (result) => {
      const targetDrive = GetTargetDriveFromChannelId(result.name);

      const posts: HomebaseFile<T>[] = (
        await Promise.all(
          result.searchResults.map(
            async (dsr) =>
              await dsrToPostFile(dotYouClient, dsr, targetDrive, result.includeMetadataHeader)
          )
        )
      ).filter((post) => !!post) as HomebaseFile<T>[];

      allCursors[result.name] = result.cursorState;
      return { posts, cursorState: result.cursorState };
    })
  );

  const sortedPosts = postsPerChannel
    .flatMap((chnl) => chnl?.posts)
    .sort(
      (a, b) =>
        (b.fileMetadata.appData.userDate || b.fileMetadata.created) -
        (a.fileMetadata.appData.userDate || a.fileMetadata.created)
    );

  return { results: sortedPosts, cursorState: allCursors };
};

export const getPostByFileId = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  channelId: string,
  fileId: string
): Promise<HomebaseFile<T> | undefined> => {
  const targetDrive = GetTargetDriveFromChannelId(channelId);
  const header = await getFileHeader(dotYouClient, targetDrive, fileId);
  if (header) return await dsrToPostFile(dotYouClient, header, targetDrive, true);
};

//Gets the content for a given post id
export const getPost = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  channelId: string,
  id: string
): Promise<HomebaseFile<T> | undefined> => {
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
): Promise<HomebaseFile<T> | undefined> => {
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

export const removePost = async (
  dotYouClient: DotYouClient,
  postFile: HomebaseFile<PostContent>,
  channelId: string
) => {
  const targetDrive = GetTargetDriveFromChannelId(channelId);

  if (postFile.fileMetadata.globalTransitId) {
    // Fetch the first 1000 comments and delete them with the post;
    // TODO: this should support a larger numbers of comments; Or a delete of a tree of groupIds
    const comments = (
      await queryBatch(
        dotYouClient,
        {
          targetDrive: targetDrive,
          groupId: [postFile.fileMetadata.globalTransitId],
          systemFileType: 'Comment',
        },
        {
          maxRecords: 1000,
        }
      )
    ).searchResults;

    await deleteFilesByGroupId(
      dotYouClient,
      targetDrive,
      [
        ...(comments.map((cmnt) => cmnt.fileMetadata.globalTransitId).filter(Boolean) as string[]),
        postFile.fileMetadata.globalTransitId,
      ],
      undefined,
      'Comment'
    );
  }

  return await deleteFile(dotYouClient, targetDrive, postFile.fileId);
};

///

export const dsrToPostFile = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<T> | undefined> => {
  try {
    const postContent = await getContentFromHeaderOrPayload<T>(
      dotYouClient,
      targetDrive,
      dsr,
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
      },
    };

    return file;
  } catch (ex) {
    console.error('[DotYouCore-js] failed to get the payload of a dsr', dsr, ex);
    return undefined;
  }
};
