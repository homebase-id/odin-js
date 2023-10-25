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
import { getRandom16ByteArray } from '../../core/DriveData/UploadHelpers';
import {
  CursoredResult,
  deleteFile,
  DotYouClient,
  DriveSearchResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  getFileHeader,
  getPayload,
  MultiRequestCursoredResult,
  queryBatch,
  queryBatchCollection,
  ScheduleOptions,
  SecurityGroupType,
  SendContents,
  TargetDrive,
  uploadFile,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../../core/core';
import { toGuidId, getNewId, jsonStringify64, stringToUint8Array } from '../../helpers/DataUtil';

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
  channels?: ChannelDefinition[]
): Promise<MultiRequestCursoredResult<PostFile<T>[]>> => {
  const chnls = channels || (await getChannelDefinitions(dotYouClient));
  const allCursors: Record<string, string> = {};

  const queries = chnls.map((chnl) => {
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

export const savePost = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  file: PostFile<T>,
  channelId: string,
  onVersionConflict?: () => void
): Promise<UploadResult> => {
  if (!file.content.id) {
    file.content.id = file.content.slug ? toGuidId(file.content.slug) : getNewId();
  } else if (!file.fileId) {
    // Check if content.id exists and with which fileId
    file.fileId = (await getPost(dotYouClient, channelId, file.content.id))?.fileId ?? undefined;
  }

  if (!file.content.authorOdinId) file.content.authorOdinId = dotYouClient.getIdentity();

  // Delete embeddedPost of embeddedPost (we don't want to embed an embed)
  if (file.content.embeddedPost) {
    delete (file.content.embeddedPost as any)['embeddedPost'];
  }

  const encrypt = !(
    file.acl?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    file.acl?.requiredSecurityGroup === SecurityGroupType.Authenticated
  );

  const targetDrive = GetTargetDriveFromChannelId(channelId);
  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: file?.fileId ?? '',
      drive: targetDrive,
    },
    transitOptions: {
      useGlobalTransitId: true,
      recipients: [],
      schedule: ScheduleOptions.SendLater,
      sendContents: SendContents.All,
    },
  };

  const existingPostWithThisSlug = await getPostBySlug(
    dotYouClient,
    channelId,
    file.content.slug ?? file.content.id
  );

  if (existingPostWithThisSlug && existingPostWithThisSlug?.content.id !== file.content.id) {
    // There is clash with the current slug
    file.content.slug = `${file.content.slug}-${new Date().getTime()}`;
  }
  const uniqueId = file.content.slug ? toGuidId(file.content.slug) : file.content.id;

  const payloadJson: string = jsonStringify64(file.content);
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for jsonContent so enough room is left for metadata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const jsonContent = shouldEmbedContent
    ? payloadJson
    : jsonStringify64({ channelId: file.content.channelId }); // If the full payload can't be embedded into the header file, at least pass the channelId so when getting the location is known

  const isDraft = file.isDraft ?? false;

  // Updating images in place is a rare thing, but if it happens there is often no versionTag, so we need to fetch it first
  let versionTag = file?.versionTag;
  if (!versionTag && file?.fileId) {
    versionTag = await getFileHeader(dotYouClient, targetDrive, file.fileId).then(
      (header) => header?.fileMetadata.versionTag
    );
  }

  const metadata: UploadFileMetadata = {
    versionTag: versionTag,
    allowDistribution: !isDraft,
    contentType: 'application/json',
    appData: {
      tags: [file.content.id],
      uniqueId: uniqueId,
      contentIsComplete: shouldEmbedContent,
      fileType: isDraft ? BlogConfig.DraftPostFileType : BlogConfig.PostFileType,
      jsonContent: jsonContent,
      previewThumbnail: file.previewThumbnail,
      userDate: file.userDate,
      dataType: postTypeToDataType(file.content.type),
    },
    payloadIsEncrypted: encrypt,
    accessControlList: file.acl,
  };

  const result = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    payloadBytes,
    undefined,
    encrypt,
    onVersionConflict
  );
  if (!result) throw new Error(`Upload failed`);

  return result;
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
    const content = await getPayload<T>(dotYouClient, targetDrive, dsr, includeMetadataHeader);

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
      payloadIsEncrypted: dsr.fileMetadata.payloadIsEncrypted,
      isDraft: dsr.fileMetadata.appData.fileType === BlogConfig.DraftPostFileType,
    };

    return file;
  } catch (ex) {
    console.error('[DotYouCore-js] failed to get the payload of a dsr', dsr, ex);
    return undefined;
  }
};
