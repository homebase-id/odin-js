import { HomePageConfig } from '../home/HomeTypes';
import {
  DriveSearchResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  KeyHeader,
  TargetDrive,
} from '../../core/DriveData/DriveTypes';
import { ProviderBase, ProviderOptions } from '../../core/ProviderBase';
import { BlogConfig, ChannelDefinition } from './BlogTypes';
import { DataUtil } from '../../core/DataUtil';
import DriveProvider from '../../core/DriveData/DriveProvider';
import TransitProvider from '../../core/TransitData/TransitProvider';
import {
  SecurityGroupType,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../../core/TransitData/TransitTypes';

const defaultChannel: ChannelDefinition = {
  channelId: '93999384-0000-0000-0000-000000004440',
  name: 'Public Blog',
  description: '',
  templateId: undefined,
};

const FixedKeyHeader: KeyHeader = {
  iv: new Uint8Array(Array(16).fill(1)),
  aesKey: new Uint8Array(Array(16).fill(1)),
};

interface BlogDefinitionProviderOptions extends ProviderOptions {
  driveProvider: DriveProvider;
  transitProvider: TransitProvider;
}

export default class BlogDefinitionProvider extends ProviderBase {
  private _driveProvider: DriveProvider;
  private _transitProvider: TransitProvider;

  constructor(options: BlogDefinitionProviderOptions) {
    super({
      api: options.api,
      sharedSecret: options.sharedSecret,
    });
    this._driveProvider = options.driveProvider;
    this._transitProvider = options.transitProvider;
  }

  getDefaultChannelId(): string {
    return defaultChannel.channelId;
  }

  async getChannelDefinitions(): Promise<ChannelDefinition[]> {
    const targetDrive = BlogDefinitionProvider.getMasterContentTargetDrive();
    const params: FileQueryParams = {
      targetDrive: targetDrive,
      fileType: [BlogConfig.BlogChannelDefinitionFileType],
    };

    const response = await this._driveProvider.QueryBatch(params);

    const definitions: ChannelDefinition[] = [];
    for (const key in response.searchResults) {
      const dsr = response.searchResults[key];
      definitions.push(
        await this.decryptDefinition(dsr, targetDrive, response.includeMetadataHeader)
      );
    }

    return definitions;
  }

  async getChannelDefinition(id: string): Promise<ChannelDefinition | undefined> {
    const { definition } = (await this.getChannelDefinitionInternal(id)) ?? {
      definition: undefined,
    };
    if (definition == null && id.toString() == defaultChannel.channelId) {
      //fall back if built-in
      return defaultChannel;
    }
    return definition;
  }

  async saveChannelDefinition(definition: ChannelDefinition): Promise<UploadResult> {
    const channelMetadata = '';
    const targetDrive: TargetDrive = {
      alias: definition.channelId,
      type: BlogConfig.ChannelDriveType.toString(),
    };
    await this._driveProvider.EnsureDrive(targetDrive, definition.name, channelMetadata, true);

    const { fileId } = (await this.getChannelDefinitionInternal(definition.channelId)) ?? {
      fileId: undefined,
    };

    const instructionSet: UploadInstructionSet = {
      transferIv: this._transitProvider.Random16(),
      storageOptions: {
        overwriteFileId: fileId,
        drive: BlogDefinitionProvider.getMasterContentTargetDrive(),
      },
      transitOptions: null,
    };

    const metadata: UploadFileMetadata = {
      contentType: 'application/json',
      appData: {
        tags: [definition.channelId],
        contentIsComplete: false,
        fileType: BlogConfig.BlogChannelDefinitionFileType,
        jsonContent: null,
      },
      payloadIsEncrypted: false,
      accessControlList: { requiredSecurityGroup: SecurityGroupType.Anonymous }, //TODO: should this be owner only?
    };

    const payloadJson: string = DataUtil.JsonStringify64(definition);
    const payloadBytes = DataUtil.stringToUint8Array(payloadJson);

    return await this._transitProvider.UploadUsingKeyHeader(
      FixedKeyHeader,
      instructionSet,
      metadata,
      payloadBytes
    );
  }

  async ensureConfiguration() {
    //TODO: should this drive allow anon to read?  this is currently required so we can get channel definitions on the public site
    const targetDrive = BlogDefinitionProvider.getMasterContentTargetDrive();
    await this._driveProvider.EnsureDrive(
      targetDrive,
      'Drive for main blog content and definitions',
      '',
      true
    );

    const x = await this.getChannelDefinitionInternal(defaultChannel.channelId);
    if (x?.fileId == null) {
      await this.saveChannelDefinition(defaultChannel);
    }
  }

  public getPublishChannelDrive(channelId: string): TargetDrive {
    const targetDrive: TargetDrive = {
      alias: channelId,
      type: BlogConfig.ChannelDriveType.toString(),
    };

    return targetDrive;
  }

  // Internals:
  private async getChannelDefinitionInternal(
    id: string
  ): Promise<{ definition: ChannelDefinition; fileId: string } | undefined> {
    const targetDrive: TargetDrive = {
      alias: HomePageConfig.BlogMainContentDriveId.toString(),
      type: BlogConfig.DriveType.toString(),
    };

    const params: FileQueryParams = {
      targetDrive: targetDrive,
      fileType: undefined,
      dataType: undefined,
      userDate: undefined,
      tagsMatchAll: undefined,
      sender: undefined,
      tagsMatchAtLeastOne: [id],
    };

    const ro: GetBatchQueryResultOptions = {
      cursorState: undefined,
      maxRecords: 1,
      includeMetadataHeader: true,
    };

    const response = await this._driveProvider.QueryBatch(params, ro);

    if (response.searchResults.length == 1) {
      const dsr = response.searchResults[0];
      const definition = await this.decryptDefinition(
        dsr,
        targetDrive,
        response.includeMetadataHeader
      );

      return {
        fileId: dsr.fileMetadata.file.fileId,
        definition: definition,
      };
    }

    return;
  }

  private async decryptDefinition(
    dsr: DriveSearchResult,
    targetDrive: TargetDrive,
    includeMetadataHeader: boolean
  ): Promise<ChannelDefinition> {
    if (dsr.fileMetadata.appData.contentIsComplete && includeMetadataHeader) {
      const bytes = await this._driveProvider.DecryptUsingKeyHeader(
        DataUtil.base64ToUint8Array(dsr.fileMetadata.appData.jsonContent),
        FixedKeyHeader
      );
      const json = DataUtil.byteArrayToString(bytes);
      return JSON.parse(json);
    } else {
      return await this._driveProvider.GetPayloadAsJson<any>(
        targetDrive,
        dsr.fileMetadata.file.fileId,
        FixedKeyHeader
      );
    }
  }

  public static getMasterContentTargetDrive(): TargetDrive {
    const drive: TargetDrive = {
      alias: HomePageConfig.BlogMainContentDriveId.toString(),
      type: BlogConfig.DriveType.toString(),
    };

    return drive;
  }
}
