import { jsonStringify64, stringToUint8Array, getNewId } from '../../core/DataUtil';
import { DotYouClient } from '../../core/DotYouClient';
import {
  getPayload,
  getRandom16ByteArray,
  queryBatch,
  uploadFile,
} from '../../core/DriveData/DriveProvider';
import { DriveSearchResult, FileQueryParams, TargetDrive } from '../../core/DriveData/DriveTypes';
import {
  UploadInstructionSet,
  UploadFileMetadata,
  SecurityGroupType,
  UploadResult,
} from '../../core/DriveData/DriveUploadTypes';
import { GetTargetDriveFromChannelId } from './PostDefinitionProvider';

export interface ReactionContext {
  authorDotYouId: string;
  channelId: string;
  postFileId: string;
  postId?: string;
}

interface ReactionContent {
  body: string;
  attachmentIds?: string[];
}

export interface ReactionFile {
  fileId?: string;
  id?: string;
  commentThreadId?: string;

  authorDotYouId: string;
  date?: number;

  content: ReactionContent;
}

interface RawReactionContent {
  body: string;
  attachments?: File[];
}

export interface ReactionVm extends Omit<ReactionFile, 'content'> {
  postDetails: ReactionContext;
  content: RawReactionContent;
}

export class ReactionConfig {
  static readonly CommentFileType: number = 801;
  static readonly EmojiFileType: number = 805;
}

export const saveComment = async (
  dotYouClient: DotYouClient,
  comment: ReactionVm
): Promise<string> => {
  console.log('[DotYouCore-js] Should and attempts to react with comment:', comment);

  const encrypt = false;
  const targetDrive = GetTargetDriveFromChannelId(comment.postDetails.channelId);

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: undefined,
      drive: targetDrive,
    },
    transitOptions: null,
    systemFileType: 'Comment',
  };

  // TODO: Handle attachments
  // => Upload files with the mediaProvider
  // => Replace attachment array with fileIds of those

  const payloadJson: string = jsonStringify64(comment.content);
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for jsonContent so enough room is left for metadata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const metadata: UploadFileMetadata = {
    allowDistribution: false,
    contentType: 'application/json',
    senderDotYouId: comment.authorDotYouId,
    referencedFile: { targetDrive, fileId: comment.postDetails.postFileId },
    appData: {
      tags: [],
      uniqueId: comment.id ?? getNewId(),
      contentIsComplete: shouldEmbedContent,
      fileType: ReactionConfig.CommentFileType,
      jsonContent: shouldEmbedContent ? payloadJson : null,
      previewThumbnail: undefined,
      userDate: comment.date ?? new Date().getTime(),
      // groupId: comment.commentThreadId,
    },
    payloadIsEncrypted: encrypt,
    accessControlList: { requiredSecurityGroup: SecurityGroupType.Anonymous },
  };

  if (dotYouClient.getHostname() === comment.postDetails.authorDotYouId) {
    // Use owner/youauth endpoint for reactions if the post to comment on is on the current root identity
    const result: UploadResult = await uploadFile(
      dotYouClient,
      instructionSet,
      metadata,
      payloadBytes,
      undefined,
      encrypt
    );

    return result.file.fileId;
  } else {
    // Use transit endpoint for reactions ?
    return '123';
  }
};

export const saveEmojiReaction = async (
  dotYouClient: DotYouClient,
  comment: ReactionVm
): Promise<string> => {
  console.log('[DotYouCore-js] Should attempt to react with emoji:', comment);
  return '123';

  // TODO: Set final endpoint

  const encrypt = false;
  const targetDrive = GetTargetDriveFromChannelId(comment.postDetails.channelId);

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: undefined,
      drive: targetDrive,
    },
    transitOptions: null,
    systemFileType: 'Comment',
  };

  const payloadJson: string = jsonStringify64(comment.content);
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for jsonContent so enough room is left for metadata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const metadata: UploadFileMetadata = {
    allowDistribution: false,
    contentType: 'application/json',
    senderDotYouId: comment.authorDotYouId,
    referencedFile: { targetDrive, fileId: comment.postDetails.postFileId },
    appData: {
      tags: [],
      uniqueId: comment.id ?? getNewId(),
      contentIsComplete: shouldEmbedContent,
      fileType: ReactionConfig.EmojiFileType,
      jsonContent: shouldEmbedContent ? payloadJson : null,
      previewThumbnail: undefined,
      userDate: comment.date ?? new Date().getTime(),
      // groupId: comment.commentThreadId,
    },
    payloadIsEncrypted: encrypt,
    accessControlList: { requiredSecurityGroup: SecurityGroupType.Anonymous },
  };

  if (dotYouClient.getHostname() === comment.postDetails.authorDotYouId) {
    // Use owner/youauth endpoint for reactions if the post to comment on is on the current root identity
    const result: UploadResult = await uploadFile(
      dotYouClient,
      instructionSet,
      metadata,
      payloadBytes,
      undefined,
      encrypt
    );

    return result.file.fileId;
  } else {
    // Use transit endpoint for reactions ?
    return '123';
  }
};

