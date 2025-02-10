import {
  PayloadDescriptor,
  TargetDrive,
  EmbeddedThumb,
  RichText,
  NewHomebaseFile,
  SecurityGroupType,
  AccessControlList,
  CommentReaction,
} from '../../core/core';
import { toGuidId } from '../../helpers/helpers';

export interface ChannelDefinition {
  name: string;
  slug: string;
  description: string;
  showOnHomePage: boolean;
  templateId?: number;
  isCollaborative?: boolean;
}

export interface CollaborativeChannelDefinition extends ChannelDefinition {
  isCollaborative?: true;
  acl: AccessControlList;
}

export interface RemoteCollaborativeChannelDefinition extends CollaborativeChannelDefinition {
  odinId: string;
  uniqueId?: string;
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
  static readonly RemoteChannelDefinitionFileType: number = 107;
  static readonly DriveType: string = '8f448716e34cedf9014145e043ca6612';

  static readonly PublicChannelId = toGuidId('public_channel_drive');
  static readonly PublicChannelSlug = 'public-posts';
  static readonly PublicChannel: ChannelDefinition = {
    name: 'Main',
    slug: BlogConfig.PublicChannelSlug,
    showOnHomePage: true,
    description: '',
    templateId: undefined,
  };

  static readonly PublicChannelNewDsr: NewHomebaseFile<ChannelDefinition> = {
    fileMetadata: {
      appData: {
        uniqueId: BlogConfig.PublicChannelId,
        content: BlogConfig.PublicChannel,
      },
    },
    serverMetadata: {
      accessControlList: {
        requiredSecurityGroup: SecurityGroupType.Anonymous,
      },
    },
  };

  static readonly PublicChannelDrive: TargetDrive = {
    alias: BlogConfig.PublicChannelId,
    type: BlogConfig.DriveType,
  };

  static readonly FeedDrive: TargetDrive = {
    alias: '4db49422ebad02e99ab96e9c477d1e08',
    type: 'a3227ffba87608beeb24fee9b70d92a6',
  };

  static readonly XDataType: number = 100;
  static readonly FacebookDataType: number = 110;
  static readonly InstagramDataType: number = 120;
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

// Kept different for historical data
export interface PrimaryMediaFile {
  fileKey: string;
  fileId: string | undefined;
  type: string;
}

export interface EmbeddedPost extends Omit<PostContent, 'embeddedPost'> {
  permalink: string;
  previewThumbnail?: EmbeddedThumb;
  fileId: string;
  globalTransitId: string | undefined;
  lastModified: number | undefined;
  userDate: number;
  payloads?: PayloadDescriptor[];
  authorOdinId: string;
}

export type ReactAccess = 'emoji' | 'comment' | boolean;

export interface PostContent {
  id: string; // id that is set once and never changes; Used for permalink;
  channelId: string;
  reactAccess?: ReactAccess;
  isCollaborative?: boolean; // A collaborative post; => Anyone with access can edit it; (Only supported on collaborative channels)

  caption: string;
  captionAsRichText?: RichText;
  slug: string;
  primaryMediaFile?: PrimaryMediaFile;
  type: 'Article' | 'Media' | 'Tweet';

  /**
   * @deprecated Use fileMetadata.originalAuthor instead
   */
  authorOdinId?: string;
  embeddedPost?: EmbeddedPost;

  // For posts from external sources
  sourceUrl?: string;
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
}

export interface Tweet extends PostContent {
  type: 'Tweet';
}

export interface ReactionContext {
  odinId: string;
  channelId: string;
  target: { fileId: string; globalTransitId: string; isEncrypted: boolean };
}

export interface RawReactionContent extends Omit<CommentReaction, 'attachments'> {
  attachment?: File;
}

export class ReactionConfig {
  static readonly CommentFileType: number = 801;
}
