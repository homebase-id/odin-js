import { jsonStringify64, stringToUint8Array, getNewId } from '../../core/DataUtil';
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
  ReactionPreview,
  TargetDrive,
} from '../../core/DriveData/DriveTypes';
import {
  UploadInstructionSet,
  UploadFileMetadata,
  SecurityGroupType,
  UploadResult,
  ScheduleOptions,
  SendContents,
  TransitOptions,
} from '../../core/DriveData/DriveUploadTypes';
import { uploadImage } from '../../core/MediaData/MediaProvider';
import { GetTargetDriveFromChannelId } from './PostDefinitionProvider';
import { RichText } from './PostTypes';

export interface ReactionContext {
  authorOdinId: string;
  channelId: string;
  postFileId: string;
}

export interface ReactionContent {
  body: string;
  bodyAsRichText?: RichText;
  attachmentIds?: string[];
}

export interface ReactionFile {
  fileId?: string;
  id?: string;
  commentThreadId?: string;

  authorOdinId: string;
  date?: number;
  updated?: number;

  content: ReactionContent;
}

export interface CommentReactionPreview extends ReactionFile {
  reactions: EmojiReactionSummary;
}

export interface EmojiReactionSummary {
  reactions: { emoji: string; count: number }[];
  totalCount: number;
}

export interface CommentsReactionSummary {
  comments: CommentReactionPreview[];
  totalCount: number;
}

