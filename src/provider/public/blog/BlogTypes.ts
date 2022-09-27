import { Guid } from 'guid-typescript';
import { AccessControlList } from '../../core/DriveData/DriveUploadTypes';
import { DataUtil } from '../../core/DataUtil';

export interface ChannelDefinition {
  channelId: string;
  name: string;
  slug?: string;
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
  static readonly ChannelDriveType: string = DataUtil.toGuidId('channel_drive_type');
  static readonly DriveType: string = DataUtil.toGuidId('blog_drive_type');
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

export type BlogPostType = 'Article' | 'ImagePost' | 'Video' | 'Tweet';

export const blogPostTypeToTag = (type: BlogPostType): Guid => {
  switch (type) {
    case 'Article':
      return BlogPostTags.TypeOfArticle;
    case 'ImagePost':
      return BlogPostTags.TypeOfImage;
    case 'Tweet':
      return BlogPostTags.TypeOfTweet;
    case 'Video':
      return BlogPostTags.TypeOfVideo;
  }

  throw 'Invalid blog post type';
};

export interface PublishTarget {
  fileId?: string; // the file id on the channel
  channelId: string; // the channel to which it was published (also drive identifier)
  acl: AccessControlList; //the permissions that should be set
  lastPublishTime?: number;
}

//The storage structure for a blogpost stored on the main drive
export interface BlogMasterPayload<T extends BlogContent> {
  publishTargets: PublishTarget[];
  content: T;
}

export interface BlogPostFile<T extends BlogContent> {
  fileId?: string;
  acl: AccessControlList;
  publishTargets: PublishTarget[];
  content: T;
}

export interface BlogContent {
  id: string;
  channelId: string;
  caption: string;
  slug?: string;
  dateUnixTime: number;
  primaryImageFileId?: string;
  readingTimeStats?: ReadTimeStats;
}

export interface ReadTimeStats {
  text: string;
  time: number;
  words: number;
  minutes: number;
}

export interface BlogArticle extends BlogContent {
  abstract: string;
  headerImageFileId: string;
  body: string | Record<string, unknown>[];
  type: 'Article';
}

export interface ImagePost extends BlogContent {
  imageFileId: string;
  type: 'ImagePost';
}

export interface VideoPost extends BlogContent {
  videoFileId: string;
  type: 'Video';
}

export interface Tweet extends BlogContent {
  type: 'Tweet';
}

export type BlogTypeUnion = BlogArticle | ImagePost | VideoPost | Tweet;

//
// export interface ProfileSection {
//     sectionId: string
//     name: string
//     attributes: AttributeSpec[]
// }
//
// export interface AttributeSpec {
//     attributeId?: string,
//     type: string
// }
