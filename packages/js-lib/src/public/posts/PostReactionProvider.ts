import { DotYouClient } from '../../core/DotYouClient';
import { getRandom16ByteArray } from '../../helpers/DataUtil';
import { createThumbnails } from '../../core/MediaData/Thumbs/ThumbnailProvider';
import {
  ThumbnailFile,
  ImageContentType,
  UploadFileMetadata,
  SecurityGroupType,
  TransitOptions,
  ScheduleOptions,
  SendContents,
  UploadInstructionSet,
  uploadFile,
  TransferStatus,
  deleteFile,
  FileQueryParams,
  queryBatch,
  DriveSearchResult,
  TargetDrive,
  getContentFromHeaderOrPayload,
  ReactionPreview,
} from '../../core/core';
import {
  jsonStringify64,
  stringToUint8Array,
  getNewId,
  tryJsonParse,
} from '../../helpers/DataUtil';
import {
  deleteFileOverTransit,
  getContentFromHeaderOrPayloadOverTransit,
  queryBatchOverTransit,
  uploadFileOverTransit,
} from '../../transit/TransitData/TransitProvider';
import { TransitInstructionSet, TransitUploadResult } from '../../transit/TransitData/TransitTypes';
import { GetTargetDriveFromChannelId } from './PostDefinitionProvider';
import {
  CommentReactionPreview,
  CommentsReactionSummary,
  EmojiReactionSummary,
  RawReactionContent,
  ReactionConfig,
  ReactionContext,
  ReactionFile,
  ReactionVm,
} from './PostTypes';

/* Adding a comment might fail if the referencedFile isn't available anymore (ACL got updates, post got deleted...) */
export const saveComment = async (
  dotYouClient: DotYouClient,
  comment: ReactionVm
): Promise<string> => {
  const encrypt = comment.context.target.isEncrypted;
  const isLocal = comment.context.authorOdinId === dotYouClient.getIdentity();
  const targetDrive = GetTargetDriveFromChannelId(comment.context.channelId);

  let additionalThumbnails: ThumbnailFile[] | undefined;
  if (comment.content.attachment) {
    const imageFile = comment.content.attachment;
    const imageBytes = new Uint8Array(await imageFile.arrayBuffer());

    if (imageFile.type === 'image/gif') {
      additionalThumbnails = [
        {
          contentType: 'image/gif',
          payload: imageBytes,
          pixelHeight: 100,
          pixelWidth: 100,
        },
      ];
    } else {
      const { additionalThumbnails: thumbs } = await createThumbnails(
        imageBytes,
        imageFile.type as ImageContentType,
        [{ height: 250, width: 250, quality: 100 }]
      );
      additionalThumbnails = thumbs;
    }
    delete comment.content.attachment;

    comment.content.hasAttachment = true;
  }

  const payloadJson: string = jsonStringify64(comment.content);
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for jsonContent so enough room is left for metadata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const metadata: UploadFileMetadata = {
    // allowDistribution: true, // Disable
    versionTag: comment.versionTag,
    allowDistribution: false,
    contentType: 'application/json',
    senderOdinId: comment.authorOdinId,
    referencedFile: {
      targetDrive,
      globalTransitId: comment.threadId || comment.context.target.globalTransitId,
    },
    appData: {
      tags: [],
      uniqueId: comment.id ?? getNewId(),
      contentIsComplete: shouldEmbedContent,
      fileType: ReactionConfig.CommentFileType,
      jsonContent: shouldEmbedContent ? payloadJson : null,
      previewThumbnail: undefined,
      userDate: comment.date ?? new Date().getTime(),
      additionalThumbnails: additionalThumbnails?.map((thumb) => {
        return {
          pixelHeight: thumb.pixelHeight,
          pixelWidth: thumb.pixelWidth,
          contentType: thumb.contentType,
        };
      }),
    },
    payloadIsEncrypted: encrypt,
    accessControlList: {
      requiredSecurityGroup: encrypt ? SecurityGroupType.Connected : SecurityGroupType.Anonymous,
    },
  };

  if (isLocal) {
    const transitOptions: TransitOptions = {
      useGlobalTransitId: true, // Needed to support having a reference to this file over transit
      recipients: [],
      schedule: ScheduleOptions.SendLater,
      sendContents: SendContents.All,
    };

    const instructionSet: UploadInstructionSet = {
      transferIv: getRandom16ByteArray(),
      storageOptions: {
        overwriteFileId: comment.fileId || undefined,
        drive: targetDrive,
      },
      transitOptions: transitOptions,
      systemFileType: 'Comment',
    };

    // Use owner/youauth endpoint for reactions if the post to comment on is on the current root identity
    const result = await uploadFile(
      dotYouClient,
      instructionSet,
      metadata,
      payloadBytes,
      additionalThumbnails,
      encrypt
    );
    if (!result) throw new Error(`Upload failed`);

    return result.globalTransitIdFileIdentifier.globalTransitId;
  } else {
    metadata.referencedFile = {
      targetDrive: targetDrive,
      globalTransitId: comment.threadId || comment.context.target.globalTransitId,
    };
    metadata.accessControlList = { requiredSecurityGroup: SecurityGroupType.Connected };
    metadata.allowDistribution = true;

    const instructionSet: TransitInstructionSet = {
      transferIv: getRandom16ByteArray(),
      overwriteGlobalTransitFileId: comment.globalTransitId,
      remoteTargetDrive: targetDrive,
      schedule: ScheduleOptions.SendNowAwaitResponse,
      recipients: [comment.context.authorOdinId],
      systemFileType: 'Comment',
    };

    const result: TransitUploadResult = await uploadFileOverTransit(
      dotYouClient,
      instructionSet,
      metadata,
      payloadBytes,
      additionalThumbnails,
      encrypt
    );

    if (
      [
        TransferStatus.PendingRetry,
        TransferStatus.TotalRejectionClientShouldRetry,
        TransferStatus.FileDoesNotAllowDistribution,
        TransferStatus.RecipientReturnedAccessDenied,
      ].includes(result.recipientStatus[comment.context.authorOdinId])
    ) {
      throw new Error(result.recipientStatus[comment.context.authorOdinId].toString());
    }

    return result.remoteGlobalTransitIdFileIdentifier.globalTransitId;
  }
};

