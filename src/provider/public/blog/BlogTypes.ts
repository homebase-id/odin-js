import { AccessControlList, SecurityGroupType } from '../../core/DriveData/DriveUploadTypes';
import { DataUtil } from '../../core/DataUtil';
import { TargetDrive } from '../../core/DriveData/DriveTypes';

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
  static readonly ChannelDefinitionFileType: number = 103;
  static readonly DriveType: string = DataUtil.toGuidId('post_drive_type');

  static readonly PublicChannel: ChannelDefinition = {
    channelId: DataUtil.toGuidId('public_channel_drive'),
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
}

export type PostType = 'Article' | 'Image' | 'Video' | 'Tweet';

export const postTypeToTag = (type: PostType): string => {
  switch (type) {
    case 'Article':
      return DataUtil.toGuidId('article');
    case 'Image':
      return DataUtil.toGuidId('image');
    case 'Tweet':
      return DataUtil.toGuidId('video');
    case 'Video':
      return DataUtil.toGuidId('tweet');
  }

  throw 'Invalid post type';
};

export interface PostFile<T extends PostContent> {
  fileId?: string;
  acl?: AccessControlList;
  content: T;
}

export interface PostContent {
  id: string;
  channelId: string;
  caption: string;
  slug: string;
  dateUnixTime: number;
  primaryImageFileId?: string;
  type: 'Article' | 'Image' | 'Video' | 'Tweet';
}

export interface Article extends PostContent {
  abstract: string;
  headerImageFileId: string;
  body: string | Record<string, unknown>[];
  type: 'Article';
  readingTimeStats?: ReadTimeStats;
}

export interface ReadTimeStats {
  text: string;
  time: number;
  words: number;
  minutes: number;
}

export interface Image extends PostContent {
  type: 'Image';
  imageFileIds?: string[];
}

export interface Video extends PostContent {
  videoFileId: string;
  type: 'Video';
}

export interface Tweet extends PostContent {
  type: 'Tweet';
}
