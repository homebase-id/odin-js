import { DotYouClient } from '../../../core/DotYouClient';
import { getRandom16ByteArray } from '../../../helpers/DataUtil';
import { createThumbnails } from '../../../media/Thumbs/ThumbnailProvider';
import {
  ThumbnailFile,
  UploadFileMetadata,
  SecurityGroupType,
  ScheduleOptions,
  SendContents,
  UploadInstructionSet,
  uploadFile,
  TransferUploadStatus,
  deleteFile,
  FileQueryParams,
  queryBatch,
  HomebaseFile,
  TargetDrive,
  getContentFromHeaderOrPayload,
  ReactionPreview,
  PayloadFile,
  EmbeddedThumb,
  NewHomebaseFile,
  PriorityOptions,
  uploadHeader,
  CommentReaction,
  patchFile,
  UpdateInstructionSet,
} from '../../../core/core';
import {
  jsonStringify64,
  stringToUint8Array,
  getNewId,
  tryJsonParse,
} from '../../../helpers/DataUtil';
import { TransitInstructionSet } from '../../../peer/peerData/PeerTypes';
import { GetTargetDriveFromChannelId } from '../Channel/PostChannelManager';
import { RawReactionContent, ReactionConfig, ReactionContext } from '../PostTypes';
import { DEFAULT_PAYLOAD_KEY } from '../../../core/DriveData/Upload/UploadHelpers';
import { uploadFileOverPeer } from '../../../peer/peerData/Upload/PeerFileUploader';
import { deleteFileOverPeer } from '../../../peer/peerData/File/PeerFileManager';
import { queryBatchOverPeer } from '../../../peer/peerData/Query/PeerDriveQueryService';
import { getContentFromHeaderOrPayloadOverPeer } from '../../../peer/peerData/File/PeerFileProvider';
import { getFileHeaderOverPeerByGlobalTransitId } from '../../../peer/peer';
const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;

const COMMENT_MEDIA_PAYLOAD = 'cmmnt_md';

