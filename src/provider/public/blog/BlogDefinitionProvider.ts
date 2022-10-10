import {
  DriveSearchResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  TargetDrive,
} from '../../core/DriveData/DriveTypes';
import { ProviderBase, ProviderOptions } from '../../core/ProviderBase';
import { BlogConfig, ChannelDefinition } from './BlogTypes';
import { DataUtil } from '../../core/DataUtil';
import { DriveProvider } from '../../core/DriveData/DriveProvider';
import {
  SecurityGroupType,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../../core/DriveData/DriveUploadTypes';

interface BlogDefinitionProviderOptions extends ProviderOptions {
  driveProvider: DriveProvider;
}

export class BlogDefinitionProvider extends ProviderBase {
  private _driveProvider: DriveProvider;

  constructor(options: BlogDefinitionProviderOptions) {
    super({
      api: options.api,
      sharedSecret: options.sharedSecret,
    });
    this._driveProvider = options.driveProvider;
  }

  async getChannelDefinitions(): Promise<ChannelDefinition[]> {
    const drives = await this._driveProvider.GetDrivesByType(BlogConfig.DriveType, 1, 1000);

    const channelHeaders = drives.results.map((drive) => {
      return {
        id: drive.targetDriveInfo.alias,
        name: drive.name,
      };
    });

    const definitions = await Promise.all(
      channelHeaders.map(async (header) => {
        const { definition } = (await this.getChannelDefinitionInternal(header.id)) ?? {
          definition: undefined,
        };

        return definition;
      })
    );

    return definitions.filter((channel) => channel !== undefined) as ChannelDefinition[];
  }

  async getChannelDefinition(channelId: string): Promise<ChannelDefinition | undefined> {
    const { definition } = (await this.getChannelDefinitionInternal(channelId)) ?? {
      definition: undefined,
    };

    return definition;
  }

  async getChannelDefinitionBySlug(slug: string) {
    const channels = await this.getChannelDefinitions();
    return channels.find((channel) => channel.slug === slug);
  }

  async saveChannelDefinition(definition: ChannelDefinition): Promise<UploadResult> {
    const channelMetadata = '';

    if (!definition.channelId) {
      definition.channelId = DataUtil.toGuidId(definition.name);
    }

    const encrypt = !(
      definition.acl?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
      definition.acl?.requiredSecurityGroup === SecurityGroupType.Authenticated
    );

    const targetDrive = this.getTargetDrive(definition.channelId);
    await this._driveProvider.EnsureDrive(targetDrive, definition.name, channelMetadata, true);

    const { fileId } = (await this.getChannelDefinitionInternal(definition.channelId)) ?? {
      fileId: undefined,
    };

    const instructionSet: UploadInstructionSet = {
      transferIv: this._driveProvider.Random16(),
      storageOptions: {
        overwriteFileId: fileId,
        drive: targetDrive,
      },
      transitOptions: null,
    };

    const payloadJson: string = DataUtil.JsonStringify64(definition);
    const payloadBytes = DataUtil.stringToUint8Array(payloadJson);

    // Set max of 3kb for jsonContent so enough room is left for metedata
    const shouldEmbedContent = payloadBytes.length < 3000;
    const metadata: UploadFileMetadata = {
      contentType: 'application/json',
      appData: {
        tags: [definition.channelId],
        contentIsComplete: shouldEmbedContent,
        fileType: BlogConfig.ChannelDefinitionFileType,
        jsonContent: shouldEmbedContent ? payloadJson : null,
      },
      payloadIsEncrypted: encrypt,
      accessControlList: definition.acl,
    };

    return await this._driveProvider.Upload(
      instructionSet,
      metadata,
      payloadBytes,
      undefined,
      encrypt
    );
  }

  async removeChannelDefinition(channelId: string) {
    const channelData = await this.getChannelDefinitionInternal(channelId);
    if (channelData?.fileId) {
      this._driveProvider.DeleteFile(this.getTargetDrive(channelId), channelData.fileId);
      // TODO Should remove the Drive itself as well
    } else {
      throw new Error(`Remove Channel: Channel with id: ${channelId} not found`);
    }
  }

  async ensureConfiguration() {
    // Create Public Channel oon the (Default) Public Posts Drive
    const publicDef = await this.getChannelDefinitionInternal(BlogConfig.PublicChannel.channelId);
    if (!publicDef?.fileId) {
      await this.saveChannelDefinition(BlogConfig.PublicChannel);
    }
  }

  public getTargetDrive(channelId: string): TargetDrive {
    return {
      alias: channelId,
      type: BlogConfig.DriveType,
    };
  }

  // Internals:
  private async getChannelDefinitionInternal(
    channelId: string
  ): Promise<{ definition: ChannelDefinition; fileId: string } | undefined> {
    const targetDrive = this.getTargetDrive(channelId);

    const params: FileQueryParams = {
      targetDrive: targetDrive,
      tagsMatchAtLeastOne: [channelId],
    };

    const ro: GetBatchQueryResultOptions = {
      cursorState: undefined,
      maxRecords: 1,
      includeMetadataHeader: true,
    };

    try {
      const response = await this._driveProvider.QueryBatch(params, ro);

      if (response.searchResults.length == 1) {
        const dsr = response.searchResults[0];
        const definition = await this.decryptDefinition(
          dsr,
          targetDrive,
          response.includeMetadataHeader
        );

        return {
          fileId: dsr.fileId,
          definition: definition,
        };
      }
    } catch (ex) {
      // Catch al, as targetDrive might be inaccesible (when it doesn't exist yet)
    }

    return;
  }

  private async decryptDefinition(
    dsr: DriveSearchResult,
    targetDrive: TargetDrive,
    includeMetadataHeader: boolean
  ): Promise<ChannelDefinition> {
    const keyheader = dsr.fileMetadata.payloadIsEncrypted
      ? await this._driveProvider.DecryptKeyHeader(dsr.sharedSecretEncryptedKeyHeader)
      : undefined;

    if (dsr.fileMetadata.appData.contentIsComplete && includeMetadataHeader) {
      return await this._driveProvider.DecryptJsonContent<ChannelDefinition>(
        dsr.fileMetadata,
        keyheader
      );
    } else {
      console.log(`content wasn't complete... That seems wrong`);
      return await this._driveProvider.GetPayloadAsJson<ChannelDefinition>(
        targetDrive,
        dsr.fileId,
        keyheader
      );
    }
  }
}

export const getChannelDrive = (channelId: string): TargetDrive => {
  return {
    alias: channelId,
    type: BlogConfig.DriveType,
  };
};
