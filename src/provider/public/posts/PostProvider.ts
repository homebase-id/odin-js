import { toGuidId, getNewId, jsonStringify64, stringToUint8Array } from '../../core/DataUtil';
import { DotYouClient } from '../../core/DotYouClient';
import {
  deleteFile,
  getPayload,
  getRandom16ByteArray,
  queryBatch,
  uploadFile,
} from '../../core/DriveData/DriveProvider';
import {
  DriveSearchResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  TargetDrive,
} from '../../core/DriveData/DriveTypes';
import {
  SecurityGroupType,
  UploadInstructionSet,
  UploadFileMetadata,
  UploadResult,
} from '../../core/DriveData/DriveUploadTypes';
import { CursoredResult, MultiRequestCursoredResult } from '../../core/Types';
import {
  getChannelDefinition,
  getChannelDefinitionBySlug,
  getChannelDefinitions,
  GetTargetDriveFromChannelId,
} from './PostDefinitionProvider';
import {
  BlogConfig,
  PostContent,
  ChannelDefinition,
  PostFile,
  PostType,
  postTypeToDataType,
} from './PostTypes';

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
  pageSize = 10
): Promise<MultiRequestCursoredResult<PostFile<T>[]>> => {
  const channels = await getChannelDefinitions(dotYouClient);
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
    const postFile = await dsrToPostFile<T>(
      dotYouClient,
      dsr,
      targetDrive,
      response.includeMetadataHeader
    );
    if (!postFile) {
      return undefined;
    }

    return {
      postFile: postFile,
      channel: channel,
    };
  }

  return;
};

export const savePost = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  file: PostFile<T>,
  channelId: string
): Promise<string> => {
  if (!file.content.id) {
    file.content.id = file.content.slug ? toGuidId(file.content.slug) : getNewId();
  } else if (!file.fileId) {
    // Check if content.id exists and with which fileId
    file.fileId = (await getPost(dotYouClient, channelId, file.content.id))?.fileId ?? undefined;
  }

  const encrypt = !(
    file.acl?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    file.acl?.requiredSecurityGroup === SecurityGroupType.Authenticated
  );

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: file?.fileId ?? '',
      drive: GetTargetDriveFromChannelId(channelId),
    },
    transitOptions: null,
  };

  const payloadJson: string = jsonStringify64(file.content);
  const payloadBytes = stringToUint8Array(payloadJson);

  const existingPostWithThisSlug = (
    await getPostBySlug(dotYouClient, channelId, file.content.slug ?? file.content.id)
  )?.postFile;
  if (existingPostWithThisSlug && existingPostWithThisSlug?.content.id !== file.content.id) {
    // There is clash with the current slug
    file.content.slug = `${file.content.slug}-${new Date().getTime()}`;
  }

  const uniqueId = file.content.slug ? toGuidId(file.content.slug) : file.content.id;

  // Set max of 3kb for jsonContent so enough room is left for metadata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const metadata: UploadFileMetadata = {
    allowDistribution: true,
    contentType: 'application/json',
    appData: {
      tags: [file.content.id],
      uniqueId: uniqueId,
      contentIsComplete: shouldEmbedContent,
      fileType:
        file.acl?.requiredSecurityGroup === SecurityGroupType.Owner
          ? BlogConfig.DraftPostFileType
          : BlogConfig.PostFileType,
      jsonContent: shouldEmbedContent ? payloadJson : null,
      previewThumbnail: file.previewThumbnail,
      userDate: file.content.dateUnixTime,
      dataType: postTypeToDataType(file.content.type),
    },
    payloadIsEncrypted: encrypt,
    accessControlList: file.acl,
  };

  const result: UploadResult = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    payloadBytes,
    undefined,
    encrypt
  );

  return result.file.fileId;
};

export const removePost = async (dotYouClient: DotYouClient, fileId: string, channelId: string) => {
  const targetDrive = GetTargetDriveFromChannelId(channelId);
  deleteFile(dotYouClient, targetDrive, fileId);
};

///

const dsrToPostFile = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  dsr: DriveSearchResult,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<PostFile<T> | undefined> => {
  try {
    const content = await getPayload<T>(
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
  } catch (ex) {
    console.error('[DotYouCore-js] failed to get the payload of a dsr', dsr, ex);
    return undefined;
  }
};