/* Adding a comment might fail if the referencedFile isn't available anymore (ACL got updates, post got deleted...) */
export const saveComment = async (
  dotYouClient: DotYouClient,
  context: ReactionContext,
  comment:
    | Omit<NewHomebaseFile<RawReactionContent>, 'serverMetadata'>
    | HomebaseFile<RawReactionContent>
): Promise<string> => {
  const encrypt = context.target.isEncrypted;
  const isLocal = context.odinId === dotYouClient.getIdentity();
  const targetDrive = GetTargetDriveFromChannelId(context.channelId);

  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];
  let previewThumbnail: EmbeddedThumb | undefined;

  if (comment.fileMetadata.appData.content.attachment) {
    const imageFile = comment.fileMetadata.appData.content.attachment;
    const { additionalThumbnails, tinyThumb } = await createThumbnails(
      imageFile,
      COMMENT_MEDIA_PAYLOAD,
      [
        { height: 250, width: 250, quality: 100 },
        { height: 1600, width: 1600, quality: 100 },
      ]
    );

    thumbnails.push(...additionalThumbnails);
    payloads.push({ payload: imageFile, key: COMMENT_MEDIA_PAYLOAD });
    previewThumbnail = tinyThumb;

    delete comment.fileMetadata.appData.content.attachment;
    comment.fileMetadata.appData.content.mediaPayloadKey = COMMENT_MEDIA_PAYLOAD;
  }

  const payloadJson: string = jsonStringify64(comment.fileMetadata.appData.content);
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for content so enough room is left for metadata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const metadata: UploadFileMetadata = {
    versionTag: comment.fileMetadata.versionTag,
    allowDistribution: false,
    referencedFile: {
      targetDrive,
      globalTransitId: comment.fileMetadata.appData.groupId || context.target.globalTransitId,
    },
    appData: {
      tags: [],
      uniqueId: comment.fileMetadata.appData.uniqueId ?? getNewId(),
      fileType: ReactionConfig.CommentFileType,
      content: shouldEmbedContent ? payloadJson : undefined,
      previewThumbnail: previewThumbnail,
      userDate: comment.fileMetadata.appData.userDate ?? new Date().getTime(),
    },
    isEncrypted: encrypt,
    accessControlList: {
      requiredSecurityGroup: encrypt
        ? SecurityGroupType.AutoConnected
        : SecurityGroupType.Anonymous,
    },
  };

  if (!shouldEmbedContent)
    payloads.push({
      payload: new OdinBlob([payloadBytes], { type: 'application/json' }),
      key: DEFAULT_PAYLOAD_KEY,
    });

  if (isLocal) {
    const instructionSet: UploadInstructionSet = {
      transferIv: getRandom16ByteArray(),
      storageOptions: {
        overwriteFileId: comment.fileId || undefined,
        drive: targetDrive,
      },
      transitOptions: {
        recipients: [],
        schedule: ScheduleOptions.SendLater,
        priority: PriorityOptions.Medium,
        sendContents: SendContents.All,
      },
      systemFileType: 'Comment',
    };

    // Use owner/guest endpoint for reactions if the post to comment on is on the current root identity
    if (comment.fileId) {
      const result = await uploadHeader(
        dotYouClient,
        comment.sharedSecretEncryptedKeyHeader,
        { ...instructionSet, storageIntent: 'header' },
        metadata
      );

      if (!result) throw new Error(`Upload failed`);

      return result.globalTransitIdFileIdentifier.globalTransitId;
    } else {
      const result = await uploadFile(
        dotYouClient,
        instructionSet,
        metadata,
        payloads,
        thumbnails,
        encrypt
      );
      if (!result) throw new Error(`Upload failed`);

      return result.globalTransitIdFileIdentifier.globalTransitId;
    }
  } else {
    metadata.referencedFile = {
      targetDrive: targetDrive,
      globalTransitId: comment.fileMetadata.appData.groupId || context.target.globalTransitId,
    };
    metadata.accessControlList = { requiredSecurityGroup: SecurityGroupType.AutoConnected };
    metadata.allowDistribution = true;

    const remoteHeader = comment.fileMetadata.globalTransitId
      ? await getFileHeaderOverPeerByGlobalTransitId(
          dotYouClient,
          context.odinId,
          targetDrive,
          comment.fileMetadata.globalTransitId,
          {
            systemFileType: 'Comment',
          }
        )
      : null;

    // await uploadHeaderOverPeer(
    //   dotYouClient,
    //   remoteHeader?.sharedSecretEncryptedKeyHeader,
    //   instructionSet,
    //   metadata
    // )

    let result;
    if (comment.fileMetadata.globalTransitId) {
      const instructionSet: UpdateInstructionSet = {
        transferIv: getRandom16ByteArray(),
        file: {
          globalTransitId: comment.fileMetadata.globalTransitId,
          targetDrive: targetDrive,
        },
        locale: 'peer',
        versionTag: comment.fileMetadata.versionTag,
        recipients: [context.odinId],
        systemFileType: 'Comment',
      };

      console.log(
        'patchFile',
        remoteHeader?.sharedSecretEncryptedKeyHeader,
        instructionSet,
        metadata
      );
      result = await patchFile(
        dotYouClient,
        remoteHeader?.fileMetadata.isEncrypted
          ? remoteHeader?.sharedSecretEncryptedKeyHeader
          : undefined,
        instructionSet,
        metadata
      );
    } else {
      const instructionSet: TransitInstructionSet = {
        transferIv: getRandom16ByteArray(),
        overwriteGlobalTransitFileId: (comment as HomebaseFile<CommentReaction>).fileMetadata
          .globalTransitId,
        remoteTargetDrive: targetDrive,
        schedule: ScheduleOptions.SendLater,
        priority: PriorityOptions.Medium,
        recipients: [context.odinId],
        systemFileType: 'Comment',
      };

      result = await uploadFileOverPeer(
        dotYouClient,
        instructionSet,
        metadata,
        payloads,
        thumbnails,
        encrypt
      );
    }
    if (!result) throw new Error(`Upload failed`);
    if (
      TransferUploadStatus.EnqueuedFailed === result.recipientStatus[context.odinId].toLowerCase()
    )
      throw new Error(result.recipientStatus[context.odinId].toString());

    return 'remoteGlobalTransitIdFileIdentifier' in result
      ? result.remoteGlobalTransitIdFileIdentifier.globalTransitId
      : (comment.fileMetadata.globalTransitId as string);
  }
};

