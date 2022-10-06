import { DataUtil } from '../../core/DataUtil';
import { DriveProvider } from '../../core/DriveData/DriveProvider';
import { ProviderOptions } from '../../core/ProviderBase';
import { MediaProvider } from '../../core/MediaData/MediaProvider';
import {
  SecurityGroupType,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../../core/DriveData/DriveUploadTypes';
import { BlogConfig, blogPostTypeToTag, BlogTypeUnion, PostContent, PostFile } from './BlogTypes';
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

  async savePost<T extends PostContent>(file: PostFile<T>, channelId: string): Promise<string> {
    if (!file.content.id) {
      file.content.id = DataUtil.getNewId();
    }

    const encrypt = !(
      file.acl?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
      file.acl?.requiredSecurityGroup === SecurityGroupType.Authenticated
    );

    const instructionSet: UploadInstructionSet = {
      transferIv: this._driveProvider.Random16(),
      storageOptions: {
        overwriteFileId: file?.fileId ?? '',
        drive: this._blogDefinitionProvider.getTargetDrive(channelId),
      },
      transitOptions: null,
    };

    const payloadJson: string = DataUtil.JsonStringify64(file.content);
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
          file.content.id,
          ...(file.content.slug ? [DataUtil.toGuidId(file.content.slug)] : []),
        ],
        contentIsComplete: shouldEmbedContent,
        fileType: BlogConfig.BlogPostFileType,
        jsonContent: shouldEmbedContent ? payloadJson : null,
      },
      payloadIsEncrypted: encrypt,
      accessControlList: file.acl,
    };

    const result: UploadResult = await this._driveProvider.Upload(
      instructionSet,
      metadata,
      payloadBytes,
      undefined,
      encrypt
    );

    return result.file.fileId;
  }

  async removePost(fileId: string, channelId: string) {
    const targetDrive = this._blogDefinitionProvider.getTargetDrive(channelId);
    this._driveProvider.DeleteFile(targetDrive, fileId);
  }
}
