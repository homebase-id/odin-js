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
import TransitProvider from '../../core/TransitData/TransitProvider';
import MediaProvider from '../../core/MediaProvider';
import {
  AccessControlList,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../../core/TransitData/TransitTypes';
import { HomePageConfig } from '../home/HomeTypes';
import {
  BlogConfig,
  BlogContent,
  BlogMasterPayload,
  BlogPostFile,
  BlogPostPublishStatus,
  BlogPostType,
  blogPostTypeToTag,
  PublishTarget,
} from './BlogTypes';
import BlogDefinitionProvider from './BlogDefinitionProvider';

interface BlostPostProviderOptions extends ProviderOptions {
  driveProvider: DriveProvider;
  transitProvider: TransitProvider;
  mediaProvider: MediaProvider;
  blogDefinitionProvider: BlogDefinitionProvider;
}

const FixedKeyHeader: KeyHeader = {
  iv: new Uint8Array(Array(16).fill(1)),
  aesKey: new Uint8Array(Array(16).fill(1)),
};

export default class BlogPostProvider extends ProviderBase {
  private _driveProvider: DriveProvider;
  private _transitProvider: TransitProvider;
  private _mediaProvider: MediaProvider;
  private _blogDefinitionProvider: BlogDefinitionProvider;

  constructor(options: BlostPostProviderOptions) {
    super({
      api: options.api,
      sharedSecret: options.sharedSecret,
    });
    this._driveProvider = options.driveProvider;
    this._transitProvider = options.transitProvider;
    this._mediaProvider = options.mediaProvider;
    this._blogDefinitionProvider = options.blogDefinitionProvider;
  }

  public static getMasterContentTargetDrive(): TargetDrive {
    const drive: TargetDrive = {
      alias: HomePageConfig.BlogMainContentDriveId.toString(),
      type: BlogConfig.DriveType.toString(),
    };

    return drive;
  }

  async getPostsByType<T extends BlogContent>(
    type: BlogPostType,
    pageNumber: number,
    pageSize: number
  ): Promise<BlogPostFile<T>[]> {
    const typeTag = blogPostTypeToTag(type);

    const targetDrive = BlogPostProvider.getMasterContentTargetDrive();
    //get all files tag as being a profile definition

    const params: FileQueryParams = {
      targetDrive: targetDrive,
      tagsMatchAtLeastOne: [typeTag.toString()],
      fileType: [BlogConfig.BlogPostFileType],
    };

    const response = await this._driveProvider.QueryBatch<any>(params);

    const posts: BlogPostFile<T>[] = [];
    for (const key in response.searchResults) {
      const dsr = response.searchResults[key];
      posts.push(await this.dsrToBlogPostFile(dsr, targetDrive, response.includeMetadataHeader));
    }

    return posts;
  }

  async getPosts<T extends BlogContent>(
    publishStatus: BlogPostPublishStatus,
    pageNumber: number,
    pageSize: number
  ): Promise<BlogPostFile<T>[]> {
    //get all files tag as being a profile definition
    const targetDrive = BlogPostProvider.getMasterContentTargetDrive();
    const params: FileQueryParams = {
      targetDrive: targetDrive,
      tagsMatchAtLeastOne: [publishStatus.toString()],
      fileType: [BlogConfig.BlogPostFileType],
    };

    const ro: GetBatchQueryResultOptions = {
      maxRecords: pageSize,
      includeMetadataHeader: true,
    };

    const response = await this._driveProvider.QueryBatch<any>(params, ro);

    const posts: BlogPostFile<T>[] = [];
    for (const key in response.searchResults) {
      const dsr = response.searchResults[key];
      posts.push(await this.dsrToBlogPostFile(dsr, targetDrive, response.includeMetadataHeader));
    }

    return posts;
  }

  async getBlogPostFile<T extends BlogContent>(id: Guid): Promise<BlogPostFile<T> | undefined> {
    const targetDrive = BlogPostProvider.getMasterContentTargetDrive();

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
      return await this.dsrToBlogPostFile<T>(dsr, targetDrive, response.includeMetadataHeader);
    }

    return;
  }

  //saves the blogpost to the master drive.  Returns the fileId on the master drive
  async saveBlogPostMaster<T extends BlogContent>(
    file: BlogPostFile<T>,
    publishState: BlogPostPublishStatus = BlogPostPublishStatus.Draft
  ): Promise<Guid> {
    const instructionSet: UploadInstructionSet = {
      transferIv: this._transitProvider.Random16(),
      storageOptions: {
        overwriteFileId: file.fileId?.toString(),
        drive: BlogPostProvider.getMasterContentTargetDrive(),
      },
      transitOptions: null,
    };

    const metadata: UploadFileMetadata = {
      contentType: 'application/json',
      appData: {
        tags: [
          blogPostTypeToTag(file.content.type).toString(),
          publishState.toString(),
          file.content.id,
        ],
        contentIsComplete: false,
        fileType: BlogConfig.BlogPostFileType,
        jsonContent: null,
      },
      payloadIsEncrypted: false,
      accessControlList: file.acl,
    };

    //need to save file.publishTargets
    const payload: BlogMasterPayload<T> = {
      publishTargets: file.publishTargets,
      content: file.content,
    };

    const payloadJson: string = DataUtil.JsonStringify64(payload);
    const payloadBytes = DataUtil.stringToUint8Array(payloadJson);
    const result: UploadResult = await this._transitProvider.UploadUsingKeyHeader(
      FixedKeyHeader,
      instructionSet,
      metadata,
      payloadBytes
    );
    return Guid.parse(result.file.fileId);
  }

  async publishBlogPost<T extends BlogContent>(
    file: BlogPostFile<T>,
    newPublishTargets: PublishTarget[]
  ): Promise<PublishTarget[]> {
    //NOTE: we keep the same id (alias) across all drives

    //first remove existing publish files that were unchecked
    const deletionTargets = file.publishTargets.filter((pt) => {
      const exists = newPublishTargets.find((np) => np.channelId == pt.channelId);
      return !exists;
    });

    console.log('deletion targets', deletionTargets);

    for (const key in deletionTargets) {
      const target = deletionTargets[key];
      await this.deleteFromChannel(Guid.parse(target.channelId), Guid.parse(file.content.id));
    }

    const resultingPublishTargets: PublishTarget[] = [];
    for (const key in newPublishTargets) {
      const newTarget = newPublishTargets[key];
      const publishTarget = await this.publishBlogPostToChannel(
        Guid.parse(newTarget.channelId),
        newTarget.acl,
        file.content
      );
      resultingPublishTargets.push(publishTarget);
    }

    file.publishTargets = resultingPublishTargets;
    const masterFileId = await this.saveBlogPostMaster(file, BlogPostPublishStatus.Published);

    return resultingPublishTargets;
  }

  async deleteFromChannel(channelId: Guid, id: Guid) {
    const fileId = await this.getPublishedFileId(channelId, id);
    if (!fileId) {
      throw new Error('Blog post with this ID not found');
    }
    return await this._driveProvider.DeleteFile(
      this._blogDefinitionProvider.getPublishChannelDrive(channelId),
      fileId
    );
  }

  ///

  private async publishDependencies<T extends BlogContent>(
    channelId: Guid,
    acl: AccessControlList,
    content: T
  ): Promise<any> {
    //TODO: handle other dependencies (i.e. videoFileId, etc.)
    if (content.primaryImageFileId) {
      const bytes = await this._driveProvider.GetPayloadBytes(
        BlogPostProvider.getMasterContentTargetDrive(),
        Guid.parse(content.primaryImageFileId),
        FixedKeyHeader
      );

      const tag = Guid.createEmpty();

      const destinationMediaFileId = await this._mediaProvider.uploadImage(
        this._blogDefinitionProvider.getPublishChannelDrive(channelId),
        tag,
        acl,
        new Uint8Array(bytes)
      );

      content.primaryImageFileId = destinationMediaFileId?.toString();
    }
  }

  // Saves a blog post to a channel drive.  Does not save publish targets
  private async publishBlogPostToChannel<T extends BlogContent>(
    channelId: Guid,
    acl: AccessControlList,
    originalContent: T
  ): Promise<PublishTarget> {
    //make a copy of content because we're going
    //to change it for this publish
    const content = { ...originalContent };

    await this.publishDependencies(channelId, acl, content);
    content.channelId = channelId.toString();

    const existingPublishedFileId = await this.getPublishedFileId(
      channelId,
      Guid.parse(content.id)
    );

    const instructionSet: UploadInstructionSet = {
      transferIv: this._transitProvider.Random16(),
      storageOptions: {
        overwriteFileId: existingPublishedFileId ? existingPublishedFileId.toString() : undefined,
        drive: this._blogDefinitionProvider.getPublishChannelDrive(channelId),
      },
      transitOptions: null,
    };

    const metadata: UploadFileMetadata = {
      contentType: 'application/json',
      appData: {
        tags: [blogPostTypeToTag(content.type).toString()],
        contentIsComplete: false,
        fileType: BlogConfig.BlogPostFileType,
        jsonContent: null,
        alias: content.id,
      },
      payloadIsEncrypted: false,
      accessControlList: acl,
    };

    const payloadJson: string = DataUtil.JsonStringify64(content);
    const payloadBytes = DataUtil.stringToUint8Array(payloadJson);
    const result: UploadResult = await this._transitProvider.UploadUsingKeyHeader(
      FixedKeyHeader,
      instructionSet,
      metadata,
      payloadBytes
    );

    const pt: PublishTarget = {
      fileId: result.file.fileId.toString(),
      channelId: channelId.toString(),
      acl: acl,
      lastPublishTime: new Date().getTime(),
    };

    return pt;
  }

  private async dsrToBlogPostFile<T extends BlogContent>(
    dsr: DriveSearchResult<any>,
    targetDrive: TargetDrive,
    includeMetadataHeader: boolean
  ): Promise<BlogPostFile<T>> {
    const masterPost = await this.decryptMasterPayload<T>(dsr, targetDrive, includeMetadataHeader);

    const file: BlogPostFile<T> = {
      fileId: Guid.parse(dsr.fileId),
      acl: dsr.accessControlList,
      publishTargets: masterPost.publishTargets,
      content: masterPost.content,
    };

    return file;
  }

  private async getPublishedFileId(channelId: Guid, id: Guid): Promise<Guid | undefined> {
    const params: FileQueryParams = {
      targetDrive: this._blogDefinitionProvider.getPublishChannelDrive(channelId),
      tagsMatchAtLeastOne: [id.toString()],
    };

    const query = await this._driveProvider.QueryBatch<any>(params);

    if (query.searchResults.length >= 1) {
      if (query.searchResults.length > 1) {
        console.warn(`Found more than one file with alias [${id.toString()}].  Using first entry.`);
      }

      const dsr = query.searchResults[0];
      return Guid.parse(dsr.fileId);
    }

    return;
  }

  private async decryptMasterPayload<T extends BlogContent>(
    dsr: DriveSearchResult<any>,
    targetDrive: TargetDrive,
    includeMetadataHeader: boolean
  ): Promise<BlogMasterPayload<T>> {
    if (dsr.contentIsComplete && includeMetadataHeader) {
      const bytes = await this._driveProvider.DecryptUsingKeyHeader(
        DataUtil.base64ToUint8Array(dsr.jsonContent),
        FixedKeyHeader
      );
      const json = DataUtil.byteArrayToString(bytes);
      return JSON.parse(json);
    } else {
      return await this._driveProvider.GetPayloadAsJson<BlogMasterPayload<T>>(
        targetDrive,
        Guid.parse(dsr.fileId),
        FixedKeyHeader
      );
    }
  }
}
