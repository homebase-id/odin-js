import { DataUtil } from '../../core/DataUtil';
import { DotYouClient, ApiType } from '../../core/DotYouClient';
import { getRandom16ByteArray, uploadFile } from '../../core/DriveData/DriveProvider';
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
  postId: string;
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
  console.log('should comment', comment);
  return '1223';

  const encrypt = false;
  const isEmoji = comment.content.body?.length === 1;

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: undefined,
      drive: GetTargetDriveFromChannelId(comment.postDetails.channelId),
    },
    transitOptions: null,
  };

  // TODO: Handle attachments
  // => Upload files with the mediaProvider
  // => Replace attachment array with fileIds of those
  const payloadJson: string = DataUtil.JsonStringify64(comment.content);
  const payloadBytes = DataUtil.stringToUint8Array(payloadJson);

  // Set max of 3kb for jsonContent so enough room is left for metadata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const metadata: UploadFileMetadata = {
    allowDistribution: true,
    contentType: 'application/json',
    senderDotYouId: comment.authorDotYouId,
    appData: {
      tags: [],
      uniqueId: comment.id ?? DataUtil.getNewId(),
      contentIsComplete: shouldEmbedContent,
      fileType: isEmoji ? ReactionConfig.EmojiFileType : ReactionConfig.CommentFileType,
      jsonContent: shouldEmbedContent ? payloadJson : null,
      previewThumbnail: undefined,
      userDate: comment.date ?? new Date().getTime(),
      groupId: comment.commentThreadId,
    },
    payloadIsEncrypted: encrypt,
    accessControlList: { requiredSecurityGroup: SecurityGroupType.Anonymous },
  };

  if (dotYouClient.getType() === ApiType.Owner) {
    // Use owner endpoint for comments (probably not via DriveProvider)

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
    // Use youauth endpoint for comments
  }
};

export const getComments = async (
  dotYouId: string,
  channelId: string,
  postId: string
): Promise<ReactionFile[]> => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  console.debug('Getting comments for: ', { dotYouId, channelId, postId });

  return [
    {
      id: DataUtil.getNewId(),
      authorDotYouId: 'samwise.digital',
      date: yesterday.getTime(),
      content: {
        body: 'First 🏎️ 🏁',
      },
    },
    {
      id: DataUtil.getNewId(),
      authorDotYouId: 'samwise.digital',
      date: yesterday.getTime(),
      content: {
        body: 'My precious 🤣',
      },
    },
    {
      id: DataUtil.getNewId(),
      authorDotYouId: 'samwise.digital',
      date: yesterday.getTime(),
      content: {
        body: 'Lorem ipsum, Donec congue eget ante consectetur varius. Nulla nibh lorem, pharetra ac commodo vitae, ultricies vel massa.',
      },
    },
    {
      id: DataUtil.getNewId(),
      commentThreadId: '123',
      authorDotYouId: 'frodo.digital',
      date: new Date().getTime(),
      content: {
        body: '"Lorem ipsum?" What do you mean?',
      },
    },
  ];
};

export const getReactionSummary = async (
  dotYouId: string,
  channelId: string,
  postId: string
): Promise<{ emoji: string; count: number }[]> => {
  console.debug('Getting reaction summary for: ', { dotYouId, channelId, postId });

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
  postId: string
): Promise<ReactionFile[]> => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  console.debug('Getting reactions for: ', { dotYouId, channelId, postId });

  return [
    {
      id: DataUtil.getNewId(),
      authorDotYouId: 'samwise.digital',
      date: yesterday.getTime(),
      content: {
        body: '❤️',
      },
    },
    {
      id: DataUtil.getNewId(),
      authorDotYouId: 'frodo.digital',
      date: new Date().getTime(),
      content: {
        body: '❤️',
      },
    },
    {
      id: DataUtil.getNewId(),
      authorDotYouId: 'merry.youfoundation.id',
      date: new Date().getTime(),
      content: {
        body: '🤔',
      },
    },
  ];
};
