import { DataUtil } from '../../core/DataUtil';
import { DriveProvider } from '../../core/DriveData/DriveProvider';
import {
  DriveSearchResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  TargetDrive,
} from '../../core/DriveData/DriveTypes';
import { ProviderOptions } from '../../core/ProviderBase';
import MediaProvider from '../../core/MediaData/MediaProvider';
import {
  AccessControlList,
  SecurityGroupType,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../../core/DriveData/DriveUploadTypes';
import {
  BlogArticle,
  BlogConfig,
  BlogContent,
  BlogMasterPayload,
  BlogPostFile,
  BlogPostPublishStatus,
  BlogPostType,
  blogPostTypeToTag,
  BlogTypeUnion,
  PublishTarget,
} from './BlogTypes';
import BlogDefinitionProvider from './BlogDefinitionProvider';
import BlogPostReadonlyProvider from './BlogPostReadonlyProvider';

interface BlostPostProviderOptions extends ProviderOptions {
  driveProvider: DriveProvider;
  mediaProvider: MediaProvider;
  blogDefinitionProvider: BlogDefinitionProvider;
}

export default class BlogPostProvider extends BlogPostReadonlyProvider {
  private _mediaProvider: MediaProvider;

  constructor(options: BlostPostProviderOptions) {
    super({
      api: options.api,
      sharedSecret: options.sharedSecret,
      driveProvider: options.driveProvider,
      blogDefinitionProvider: options.blogDefinitionProvider,
    });

    this._mediaProvider = options.mediaProvider;
  }

  async getPostsByType<T extends BlogContent>(
    type: BlogPostType,
    cursorState: string | undefined,
    pageSize: number
  ): Promise<BlogPostFile<T>[]> {
    const typeTag = blogPostTypeToTag(type);

    const targetDrive = BlogDefinitionProvider.getMasterContentTargetDrive();
    //get all files tag as being a profile definition

    const params: FileQueryParams = {
      targetDrive: targetDrive,
      tagsMatchAtLeastOne: [typeTag.toString()],
      fileType: [BlogConfig.BlogPostFileType],
    };

    const ro: GetBatchQueryResultOptions = {
      maxRecords: pageSize,
      includeMetadataHeader: true,
    };

    const response = await this._driveProvider.QueryBatch(params, ro);

    const posts: BlogPostFile<T>[] = [];
    for (const key in response.searchResults) {
      const dsr = response.searchResults[key];
      posts.push(await this.dsrToBlogPostFile(dsr, targetDrive, response.includeMetadataHeader));
    }

    return posts;
  }

  async getMasterPosts<T extends BlogContent>(
    cursorState: string | undefined,
    pageSize: number,
    publishStatus?: BlogPostPublishStatus
  ): Promise<BlogPostFile<T>[]> {
    //get all files tag as being a profile definition
    const targetDrive = BlogDefinitionProvider.getMasterContentTargetDrive();
    const params: FileQueryParams = {
      targetDrive: targetDrive,
      fileType: [BlogConfig.BlogPostFileType],
      tagsMatchAtLeastOne: publishStatus ? [publishStatus.toString()] : undefined,
    };

    const ro: GetBatchQueryResultOptions = {
      maxRecords: pageSize,
      includeMetadataHeader: true,
    };

    const response = await this._driveProvider.QueryBatch(params, ro);

    const posts: BlogPostFile<T>[] = [];
    for (const key in response.searchResults) {
      const dsr = response.searchResults[key];
      posts.push(await this.dsrToBlogPostFile(dsr, targetDrive, response.includeMetadataHeader));
    }

    return posts;
  }

  async getBlogPostFile<T extends BlogContent>(id: string): Promise<BlogPostFile<T> | undefined> {
    const targetDrive = BlogDefinitionProvider.getMasterContentTargetDrive();
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
      return await this.dsrToBlogPostFile<T>(dsr, targetDrive, response.includeMetadataHeader);
    }

    return;
  }

  //saves the blogpost to the master drive.  Returns the fileId on the master drive
  async saveBlogPostMaster<T extends BlogContent>(
    file: BlogPostFile<T>,
    publishState: BlogPostPublishStatus = BlogPostPublishStatus.Draft
  ): Promise<string> {
    if (!file.content.id) {
      file.content.id = DataUtil.getNewId();
    }

    const encrypt = !(
      file.acl.requiredSecurityGroup === SecurityGroupType.Anonymous ||
      file.acl.requiredSecurityGroup === SecurityGroupType.Authenticated
    );

    const instructionSet: UploadInstructionSet = {
      transferIv: this._driveProvider.Random16(),
      storageOptions: {
        overwriteFileId: file?.fileId ?? '',
        drive: BlogDefinitionProvider.getMasterContentTargetDrive(),
      },
      transitOptions: null,
    };

    const payload: BlogMasterPayload<T> = {
      publishTargets: file.publishTargets,
      content: file.content,
    };

    const payloadJson: string = DataUtil.JsonStringify64(payload);
    const payloadBytes = DataUtil.stringToUint8Array(payloadJson);

    // Set max of 3kb for jsonContent so enough room is left for metedata
    const shouldEmbedContent = payloadBytes.length < 3000;

    const metadata: UploadFileMetadata = {
      contentType: 'application/json',
      appData: {
        tags: [
          blogPostTypeToTag(
            'type' in file.content ? (file.content as unknown as BlogTypeUnion).type : 'Article'
          ).toString(),
          publishState.toString(),
          file.content.id,
        ],
        contentIsComplete: shouldEmbedContent,
        fileType: BlogConfig.BlogPostFileType,
        // TODO optimize, if contents are too big we can fallback to store everything for a list view of the data
        jsonContent: shouldEmbedContent ? payloadJson : null,
      },
      payloadIsEncrypted: encrypt,
      accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner }, // Master Blogs are always Owner only,
    };

    const result: UploadResult = await this._driveProvider.Upload(
      instructionSet,
      metadata,
      //TODO: Check what to pass as payload if everything fits in jsonContent already
      payloadBytes,
      undefined,
      encrypt
    );
    return result.file.fileId;
  }

  async removeBlogPost(fileId: string) {
    // Get post and delete from publishTargets first
    const blogPost = await this.getBlogPostFile(fileId);
    if (!blogPost) {
      return;
    }

    await Promise.all(
      blogPost.publishTargets.map(async (target) => {
        const channelTarget = this._blogDefinitionProvider.getPublishChannelDrive(target.channelId);
        return await this._driveProvider.DeleteFile(channelTarget, fileId);
      })
    );

    // Finally delete master copy
    const targetDrive = BlogDefinitionProvider.getMasterContentTargetDrive();
    this._driveProvider.DeleteFile(targetDrive, fileId);
  }

  async publishBlogPost<T extends BlogContent>(
    file: BlogPostFile<T>,
    publishTargets: PublishTarget[]
  ): Promise<PublishTarget[]> {
    //NOTE: we keep the same id (alias) across all drives

    const resultingPublishTargets: PublishTarget[] = [];
    for (const key in publishTargets) {
      const newTarget = publishTargets[key];
      const publishTarget = await this.publishBlogPostToChannel(
        newTarget.channelId,
        newTarget.acl,
        file.content
      );
      resultingPublishTargets.push(publishTarget);
    }

    file.publishTargets = resultingPublishTargets;
    await this.saveBlogPostMaster(file, BlogPostPublishStatus.Published);

    return resultingPublishTargets;
  }

  async deleteFromChannel(channelId: string, id: string) {
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

  private async publishDependencies(
    channelId: string,
    acl: AccessControlList,
    originalContent: BlogContent
  ): Promise<BlogContent | BlogArticle> {
    let content: BlogContent | BlogArticle = { ...originalContent };

    const publishImage = async (imageId: string) => {
      const bytes = await this._driveProvider.GetPayloadBytes(
        BlogDefinitionProvider.getMasterContentTargetDrive(),
        imageId,
        undefined // TODO Potentially Decrypt Keyheader
      );

      const newFileId = DataUtil.getNewId();

      const destinationMediaFileId = await this._mediaProvider.uploadImage(
        this._blogDefinitionProvider.getPublishChannelDrive(channelId),
        newFileId,
        acl,
        new Uint8Array(bytes),
        newFileId
      );

      return destinationMediaFileId?.toString();
    };

    //TODO: handle other dependencies (i.e. videoFileId, etc.)
    if (content.primaryImageFileId) {
      content.primaryImageFileId = await publishImage(content.primaryImageFileId);
    }

    if ((content as BlogTypeUnion).type === 'Article') {
      const articleContent = content as BlogArticle;

      if (typeof articleContent.body !== 'string') {
        content = {
          ...content,
          body: await Promise.all(
            articleContent.body.map(async (child) => {
              if (child.type === 'image') {
                return {
                  ...child,
                  imageFileId: await publishImage(child.imageFileId as string),
                };
              }
              return child;
            })
          ),
        };
      }
    }

    return content;
  }

  // Saves a blog post to a channel drive.  Does not save publish targets
  private async publishBlogPostToChannel(
    channelId: string,
    acl: AccessControlList,
    originalContent: BlogContent
  ): Promise<PublishTarget> {
    const encrypt = !(
      acl.requiredSecurityGroup === SecurityGroupType.Anonymous ||
      acl.requiredSecurityGroup === SecurityGroupType.Authenticated
    );
    //make a copy of content because we're going
    //to change it for this publish
    const content = await this.publishDependencies(channelId, acl, originalContent);
    content.channelId = channelId.toString();

    const existingPublishedFileId = await this.getPublishedFileId(channelId, content.id);

    const instructionSet: UploadInstructionSet = {
      transferIv: this._driveProvider.Random16(),
      storageOptions: {
        overwriteFileId: existingPublishedFileId ? existingPublishedFileId.toString() : undefined,
        drive: this._blogDefinitionProvider.getPublishChannelDrive(channelId),
      },
      transitOptions: null,
    };

    const payloadJson: string = DataUtil.JsonStringify64(content);
    const payloadBytes = DataUtil.stringToUint8Array(payloadJson);

    const shouldEmbedContent = payloadBytes.length < 3000;

    const metadata: UploadFileMetadata = {
      contentType: 'application/json',
      appData: {
        tags: [
          blogPostTypeToTag(
            'type' in content ? (content as BlogTypeUnion).type : 'Article'
          ).toString(),
          content.id,
        ],
        contentIsComplete: shouldEmbedContent,
        fileType: BlogConfig.BlogPostFileType,
        // TODO optimize, if contents are too big we can fallback to store everything for a list view of the data
        jsonContent: shouldEmbedContent ? payloadJson : null,
        alias: content.id,
      },
      payloadIsEncrypted: encrypt,
      accessControlList: acl,
    };

    const result: UploadResult = await this._driveProvider.Upload(
      instructionSet,
      metadata,
      payloadBytes,
      undefined,
      encrypt
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
    dsr: DriveSearchResult,
    targetDrive: TargetDrive,
    includeMetadataHeader: boolean
  ): Promise<BlogPostFile<T>> {
    const masterPost = await this.decryptMasterPayload<T>(dsr, targetDrive, includeMetadataHeader);

    const file: BlogPostFile<T> = {
      fileId: dsr.fileMetadata.file.fileId,
      acl: dsr.serverMetadata.accessControlList,
      publishTargets: masterPost.publishTargets,
      content: masterPost.content,
    };

    return file;
  }

  private async getPublishedFileId(channelId: string, id: string): Promise<string | undefined> {
    const params: FileQueryParams = {
      targetDrive: this._blogDefinitionProvider.getPublishChannelDrive(channelId),
      tagsMatchAtLeastOne: [id],
    };

    const query = await this._driveProvider.QueryBatch(params);

    if (query.searchResults.length >= 1) {
      if (query.searchResults.length > 1) {
        console.warn(`Found more than one file with alias [${id}].  Using first entry.`);
      }

      const dsr = query.searchResults[0];
      return dsr.fileMetadata.file.fileId;
    }

    return;
  }

  private async decryptMasterPayload<T extends BlogContent>(
    dsr: DriveSearchResult,
    targetDrive: TargetDrive,
    includeMetadataHeader: boolean
  ): Promise<BlogMasterPayload<T>> {
    const keyheader = dsr.fileMetadata.payloadIsEncrypted
      ? await this._driveProvider.DecryptKeyHeader(dsr.sharedSecretEncryptedKeyHeader)
      : undefined;

    if (dsr.fileMetadata.appData.contentIsComplete && includeMetadataHeader) {
      return await this._driveProvider.DecryptJsonContent<BlogMasterPayload<T>>(
        dsr.fileMetadata,
        keyheader
      );
    } else {
      console.log(`content wasn't complete... That seems wrong`);

      return await this._driveProvider.GetPayloadAsJson<BlogMasterPayload<T>>(
        targetDrive,
        dsr.fileMetadata.file.fileId,
        keyheader
      );
    }
  }
}

export const getBlogMasterContentTargetDrive = BlogDefinitionProvider.getMasterContentTargetDrive;