export const getComments = async (
  dotYouClient: DotYouClient,
  dotYouId: string,
  channelId: string,
  postFileId: string,
  pageSize = 25,
  cursorState?: string
): Promise<ReactionFile[]> => {
  console.debug('Getting comments for: ', { dotYouId, channelId, postFileId });

  // const yesterday = new Date();
  // yesterday.setDate(yesterday.getDate() - 1);

  // return [
  //   {
  //     id: getNewId(),
  //     authorDotYouId: 'samwise.digital',
  //     date: yesterday.getTime(),
  //     content: {
  //       body: 'First 🏎️ 🏁',
  //     },
  //   },
  //   {
  //     id: getNewId(),
  //     authorDotYouId: 'samwise.digital',
  //     date: yesterday.getTime(),
  //     content: {
  //       body: 'My precious 🤣',
  //     },
  //   },
  //   {
  //     id: getNewId(),
  //     authorDotYouId: 'samwise.digital',
  //     date: yesterday.getTime(),
  //     content: {
  //       body: 'Lorem ipsum, Donec congue eget ante consectetur varius. Nulla nibh lorem, pharetra ac commodo vitae, ultricies vel massa.',
  //     },
  //   },
  //   {
  //     id: getNewId(),
  //     commentThreadId: '123',
  //     authorDotYouId: 'frodo.digital',
  //     date: new Date().getTime(),
  //     content: {
  //       body: '"Lorem ipsum?" What do you mean?',
  //     },
  //   },
  // ];

  const targetDrive = GetTargetDriveFromChannelId(channelId);
  const qp: FileQueryParams = {
    targetDrive: targetDrive,
    fileType: [ReactionConfig.CommentFileType],
    groupId: [postFileId],
  };

  const result = await queryBatch(dotYouClient, qp, {
    maxRecords: pageSize,
    cursorState: cursorState,
    includeMetadataHeader: true, // Set to true to allow jsonContent to be there, and we don't need extra calls to get the header with jsonContent
  });

  const comments: ReactionFile[] = (
    await Promise.all(
      result.searchResults.map(async (dsr) =>
        dsrToComment(dotYouClient, dsr, targetDrive, result.includeMetadataHeader)
      )
    )
  ).filter((attr) => !!attr) as ReactionFile[];

  return comments;
};

const dsrToComment = async (
  dotYouClient: DotYouClient,
  dsr: DriveSearchResult,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<ReactionFile> => {
  const contentData = await getPayload<RawReactionContent>(
    dotYouClient,
    targetDrive,
    dsr.fileId,
    dsr.fileMetadata,
    dsr.sharedSecretEncryptedKeyHeader,
    includeMetadataHeader
  );

  return {
    fileId: dsr.fileId,
    id: dsr.fileMetadata.appData.uniqueId,
    authorDotYouId: dsr.fileMetadata.senderDotYouId,
    commentThreadId: dsr.fileMetadata.appData.groupId,
    content: { ...contentData },
    date: dsr.fileMetadata.appData.userDate,
  };
};

export const getReactionSummary = async (
  dotYouId: string,
  channelId: string,
  postFileId: string
): Promise<{ emoji: string; count: number }[]> => {
  console.debug('Getting reaction summary for: ', { dotYouId, channelId, postFileId });

  return [
    {
      emoji: '❤️',
      count: 2,
    },
    {
      emoji: '🤔',
      count: 1,
    },
  ];
};

export const getReactions = async (
  dotYouId: string,
  channelId: string,
  postFileId: string
): Promise<ReactionFile[]> => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  console.debug('Getting reactions for: ', { dotYouId, channelId, postFileId });

  return [
    {
      id: getNewId(),
      authorDotYouId: 'samwise.digital',
      date: yesterday.getTime(),
      content: {
        body: '❤️',
      },
    },
    {
      id: getNewId(),
      authorDotYouId: 'frodo.digital',
      date: new Date().getTime(),
      content: {
        body: '❤️',
      },
    },
    {
      id: getNewId(),
      authorDotYouId: 'merry.youfoundation.id',
      date: new Date().getTime(),
      content: {
        body: '🤔',
      },
    },
  ];
};