export const removeComment = async (
  dotYouClient: DotYouClient,
  context: ReactionContext,
  commentFile: HomebaseFile<CommentReaction>
) => {
  const isLocal = context.odinId === dotYouClient.getIdentity();
  const targetDrive = GetTargetDriveFromChannelId(context.channelId);

  if (isLocal) {
    if (!commentFile.fileId) return;

    return await deleteFile(dotYouClient, targetDrive, commentFile.fileId, undefined, 'Comment');
  } else {
    if (!commentFile.fileMetadata.globalTransitId) return;

    return await deleteFileOverPeer(
      dotYouClient,
      targetDrive,
      commentFile.fileMetadata.globalTransitId,
      [context.odinId],
      'Comment'
    );
  }
};

export const getComments = async (
  dotYouClient: DotYouClient,
  context: ReactionContext,
  pageSize = 25,
  cursorState?: string
): Promise<{ comments: HomebaseFile<CommentReaction>[]; cursorState: string }> => {
  const isLocal = context.odinId === dotYouClient.getIdentity();
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
    includeMetadataHeader: true, // Set to true to allow content to be there, and we don't need extra calls to get the header with content
  };

  const result = isLocal
    ? await queryBatch(dotYouClient, qp, ro)
    : await queryBatchOverPeer(dotYouClient, context.odinId, qp, ro);

  const comments: HomebaseFile<CommentReaction>[] = (
    await Promise.all(
      result.searchResults.map(async (dsr) =>
        dsrToComment(dotYouClient, context.odinId, dsr, targetDrive, result.includeMetadataHeader)
      )
    )
  ).filter((attr) => !!attr) as HomebaseFile<CommentReaction>[];

  return { comments, cursorState: result.cursorState };
};

const dsrToComment = async (
  dotYouClient: DotYouClient,
  odinId: string,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<CommentReaction> | null> => {
  const isLocal = odinId === dotYouClient.getIdentity();

  const params = [targetDrive, dsr, includeMetadataHeader] as const;

  const contentData = isLocal
    ? await getContentFromHeaderOrPayload<CommentReaction>(dotYouClient, ...params)
    : await getContentFromHeaderOrPayloadOverPeer<CommentReaction>(dotYouClient, odinId, ...params);

  if (!contentData) return null;

  return {
    ...dsr,
    fileMetadata: {
      ...dsr.fileMetadata,
      appData: {
        ...dsr.fileMetadata.appData,
        content: {
          ...contentData,
          authorOdinId: dsr.fileMetadata.senderOdinId || contentData.authorOdinId,
        },
      },
    },
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
        } catch {
          console.error('[odin-js] parse failed for', reaction);
          return;
        }
      })
      .filter(Boolean) as { emoji: string; count: number }[],
    totalCount: reactions.reduce((prevVal, curVal) => {
      return prevVal + parseInt(curVal.count);
    }, 0),
  };
};

export interface ParsedReactionPreview {
  reactions: EmojiReactionSummary;
  comments: CommentsReactionSummary;
}

export interface EmojiReactionSummary {
  reactions: { emoji: string; count: number }[];
  totalCount: number;
}

export interface CommentsReactionSummary {
  comments: CommentReactionPreview[];
  totalCount: number;
}

export interface CommentReactionPreview extends CommentReaction {
  reactions: EmojiReactionSummary;
  isEncrypted: boolean;
}

export const parseReactionPreview = (
  reactionPreview: ReactionPreview | ParsedReactionPreview | undefined
): ParsedReactionPreview => {
  if (reactionPreview) {
    if ('count' in reactionPreview.reactions) return reactionPreview as ParsedReactionPreview;

    const rawReactionPreview = reactionPreview as ReactionPreview;
    return {
      comments: {
        comments: rawReactionPreview.comments
          .map((commentPreview) => {
            try {
              return {
                authorOdinId: commentPreview.odinId,

                ...(commentPreview.isEncrypted || !commentPreview.content.length
                  ? { body: '' }
                  : tryJsonParse<CommentReaction>(commentPreview.content)),

                isEncrypted: commentPreview.isEncrypted,
                reactions: parseReactions(commentPreview.reactions),
              };
            } catch {
              console.error('[odin-js] parse failed for', commentPreview);
              return {
                authorOdinId: commentPreview.odinId,
                content: { body: 'PROBABLY ENCRYPTED' },
                reactions: parseReactions(commentPreview.reactions),
              };
            }
          })
          .filter(Boolean) as CommentReactionPreview[],
        totalCount: rawReactionPreview.totalCommentCount || rawReactionPreview.comments.length || 0,
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