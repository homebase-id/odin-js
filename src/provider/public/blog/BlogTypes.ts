import { Guid } from 'guid-typescript';
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
  static readonly BlogPostFileType: number = 101;
  static readonly BlogChannelDefinitionFileType: number = 103;
  static readonly DriveType: string = DataUtil.toGuidId('blog_drive_type');

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

export class BlogPostPublishStatus {
  static readonly Draft: Guid = Guid.parse('11111111-1111-1111-1111-111100001111');
  static readonly Published: Guid = Guid.parse('22222222-1111-1111-1111-111100001111');
}

export class BlogPostTags {
  static readonly IsBlogPost: Guid = Guid.parse('11235132-1111-1111-1111-111100001111');
  static readonly TypeOfArticle: Guid = Guid.parse('11235132-1888-8888-8888-000000008888');
  static readonly TypeOfImage: Guid = Guid.parse('11235132-1777-7777-7777-000000007777');
  static readonly TypeOfVideo: Guid = Guid.parse('11235132-1666-6666-6666-000000006666');
  static readonly TypeOfTweet: Guid = Guid.parse('11235132-1555-5555-5555-000000005555');
}

export type BlogPostType = 'Article' | 'Image' | 'Video' | 'Tweet';

export const blogPostTypeToTag = (type: BlogPostType): Guid => {
  switch (type) {
    case 'Article':
      return BlogPostTags.TypeOfArticle;
    case 'Image':
      return BlogPostTags.TypeOfImage;
    case 'Tweet':
      return BlogPostTags.TypeOfTweet;
    case 'Video':
      return BlogPostTags.TypeOfVideo;
  }

  throw 'Invalid blog post type';
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
}

export interface BlogArticle extends PostContent {
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

export interface ImagePost extends PostContent {
  imageFileId: string;
  type: 'Image';
}

export interface VideoPost extends PostContent {
  videoFileId: string;
  type: 'Video';
}

export interface Tweet extends PostContent {
  type: 'Tweet';
}

export type BlogTypeUnion = BlogArticle | ImagePost | VideoPost | Tweet;