interface RawReactionContent extends Omit<ReactionContent, 'attachments'> {
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
  const encrypt = false;
  const targetDrive = GetTargetDriveFromChannelId(comment.postDetails.channelId);
  const transitOptions: TransitOptions = {
    useGlobalTransitId: true,
    recipients: [],
    schedule: ScheduleOptions.SendLater,
    sendContents: SendContents.All,
  };
  const acl = { requiredSecurityGroup: SecurityGroupType.Anonymous };

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: comment.fileId || undefined,
      drive: targetDrive,
    },
    transitOptions: transitOptions,
    systemFileType: 'Comment',
  };

  // TODO: Handle attachments
  // => Upload files with the mediaProvider
  // => Replace attachment array with fileIds of those
  comment.content.attachmentIds = [
    ...(comment.content.attachmentIds || []),
    ...(!comment.content.attachments
      ? []
      : ((
          await Promise.all(
            comment.content.attachments.map(async (file) => {
              const imageBytes = new Uint8Array(await file.arrayBuffer());
              return (
                await uploadImage(dotYouClient, targetDrive, undefined, acl, imageBytes, {
                  type: file.type,
                })
              )?.fileId;
            })
          )
        ).filter(Boolean) as string[])),
  ];

  delete comment.content.attachments;

  const payloadJson: string = jsonStringify64(comment.content);
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for jsonContent so enough room is left for metadata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const metadata: UploadFileMetadata = {
    allowDistribution: true,
    contentType: 'application/json',
    senderOdinId: comment.authorOdinId,
    referencedFile: {
      targetDrive,
      fileId: comment.commentThreadId || comment.postDetails.postFileId,
    },
    appData: {
      tags: [],
      uniqueId: comment.id ?? getNewId(),
      contentIsComplete: shouldEmbedContent,
      fileType: ReactionConfig.CommentFileType,
      jsonContent: shouldEmbedContent ? payloadJson : null,
      previewThumbnail: undefined,
      userDate: comment.date ?? new Date().getTime(),
    },
    payloadIsEncrypted: encrypt,
    accessControlList: acl,
  };

  if (dotYouClient.getHostname() === comment.postDetails.authorOdinId) {
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

export const removeComment = async (
  dotYouClient: DotYouClient,
  context: ReactionContext,
  commentFile: ReactionFile
) => {
  const targetDrive = GetTargetDriveFromChannelId(context.channelId);
  if (commentFile.fileId)
    return await deleteFile(
      dotYouClient,
      targetDrive,
      commentFile.fileId,
      false,
      undefined,
      'Comment'
    );
};

export const getComments = async (
  dotYouClient: DotYouClient,
  odinId: string,
  channelId: string,
  postFileId: string,
  pageSize = 25,
  cursorState?: string
): Promise<{ comments: ReactionFile[]; cursorState: string }> => {
  const targetDrive = GetTargetDriveFromChannelId(channelId);
  const qp: FileQueryParams = {
    targetDrive: targetDrive,
    fileType: [ReactionConfig.CommentFileType],
    groupId: [postFileId],
    systemFileType: 'Comment',
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

  return { comments, cursorState: result.cursorState };
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
    authorOdinId: dsr.fileMetadata.senderOdinId,
    commentThreadId: dsr.fileMetadata.appData.groupId,
    content: { ...contentData },
    date: dsr.fileMetadata.created,
    updated: dsr.fileMetadata.updated !== 0 ? dsr.fileMetadata.updated : 0,
  };
};

const emojiRoot = '/drive/files/reactions';
export const saveEmojiReaction = async (
  dotYouClient: DotYouClient,
  comment: ReactionVm
): Promise<string> => {
  const client = dotYouClient.createAxiosClient();
  const url = emojiRoot + '/add';

  const data = {
    odinId: comment.authorOdinId,
    reaction: JSON.stringify({ emoji: comment.content.body }),
    file: {
      targetDrive: GetTargetDriveFromChannelId(comment.postDetails.channelId),
      fileId: comment.commentThreadId || comment.postDetails.postFileId,
    },
  };

  return client
    .post(url, data)
    .then((response) => {
      return { ...response.data, status: response.data?.status?.toLowerCase() };
    })
    .catch(dotYouClient.handleErrorResponse);

  // if (dotYouClient.getHostname() === comment.postDetails.authorOdinId) {
  //   // Use owner/youauth endpoint for reactions if the post to comment on is on the current root identity
  // } else {
  //   // Use transit endpoint for reactions ?
  // }
};

export const removeEmojiReaction = async (
  dotYouClient: DotYouClient,
  comment: ReactionVm
): Promise<string> => {
  const client = dotYouClient.createAxiosClient();
  const url = emojiRoot + '/delete';

  const data = {
    odinId: comment.authorOdinId,
    reaction: comment.content.body,
    file: {
      targetDrive: GetTargetDriveFromChannelId(comment.postDetails.channelId),
      fileId: comment.postDetails.postFileId,
    },
  };

  return client
    .post(url, data)
    .then((response) => {
      return { ...response.data, status: response.data?.status?.toLowerCase() };
    })
    .catch(dotYouClient.handleErrorResponse);
};

interface ServerReactionsSummary {
  reactions: { reactionContent: string; count: number }[];
  total: number;
}

export const getReactionSummary = async (
  dotYouClient: DotYouClient,
  odinId: string,
  channelId: string,
  postFileId: string
): Promise<EmojiReactionSummary> => {
  const client = dotYouClient.createAxiosClient();
  const url = emojiRoot + '/summary';

  const data = {
    file: {
      targetDrive: GetTargetDriveFromChannelId(channelId),
      fileId: postFileId,
    },
    cursor: undefined,
    maxRecords: 5,
  };

  return client
    .post<ServerReactionsSummary>(url, data)
    .then((response) => {
      return {
        reactions: response.data.reactions
          .map((reaction) => {
            try {
              return {
                emoji: JSON.parse(reaction.reactionContent).emoji as string,
                count: reaction.count,
              };
            } catch (ex) {
              console.error('[DotYouCore-js] parse failed for', reaction);
              return;
            }
          })
          .filter(Boolean) as { emoji: string; count: number }[],
        totalCount: response.data.total,
      };
    })
    .catch((e) => {
      dotYouClient.handleErrorResponse(e);
      return { reactions: [], totalCount: 0 };
    });
};

interface ServerReactionsListWithCursor {
  reactions: {
    odinId: string;
    reactionContent: string;
  }[];
  cursor: number;
}

export const getReactions = async (
  dotYouClient: DotYouClient,
  odinId: string,
  channelId: string,
  postFileId: string,
  pageSize = 15,
  cursor?: number
): Promise<{ reactions: ReactionFile[]; cursor: number } | undefined> => {
  const client = dotYouClient.createAxiosClient();
  const url = emojiRoot + '/list';

  const data = {
    file: {
      targetDrive: GetTargetDriveFromChannelId(channelId),
      fileId: postFileId,
    },
    cursor: cursor,
    maxRecords: pageSize,
  };

  return client
    .post<ServerReactionsListWithCursor>(url, data)
    .then((response) => {
      return {
        reactions: response.data.reactions.map((reaction) => {
          return {
            authorOdinId: reaction.odinId,
            content: { body: JSON.parse(reaction.reactionContent).emoji },
          };
        }),
        cursor: response.data.cursor,
      };
    })
    .catch(dotYouClient.handleErrorResponse);
};

export const parseReactionPreview = (
  reactionPreview: ReactionPreview | undefined
): { comments: CommentsReactionSummary; reactions: EmojiReactionSummary } | undefined => {
  const parseReactions = (
    reactions: {
      key: string;
      count: string;
      reactionContent: string;
    }[]
  ) => {
    return {
      reactions: reactions
        .map((reaction) => {
          try {
            return {
              emoji: JSON.parse(reaction.reactionContent).emoji as string,
              count: parseInt(reaction.count),
            };
          } catch (ex) {
            console.error('[DotYouCore-js] parse failed for', reaction);
            return;
          }

          return;
        })
        .filter(Boolean) as { emoji: string; count: number }[],
      totalCount: reactions.reduce((prevVal, curVal) => {
        return prevVal + parseInt(curVal.count);
      }, 0),
    };
  };

  if (reactionPreview) {
    return {
      comments: {
        comments: reactionPreview.comments
          .map((commentPreview) => {
            try {
              return {
                authorOdinId: commentPreview.odinId,
                content: JSON.parse(commentPreview.jsonContent),
                reactions: parseReactions(commentPreview.reactions),
              };
            } catch (ex) {
              console.error('[DotYouCore-js] parse failed for', commentPreview);
              return;
            }
          })
          .filter(Boolean) as CommentReactionPreview[],
        totalCount: reactionPreview.totalCommentCount || reactionPreview.comments.length || 0,
      },
      reactions: parseReactions(Object.values(reactionPreview.reactions)),
    };
  }

  return reactionPreview;
};
