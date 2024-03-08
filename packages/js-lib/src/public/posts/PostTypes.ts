import {
  TargetDrive,
  EmbeddedThumb,
  ThumbnailFile,
  RichText,
  ReactionFile,
  NewDriveSearchResult,
  SecurityGroupType,
} from '../../core/core';
import { toGuidId } from '../../helpers/helpers';

export interface ChannelDefinition {
  name: string;
  slug: string;
  description: string;
  showOnHomePage: boolean;
  templateId?: number;
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

  static readonly PublicChannelId = toGuidId('public_channel_drive');
  static readonly PublicChannelSlug = 'public-posts';
  static readonly PublicChannel: ChannelDefinition = {
    name: 'Public Posts',
    slug: BlogConfig.PublicChannelSlug,
    showOnHomePage: true,
    description: '',
    templateId: undefined,
  };

  static readonly PublicChannelNewDsr: NewDriveSearchResult<ChannelDefinition> = {
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
  // When undefined.. It's the fileId of the postFile itself
  fileId: string | undefined;
  fileKey: string;
  type: 'video' | 'image';
}

export interface NewMediaFile {
  fileKey?: string;
  file: File | Blob;
  thumbnail?: ThumbnailFile;
}

// export type PostFile<T extends PostContent> = DriveSearchResult<T>;
// export type NewPostFile<T extends PostContent> = NewDriveSearchResult<T>;

export interface EmbeddedPost extends Omit<PostContent, 'embeddedPost'> {
  permalink: string;
  previewThumbnail?: EmbeddedThumb;
  fileId: string;
  globalTransitId: string | undefined;
  lastModified: number | undefined;
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
  target: { fileId: string; globalTransitId: string; isEncrypted: boolean };
}

export interface RawReactionContent extends Omit<ReactionFile, 'attachments'> {
  attachment?: File;
}

export class ReactionConfig {
  static readonly CommentFileType: number = 801;
}
