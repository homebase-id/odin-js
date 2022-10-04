import { DriveProvider } from '../../core/DriveData/DriveProvider';
import {
  DriveSearchResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  TargetDrive,
} from '../../core/DriveData/DriveTypes';
import { ProviderBase, ProviderOptions } from '../../core/ProviderBase';
import { CursoredResult } from '../../core/Types';
import BlogDefinitionProvider from './BlogDefinitionProvider';
import {
  BlogConfig,
  BlogContent,
  BlogPostType,
  blogPostTypeToTag,
  ChannelDefinition,
} from './BlogTypes';

interface BlogPostReadonlyProviderOptions extends ProviderOptions {
  driveProvider: DriveProvider;
  blogDefinitionProvider: BlogDefinitionProvider;
}

export default class BlogPostReadonlyProvider extends ProviderBase {
  protected _driveProvider: DriveProvider;
  protected _blogDefinitionProvider: BlogDefinitionProvider;

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
    channelId: string,
    type: BlogPostType,
    cursorState: string | undefined = undefined,
    pageSize = 10
  ): Promise<CursoredResult<T[]>> {
    const targetDrive = this._blogDefinitionProvider.getPublishChannelDrive(channelId);
    const params: FileQueryParams = {
      targetDrive: targetDrive,
      tagsMatchAtLeastOne: type ? [blogPostTypeToTag(type).toString()] : undefined,
      fileType: [BlogConfig.BlogPostFileType],
    };

    const ro: GetBatchQueryResultOptions = {
      maxRecords: pageSize,
      cursorState: cursorState,
      includeMetadataHeader: true,
    };

    const response = await this._driveProvider.QueryBatch(params, ro);

    const posts: T[] = [];
    for (const key in response.searchResults) {
      const dsr = response.searchResults[key];
      posts.push(await this.dsrToBlogContent(dsr, targetDrive, response.includeMetadataHeader));
    }

    return { cursorState: response.cursorState, results: posts };
  }

  //Gets posts across all channels, ordered by date
  async getRecentPosts<T extends BlogContent>(type: BlogPostType, pageSize = 10): Promise<T[]> {
    const channels = await this.getChannels();

    let posts: T[] = [];

    for (const key in channels) {
      const channel = channels[key];
      const channelPosts = await this.getPosts<T>(
        channel.channelId,
        type,
        undefined,
        Math.ceil(pageSize / channels.length) // TODO: do this properly, now only works if all channels are equal and have the same dates
      );
      posts = posts.concat(channelPosts.results);
    }

    // Sorted descending
    posts.sort((a, b) => b.dateUnixTime - a.dateUnixTime);

    return posts;
  }

  //gets the content for a given post id
  async getBlogContent<T extends BlogContent>(
    channelId: string,
    id: string
  ): Promise<T | undefined> {
    const targetDrive = this._blogDefinitionProvider.getPublishChannelDrive(channelId);
    const params: FileQueryParams = {
      tagsMatchAtLeastOne: [id],
      targetDrive: targetDrive,
      fileType: [BlogConfig.BlogPostFileType],
    };

    const response = await this._driveProvider.QueryBatch(params);

    if (response.searchResults.length >= 1) {
      if (response.searchResults.length > 1) {
        console.warn(`Found more than one file with alias [${id}].  Using first entry.`);
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

  async getChannelDefinition(id: string) {
    return await this._blogDefinitionProvider.getChannelDefinition(id);
  }

  ///

  private async dsrToBlogContent<T extends BlogContent>(
    dsr: DriveSearchResult,
    targetDrive: TargetDrive,
    includeMetadataHeader: boolean
  ): Promise<T> {
    const content = await this.decryptBlogContent<T>(dsr, targetDrive, includeMetadataHeader);
    return content;
  }

  private async decryptBlogContent<T extends BlogContent>(
    dsr: DriveSearchResult,
    targetDrive: TargetDrive,
    includeMetadataHeader: boolean
  ): Promise<T> {
    const keyheader = dsr.fileMetadata.payloadIsEncrypted
      ? await this._driveProvider.DecryptKeyHeader(dsr.sharedSecretEncryptedKeyHeader)
      : undefined;

    if (dsr.fileMetadata.appData.contentIsComplete && includeMetadataHeader) {
      return await this._driveProvider.DecryptJsonContent<T>(dsr.fileMetadata, keyheader);
    } else {
      console.log(`content wasn't complete... That seems wrong`);

      return await this._driveProvider.GetPayloadAsJson<T>(targetDrive, dsr.fileId, keyheader);
    }
  }
}
