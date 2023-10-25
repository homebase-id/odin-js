import { AccessControlList, SecurityGroupType } from '../../core/DriveData/DriveUploadTypes';
import { TargetDrive, EmbeddedThumb } from '../../core/core';
import { toGuidId } from '../../helpers/helpers';

export interface ChannelDefinition {
  channelId: string;
  name: string;
  slug: string;
  description: string;
  templateId?: number;
  acl?: AccessControlList;
}

export enum ChannelTemplate {
  MasonryLayout = 0,
  LargeCards = 101,
  ClassicBlog = 202,
}

export class BlogConfig {
  static readonly PostFileType: number = 101;
  static readonly DraftPostFileType: number = 102;
  static readonly ChannelDefinitionFileType: number = 103;
  static readonly DriveType: string = '8f448716e34cedf9014145e043ca6612'; //toGuidId('channel_drive');

  static readonly PublicChannel: ChannelDefinition = {
    channelId: toGuidId('public_channel_drive'),
    name: 'Public Posts',
    slug: 'public-posts',
    description: '',
    templateId: undefined,
    acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
  };

  static readonly PublicChannelDrive: TargetDrive = {
    alias: BlogConfig.PublicChannel.channelId,
    type: BlogConfig.DriveType,
  };

  static readonly FeedDrive: TargetDrive = {
    alias: '4db49422ebad02e99ab96e9c477d1e08',
    type: 'a3227ffba87608beeb24fee9b70d92a6',
  };
}

export type PostType = 'Article' | 'Media' | 'Tweet';

export const postTypeToDataType = (type: PostType): number => {
  switch (type) {
    case 'Tweet':
      return 100;
    case 'Media':
      return 200;
    case 'Article':
      return 300;
  }

  throw 'Invalid post type';
};

export interface MediaFile {
  fileId: string;
  type: 'video' | 'image';
}

export interface PostFile<T extends PostContent> {
  fileId?: string;
  versionTag?: string;
  globalTransitId?: string;
  acl?: AccessControlList;
  userDate: number;
  content: T;
  previewThumbnail?: EmbeddedThumb;
  reactionPreview?: {
    reactions: EmojiReactionSummary;
    comments: CommentsReactionSummary;
  };
  payloadIsEncrypted?: boolean;
  isDraft?: boolean;
}

export type RichText = Record<string, unknown>[];

export interface EmbeddedPost extends Omit<PostContent, 'embeddedPost'> {
  permalink: string;
  previewThumbnail?: EmbeddedThumb;
  userDate: number;
}

export type ReactAccess = 'emoji' | 'comment' | boolean;

export interface PostContent {
  id: string;
  channelId: string;
  authorOdinId: string;
  reactAccess?: ReactAccess;

  caption: string;
  captionAsRichText?: RichText;
  slug: string;
  primaryMediaFile?: MediaFile;
  type: 'Article' | 'Media' | 'Tweet';

  embeddedPost?: EmbeddedPost;
}

export interface Article extends PostContent {
  abstract: string;
  body: string | Record<string, unknown>[];
  type: 'Article';
  readingTimeStats?: ReadTimeStats;
}

export interface ReadTimeStats {
  words: number;
  minutes: number;
}

export interface Media extends PostContent {
  type: 'Media';
  mediaFiles?: MediaFile[];
}

// On hold for now, needs a proxy to get the linkMeta externally
// export interface LinkMeta {
//   url: string;
//   title: string;
//   description?: string;
//   imageUrl?: string;
// }

export interface Tweet extends PostContent {
  type: 'Tweet';
  // linkMeta?: LinkMeta;
}

export interface ReactionContext {
  authorOdinId: string;
  channelId: string;
  // Target: Post or Comment details
  target: { fileId: string; globalTransitId: string; isEncrypted: boolean };
}

export interface ReactionContent {
  body: string;
  bodyAsRichText?: RichText;
  hasAttachment?: boolean;
}

export interface ReactionFile {
  globalTransitId?: string;

  versionTag?: string;

  fileId?: string;
  id?: string;
  threadId?: string;

  payloadIsEncrypted?: boolean;

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

export interface ReactionVm extends Omit<ReactionFile, 'content'> {
  context: ReactionContext;
  content: RawReactionContent;
}

export interface RawReactionContent extends Omit<ReactionContent, 'attachments'> {
  attachment?: File;
}

export class ReactionConfig {
  static readonly CommentFileType: number = 801;
  static readonly EmojiFileType: number = 805;
}
