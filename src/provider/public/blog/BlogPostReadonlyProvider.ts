import { DataUtil } from '../../core/DataUtil';
import { DriveProvider } from '../../core/DriveData/DriveProvider';
import {
  DriveSearchResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  TargetDrive,
} from '../../core/DriveData/DriveTypes';
import { ProviderBase, ProviderOptions } from '../../core/ProviderBase';
import { CursoredResult, MultiRequestCursoredResult } from '../../core/Types';
import { BlogDefinitionProvider } from './BlogDefinitionProvider';
import {
  BlogConfig,
  PostContent,
  postTypeToTag,
  ChannelDefinition,
  PostFile,
  PostType,
} from './BlogTypes';

interface BlogPostReadonlyProviderOptions extends ProviderOptions {
  driveProvider: DriveProvider;
  blogDefinitionProvider: BlogDefinitionProvider;
}

export class BlogPostReadonlyProvider extends ProviderBase {
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

  //Gets posts. if type is specified, returns a filtered list of the requested type; otherwise all types are returned
  async getPosts<T extends PostContent>(
    channelId: string,
    type: PostType | undefined,
    cursorState: string | undefined = undefined,
    pageSize = 10
  ): Promise<CursoredResult<PostFile<T>[]>> {
    const targetDrive = this._blogDefinitionProvider.getTargetDrive(channelId);
    const params: FileQueryParams = {
      targetDrive: targetDrive,
      tagsMatchAtLeastOne: type ? [postTypeToTag(type).toString()] : undefined,
      fileType: [BlogConfig.PostFileType],
    };

    const ro: GetBatchQueryResultOptions = {
      maxRecords: pageSize,
      cursorState: cursorState,
      includeMetadataHeader: true,
    };

    const response = await this._driveProvider.QueryBatch(params, ro);

    const posts: PostFile<T>[] = [];
    for (const key in response.searchResults) {
      const dsr = response.searchResults[key];
      posts.push(await this.dsrToPostFile(dsr, targetDrive, response.includeMetadataHeader));
    }

    return { cursorState: response.cursorState, results: posts };
  }

  //Gets posts across all channels, ordered by date
  async getRecentPosts<T extends PostContent>(
    type: PostType | undefined,
    pageSize = 10,
    cursorState: Record<string, string> | undefined = undefined
  ): Promise<MultiRequestCursoredResult<PostFile<T>[]>> {
    const channels = await this.getChannels();
    const allCursors: Record<string, string> = {};
    const resultPerChannel = await Promise.all(
      channels.map(async (channel) => {
        const result = await this.getPosts<T>(
          channel.channelId,
          type,
          cursorState?.[channel.channelId],
          Math.ceil(pageSize / channels.length) // TODO: do this properly, now only works if all channels are equal and have the same dates
        );

        allCursors[channel.channelId] = result.cursorState;
        return result.results;
      })
    );
    // Sorted descending
    const sortedPosts = resultPerChannel
      .flat(1)
      .sort((a, b) => b.content.dateUnixTime - a.content.dateUnixTime);

    return { results: sortedPosts, cursorState: allCursors };
  }

  //Gets the content for a given post id
  async getPost<T extends PostContent>(
    channelId: string,
    id: string
  ): Promise<PostFile<T> | undefined> {
    const targetDrive = this._blogDefinitionProvider.getTargetDrive(channelId);
    const params: FileQueryParams = {
      tagsMatchAtLeastOne: [id],
      targetDrive: targetDrive,
      fileType: [BlogConfig.PostFileType],
    };

    const response = await this._driveProvider.QueryBatch(params);

    if (response.searchResults.length >= 1) {
      if (response.searchResults.length > 1) {
        console.warn(`Found more than one file with alias [${id}].  Using first entry.`);
      }

      const dsr = response.searchResults[0];
      return await this.dsrToPostFile<T>(dsr, targetDrive, response.includeMetadataHeader);
    }

    return;
  }

  async getPostBySlug<T extends PostContent>(
    channelSlug: string,
    postSlug: string
  ): Promise<{ postFile: PostFile<T>; channel: ChannelDefinition } | undefined> {
    const channel = await this._blogDefinitionProvider.getChannelDefinitionBySlug(channelSlug);
    if (!channel) {
      return;
    }

    const targetDrive = this._blogDefinitionProvider.getTargetDrive(channel.channelId);
    const params: FileQueryParams = {
      tagsMatchAtLeastOne: [DataUtil.toGuidId(postSlug)],
      targetDrive: targetDrive,
      fileType: [BlogConfig.PostFileType],
    };

    const response = await this._driveProvider.QueryBatch(params);

    if (response.searchResults.length >= 1) {
      if (response.searchResults.length > 1) {
        console.warn(`Found more than one file with alias [${postSlug}].  Using first entry.`);
      }

      const dsr = response.searchResults[0];
      return {
        postFile: await this.dsrToPostFile<T>(dsr, targetDrive, response.includeMetadataHeader),
        channel: channel,
      };
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

  async getChannelDefinitionBySlug(slug: string) {
    return await this._blogDefinitionProvider.getChannelDefinitionBySlug(slug);
  }

  ///

  private async dsrToPostFile<T extends PostContent>(
    dsr: DriveSearchResult,
    targetDrive: TargetDrive,
    includeMetadataHeader: boolean
  ): Promise<PostFile<T>> {
    const content = await this._driveProvider.GetPayload<T>(
      targetDrive,
      dsr.fileId,
      dsr.fileMetadata,
      dsr.sharedSecretEncryptedKeyHeader,
      includeMetadataHeader
    );

    const file: PostFile<T> = {
      fileId: dsr.fileId,
      acl: dsr.serverMetadata?.accessControlList,
      content: content,
    };

    return file;
  }
}
