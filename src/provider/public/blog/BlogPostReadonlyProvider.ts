import { DataUtil } from '../../core/DataUtil';
import { DotYouClient } from '../../core/DotYouClient';
import { GetPayload, QueryBatch } from '../../core/DriveData/DriveProvider';
import {
  DriveSearchResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  TargetDrive,
} from '../../core/DriveData/DriveTypes';
import { CursoredResult, MultiRequestCursoredResult } from '../../core/Types';
import {
  getChannelDefinition,
  getChannelDefinitionBySlug,
  getChannelDefinitions,
  GetTargetDriveFromChannelId,
} from './BlogDefinitionProvider';
import {
  BlogConfig,
  PostContent,
  ChannelDefinition,
  PostFile,
  PostType,
  postTypeToDataType,
} from './BlogTypes';

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

  const response = await QueryBatch(dotYouClient, params, ro);

  const posts: PostFile<T>[] = [];
  for (const key in response.searchResults) {
    const dsr = response.searchResults[key];
    posts.push(await dsrToPostFile(dotYouClient, dsr, targetDrive, response.includeMetadataHeader));
  }

  return { cursorState: response.cursorState, results: posts };
};

//Gets posts across all channels, ordered by date
export const getRecentPosts = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  type: PostType | undefined,
  includeDrafts: true | 'only' | false,
  cursorState: Record<string, string> | undefined = undefined,
  pageSize = 10
): Promise<MultiRequestCursoredResult<PostFile<T>[]>> => {
  const channels = await getChannels(dotYouClient);
  const allCursors: Record<string, string> = {};
  const resultPerChannel = await Promise.all(
    channels.map(async (channel) => {
      const result = await getPosts<T>(
        dotYouClient,
        channel.channelId,
        type,
        includeDrafts,
        cursorState?.[channel.channelId],
        pageSize
      );

      allCursors[channel.channelId] = result.cursorState;
      return result.results;
    })
  );
  // Sorted descending
  const sortedPosts = resultPerChannel
    .flat(1)
    .sort((a, b) => b.content.dateUnixTime - a.content.dateUnixTime);

  return { results: sortedPosts, cursorState: allCursors };
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

  const response = await QueryBatch(dotYouClient, params);

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
  channelSlug: string,
  postSlug: string
): Promise<{ postFile: PostFile<T>; channel: ChannelDefinition } | undefined> => {
  const channel =
    (await getChannelDefinitionBySlug(dotYouClient, channelSlug)) ??
    (await getChannelDefinition(dotYouClient, channelSlug));
  if (!channel) {
    return;
  }

  const targetDrive = GetTargetDriveFromChannelId(channel.channelId);
  const params: FileQueryParams = {
    clientUniqueIdAtLeastOne: [DataUtil.toGuidId(postSlug)],
    targetDrive: targetDrive,
    fileType: [BlogConfig.PostFileType, BlogConfig.DraftPostFileType],
  };

  const response = await QueryBatch(dotYouClient, params);

  if (response.searchResults.length >= 1) {
    if (response.searchResults.length > 1) {
      console.warn(`Found more than one file with alias [${postSlug}].  Using first entry.`);
    }

    const dsr = response.searchResults[0];
    return {
      postFile: await dsrToPostFile<T>(
        dotYouClient,
        dsr,
        targetDrive,
        response.includeMetadataHeader
      ),
      channel: channel,
    };
  }

  return;
};

export const getChannels = async (dotYouClient: DotYouClient): Promise<ChannelDefinition[]> => {
  const channels = await getChannelDefinitions(dotYouClient);
  return channels;
};

///

const dsrToPostFile = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  dsr: DriveSearchResult,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<PostFile<T>> => {
  const content = await GetPayload<T>(
    dotYouClient,
    targetDrive,
    dsr.fileId,
    dsr.fileMetadata,
    dsr.sharedSecretEncryptedKeyHeader,
    includeMetadataHeader
  );

  const file: PostFile<T> = {
    fileId: dsr.fileId,
    acl: dsr.serverMetadata?.accessControlList,
    content: content,
    previewThumbnail: dsr.fileMetadata.appData.previewThumbnail,
    payloadIsEncrypted: dsr.fileMetadata.payloadIsEncrypted,
    isDraft: dsr.fileMetadata.appData.fileType === BlogConfig.DraftPostFileType,
  };

  return file;
};