export const removeComment = async (
  dotYouClient: DotYouClient,
  context: ReactionContext,
  commentFile: ReactionFile
) => {
  const isLocal = context.authorOdinId === dotYouClient.getIdentity();
  const targetDrive = GetTargetDriveFromChannelId(context.channelId);

  if (isLocal) {
    if (!commentFile.fileId) return;

    return await deleteFile(
      dotYouClient,
      targetDrive,
      commentFile.fileId,
      false,
      undefined,
      'Comment'
    );
  } else {
    if (!commentFile.globalTransitId) return;

    return await deleteFileOverTransit(
      dotYouClient,
      targetDrive,
      commentFile.globalTransitId,
      [context.authorOdinId],
      'Comment'
    );
  }
};

export const getComments = async (
  dotYouClient: DotYouClient,
  context: ReactionContext,
  pageSize = 25,
  cursorState?: string
): Promise<{ comments: ReactionFile[]; cursorState: string }> => {
  const isLocal = context.authorOdinId === dotYouClient.getIdentity();
  const targetDrive = GetTargetDriveFromChannelId(context.channelId);
  const qp: FileQueryParams = {
    targetDrive: targetDrive,
    fileType: [ReactionConfig.CommentFileType],
    groupId: [context.target.globalTransitId],
    systemFileType: 'Comment',
  };
  const ro = {
    maxRecords: pageSize,
    cursorState: cursorState,
    includeMetadataHeader: true, // Set to true to allow jsonContent to be there, and we don't need extra calls to get the header with jsonContent
  };

  const result = isLocal
    ? await queryBatch(dotYouClient, qp, ro)
    : await queryBatchOverTransit(dotYouClient, context.authorOdinId, qp, ro);

  const comments: ReactionFile[] = (
    await Promise.all(
      result.searchResults.map(async (dsr) =>
        dsrToComment(
          dotYouClient,
          context.authorOdinId,
          dsr,
          targetDrive,
          result.includeMetadataHeader
        )
      )
    )
  ).filter((attr) => !!attr) as ReactionFile[];

  return { comments, cursorState: result.cursorState };
};

const dsrToComment = async (
  dotYouClient: DotYouClient,
  odinId: string,
  dsr: DriveSearchResult,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<ReactionFile | null> => {
  const isLocal = odinId === dotYouClient.getIdentity();

  const params = [targetDrive, dsr, includeMetadataHeader] as const;

  const contentData = isLocal
    ? await getContentFromHeaderOrPayload<RawReactionContent>(dotYouClient, ...params)
    : await getContentFromHeaderOrPayloadOverTransit<RawReactionContent>(
        dotYouClient,
        odinId,
        ...params
      );

  if (!contentData) return null;

  return {
    fileId: dsr.fileId,
    globalTransitId: dsr.fileMetadata.globalTransitId,
    versionTag: dsr.fileMetadata.versionTag,
    id: dsr.fileMetadata.appData.uniqueId,
    authorOdinId: dsr.fileMetadata.senderOdinId,
    threadId: dsr.fileMetadata.appData.groupId,
    content: { ...contentData },
    date: dsr.fileMetadata.created,
    updated: dsr.fileMetadata.updated !== 0 ? dsr.fileMetadata.updated : 0,
    payloadIsEncrypted: dsr.fileMetadata.payloadIsEncrypted,
  };
};

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
            emoji: tryJsonParse<{ emoji: string }>(reaction.reactionContent).emoji,
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

export const parseReactionPreview = (
  reactionPreview: ReactionPreview | undefined
): { comments: CommentsReactionSummary; reactions: EmojiReactionSummary } | undefined => {
  if (reactionPreview) {
    return {
      comments: {
        comments: reactionPreview.comments
          .map((commentPreview) => {
            try {
              return {
                authorOdinId: commentPreview.odinId,
                content:
                  commentPreview.isEncrypted && !commentPreview.jsonContent.length
                    ? { body: '' }
                    : tryJsonParse(commentPreview.jsonContent),
                payloadIsEncrypted: commentPreview.isEncrypted,
                reactions: parseReactions(commentPreview.reactions),
              };
            } catch (ex) {
              console.error('[DotYouCore-js] parse failed for', commentPreview);
              return {
                authorOdinId: commentPreview.odinId,
                content: { body: 'PROBABLY ENCRYPTED' },
                reactions: parseReactions(commentPreview.reactions),
              };
            }
          })
          .filter(Boolean) as CommentReactionPreview[],
        totalCount: reactionPreview.totalCommentCount || reactionPreview.comments.length || 0,
      },
      reactions: parseReactions(Object.values(reactionPreview.reactions)),
    };
  }

  // Empty reactionPreview object when undefined from server
  return {
    comments: {
      comments: [],
      totalCount: 0,
    },
    reactions: {
      reactions: [],
      totalCount: 0,
    },
  };
};
