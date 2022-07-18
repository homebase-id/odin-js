import { Guid } from 'guid-typescript';
import { DataUtil } from '../../core/DataUtil';
import DriveProvider from '../../core/DriveData/DriveProvider';
import {
  DriveSearchResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  KeyHeader,
  TargetDrive,
} from '../../core/DriveData/DriveTypes';
import { ProviderBase, ProviderOptions } from '../../core/ProviderBase';
import BlogDefinitionProvider from './BlogDefinitionProvider';
import {
  BlogConfig,
  BlogContent,
  BlogPostType,
  blogPostTypeToTag,
  ChannelDefinition,
} from './BlogTypes';

const FixedKeyHeader: KeyHeader = {
  iv: new Uint8Array(Array(16).fill(1)),
  aesKey: new Uint8Array(Array(16).fill(1)),
};

interface BlogPostReadonlyProviderOptions extends ProviderOptions {
  driveProvider: DriveProvider;
  blogDefinitionProvider: BlogDefinitionProvider;
}

export default class BlogPostReadonlyProvider extends ProviderBase {
  private _driveProvider: DriveProvider;
  private _blogDefinitionProvider: BlogDefinitionProvider;

  constructor(options: BlogPostReadonlyProviderOptions) {
    super({
      api: options.api,
      sharedSecret: options.sharedSecret,
    });

    this._driveProvider = options.driveProvider;
    this._blogDefinitionProvider = options.blogDefinitionProvider;
  }

  //gets posts.  if type is specified, returns a filtered list of the requested type; otherwise all types are returned
  async getPosts<T extends BlogContent>(
    channelId: Guid | string,
    type: BlogPostType,
    pageNumber = 1,
    pageSize = 10
  ): Promise<T[]> {
    const targetDrive = this.getPublishChannelDrive(
      typeof channelId === 'string' ? Guid.parse(channelId) : channelId
    );
    const params: FileQueryParams = {
      targetDrive: targetDrive,
      tagsMatchAtLeastOne: type ? [blogPostTypeToTag(type).toString()] : undefined,
      fileType: [BlogConfig.BlogPostFileType],
    };

    const ro: GetBatchQueryResultOptions = {
      maxRecords: pageSize,
      includeMetadataHeader: true,
    };

    const response = await this._driveProvider.QueryBatch<any>(params, ro);

    const posts: T[] = [];
    for (const key in response.searchResults) {
      const dsr = response.searchResults[key];
      posts.push(await this.dsrToBlogContent(dsr, targetDrive, response.includeMetadataHeader));
    }

    return posts;
  }

  //Gets posts across all channels, ordered by date
  async getRecentPosts<T extends BlogContent>(
    type: BlogPostType,
    pageNumber = 1,
    pageSize = 10
  ): Promise<T[]> {
    const channels = await this.getChannels();

    let posts: T[] = [];

    for (const key in channels) {
      const channel = channels[key];
      const channelPosts = await this.getPosts<T>(Guid.parse(channel.channelId), type, 1, 10);
      posts = posts.concat(channelPosts);
    }

    return posts;
  }

  //gets the content for a given post id
  async getBlogContent<T extends BlogContent>(
    channelId: Guid | string,
    id: Guid
  ): Promise<T | undefined> {
    const targetDrive = this.getPublishChannelDrive(
      typeof channelId === 'string' ? Guid.parse(channelId) : channelId
    );
    const params: FileQueryParams = {
      tagsMatchAtLeastOne: [id.toString()],
      targetDrive: targetDrive,
      fileType: [BlogConfig.BlogPostFileType],
    };

    const response = await this._driveProvider.QueryBatch<any>(params);

    if (response.searchResults.length >= 1) {
      if (response.searchResults.length > 1) {
        console.warn(`Found more than one file with alias [${id.toString()}].  Using first entry.`);
      }

      const dsr = response.searchResults[0];
      return await this.dsrToBlogContent<T>(dsr, targetDrive, response.includeMetadataHeader);
    }

    return;
  }

  async getChannels(): Promise<ChannelDefinition[]> {
    const channels = await this._blogDefinitionProvider.getChannelDefinitions();
    return channels;
  }

  async getChannelDefinition(id: Guid) {
    return await this._blogDefinitionProvider.getChannelDefinition(id);
  }

  public getPublishChannelDrive(channelId: Guid): TargetDrive {
    const targetDrive: TargetDrive = {
      alias: channelId.toString(),
      type: BlogConfig.ChannelDriveType.toString(),
    };

    return targetDrive;
  }

  ///

  private async dsrToBlogContent<T extends BlogContent>(
    dsr: DriveSearchResult<any>,
    targetDrive: TargetDrive,
    includeMetadataHeader: boolean
  ): Promise<T> {
    const content = await this.decryptBlogContent<T>(dsr, targetDrive, includeMetadataHeader);
    return content;
  }

  private async decryptBlogContent<T extends BlogContent>(
    dsr: DriveSearchResult<any>,
    targetDrive: TargetDrive,
    includeMetadataHeader: boolean
  ): Promise<T> {
    if (dsr.contentIsComplete && includeMetadataHeader) {
      const bytes = await this._driveProvider.DecryptUsingKeyHeader(
        DataUtil.base64ToUint8Array(dsr.jsonContent),
        FixedKeyHeader
      );
      const json = DataUtil.byteArrayToString(bytes);
      return JSON.parse(json);
    } else {
      return await this._driveProvider.GetPayloadAsJson<T>(
        targetDrive,
        Guid.parse(dsr.fileId),
        FixedKeyHeader
      );
    }
  }
}
