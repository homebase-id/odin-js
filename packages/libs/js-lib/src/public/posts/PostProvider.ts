import { getChannelDefinitions, GetTargetDriveFromChannelId } from './Channel/PostChannelManager';
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
  OdinClient,
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
  getFileHeaderBytesByUniqueId,
  getFileHeaderByGlobalTransitId,
} from '../../core/core';
import { toGuidId } from '../../helpers/DataUtil';

//Gets posts. if type is specified, returns a filtered list of the requested type; otherwise all types are returned
export const getPosts = async <T extends PostContent>(
  odinClient: OdinClient,
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
    ordering: 'newestFirst',
    sorting: 'userDate',
  };

  const response = await queryBatch(odinClient, params, ro);

  const posts: HomebaseFile<T>[] = (
    await Promise.all(
      response.searchResults.map(
        async (dsr) =>
          await dsrToPostFile(odinClient, dsr, targetDrive, response.includeMetadataHeader)
      )
    )
  ).filter((post) => !!post) as HomebaseFile<T>[];

  return { cursorState: response.cursorState, results: posts };
};

//Gets posts across all channels, ordered by date
export const getRecentPosts = async <T extends PostContent>(
  odinClient: OdinClient,
  type: PostType | undefined,
  includeDrafts: true | 'only' | false,
  cursorState: Record<string, string> | undefined = undefined,
  pageSize = 10,
  channels?: HomebaseFile<ChannelDefinition>[],
  includeHiddenChannels = false
): Promise<MultiRequestCursoredResult<HomebaseFile<T>[]>> => {
  const chnls = channels || (await getChannelDefinitions(odinClient));
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
        ordering: 'newestFirst',
        sorting: 'userDate',
      };

      return {
        name: chnl.fileMetadata.appData.uniqueId as string,
        queryParams: params,
        resultOptions: ro,
      };
    });

  const response = await queryBatchCollection(odinClient, queries);
  const postsPerChannel = await Promise.all(
    response.results.map(async (result) => {
      const targetDrive = GetTargetDriveFromChannelId(result.name);

      const posts: HomebaseFile<T>[] = (
        await Promise.all(
          result.searchResults.map(
            async (dsr) =>
              await dsrToPostFile(odinClient, dsr, targetDrive, result.includeMetadataHeader)
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
  odinClient: OdinClient,
  channelId: string,
  fileId: string
): Promise<HomebaseFile<T> | null> => {
  const targetDrive = GetTargetDriveFromChannelId(channelId);
  const header = await getFileHeader(odinClient, targetDrive, fileId);
  if (header) return await dsrToPostFile(odinClient, header, targetDrive, true);
  return null;
};

export const getPostByGlobalTransitId = async <T extends PostContent>(
  odinClient: OdinClient,
  channelId: string,
  globalTransitId: string
): Promise<HomebaseFile<T> | null> => {
  const targetDrive = GetTargetDriveFromChannelId(channelId);
  const header = await getFileHeaderByGlobalTransitId(odinClient, targetDrive, globalTransitId);
  if (header) return await dsrToPostFile(odinClient, header, targetDrive, true);
  return null;
};

//Gets the content for a given post id
export const getPost = async <T extends PostContent>(
  odinClient: OdinClient,
  channelId: string,
  id: string
): Promise<HomebaseFile<T> | null> => {
  const targetDrive = GetTargetDriveFromChannelId(channelId);
  const params: FileQueryParams = {
    tagsMatchAtLeastOne: [id],
    targetDrive: targetDrive,
    fileType: [BlogConfig.PostFileType, BlogConfig.DraftPostFileType],
  };

  const response = await queryBatch(odinClient, params);

  if (response.searchResults.length >= 1) {
    if (response.searchResults.length > 1) {
      console.warn(`Found more than one file with alias [${id}].  Using first entry.`);
    }

    const dsr = response.searchResults[0];
    return await dsrToPostFile<T>(odinClient, dsr, targetDrive, response.includeMetadataHeader);
  }

  return null;
};

export const getPostBySlug = async <T extends PostContent>(
  odinClient: OdinClient,
  channelId: string,
  postSlug: string
): Promise<HomebaseFile<T> | null> => {
  const targetDrive = GetTargetDriveFromChannelId(channelId);
  const dsr = await getFileHeaderBytesByUniqueId(odinClient, targetDrive, toGuidId(postSlug), {
    decrypt: false,
  });

  if (!dsr) return null;
  return await dsrToPostFile<T>(odinClient, dsr, targetDrive, true);
};

export const removePost = async (
  odinClient: OdinClient,
  postFile: HomebaseFile<PostContent>,
  channelId: string
) => {
  const targetDrive = GetTargetDriveFromChannelId(channelId);

  if (postFile.fileMetadata.globalTransitId) {
    // Fetch the first 1000 comments and delete their level 2 replies by groupId;
    const comments = (
      await queryBatch(
        odinClient,
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
      odinClient,
      targetDrive,
      [
        ...(comments.map((cmnt) => cmnt.fileMetadata.globalTransitId).filter(Boolean) as string[]),
        postFile.fileMetadata.globalTransitId,
      ],
      undefined,
      'Comment'
    );
  }

  return await deleteFile(odinClient, targetDrive, postFile.fileId);
};

///

export const dsrToPostFile = async <T extends PostContent>(
  odinClient: OdinClient,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<T> | null> => {
  try {
    const postContent = await getContentFromHeaderOrPayload<T>(
      odinClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );

    if (!postContent) return null;

    const file: HomebaseFile<T> = {
      ...dsr,
      fileMetadata: {
        ...dsr.fileMetadata,
        originalAuthor:
          dsr.fileMetadata.originalAuthor ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (postContent as any)?.authorOdinId ||
          dsr.fileMetadata.senderOdinId,
        appData: {
          ...dsr.fileMetadata.appData,
          content: postContent,
        },
      },
    };

    return file;
  } catch (ex) {
    console.error('[odin-js] failed to get the payload of a dsr', dsr, ex);
    return null;
  }
};
