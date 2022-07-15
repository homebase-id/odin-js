import { HomePageConfig } from '../home/HomeTypes';
import {
  DriveSearchResult,
  FileQueryParams,
  KeyHeader,
  TargetDrive,
} from '../../core/DriveData/DriveTypes';
import { ProviderBase, ProviderOptions } from '../../core/ProviderBase';
import { DataUtil } from '../../core/DataUtil';
import { Guid } from 'guid-typescript';
import DriveProvider from '../../core/DriveData/DriveProvider';
import TransitProvider from '../../core/TransitData/TransitProvider';
import AttributeDataProvider from '../../core/AttributeData/AttributeDataProvider';
import {
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../../core/TransitData/TransitTypes';
import {
  AttributeFile,
  LandingPageLink,
  LandingPageLinkFile,
} from '../../core/AttributeData/AttributeDataTypes';

const FixedKeyHeader: KeyHeader = {
  iv: new Uint8Array(Array(16).fill(1)),
  aesKey: new Uint8Array(Array(16).fill(1)),
};

interface HomePageProviderOptions extends ProviderOptions {
  driveProvider: DriveProvider;
  attributeDataProvider: AttributeDataProvider;
  transitProvider: TransitProvider;
}

export default class HomePageProvider extends ProviderBase {
  private _driveProvider: DriveProvider;
  private _attributeDataProvider: AttributeDataProvider;
  private _transitProvider: TransitProvider;

  constructor(options: HomePageProviderOptions) {
    super({
      api: options.api,
      sharedSecret: options.sharedSecret,
    });
    this._driveProvider = options.driveProvider;
    this._attributeDataProvider = options.attributeDataProvider;
    this._transitProvider = options.transitProvider;
  }

  async ensureConfiguration() {
    await this._driveProvider.EnsureDrive(
      HomePageConfig.HomepageTargetDrive,
      'Home page config drive',
      '',
      true
    );
  }

  async getAttribute(attributeId: Guid): Promise<AttributeFile | undefined> {
    return this._attributeDataProvider.getAttribute(HomePageConfig.DefaultDriveId, attributeId);
  }

  async saveAttribute(attribute: AttributeFile): Promise<AttributeFile> {
    attribute.profileId = HomePageConfig.DefaultDriveId.toString();
    attribute.type = HomePageConfig.AttributeTypeNotApplicable.toString();
    attribute.sectionId = HomePageConfig.AttributeSectionNotApplicable.toString();
    return await this._attributeDataProvider.saveAttribute(attribute);
  }

  async getVisibleLinks(): Promise<LandingPageLink[]> {
    const linkFiles = await this.getLinkFiles();
    return linkFiles.map((lf) => lf as LandingPageLink);
  }

  async saveLinkFile(link: LandingPageLinkFile) {
    let existingFileId: string | undefined;
    if (link.fileId && link.fileId.isEmpty() == false) {
      existingFileId = link.fileId.toString();
    } else {
      const existingLink = await this.getLinkFile(Guid.parse(link.id));
      existingFileId = existingLink?.fileId?.toString();
    }

    const instructionSet: UploadInstructionSet = {
      transferIv: this._transitProvider.Random16(),
      storageOptions: {
        overwriteFileId: existingFileId,
        drive: HomePageConfig.HomepageTargetDrive,
      },
      transitOptions: null,
    };

    const metadata: UploadFileMetadata = {
      contentType: 'application/json',
      appData: {
        tags: [link.id.toString()],
        contentIsComplete: false,
        fileType: HomePageConfig.LinkFileType,
        jsonContent: null,
      },
      payloadIsEncrypted: false,
      accessControlList: link.acl,
    };

    const payloadJson: string = DataUtil.JsonStringify64(link as LandingPageLink);
    const payloadBytes = DataUtil.stringToUint8Array(payloadJson);
    const result: UploadResult = await this._transitProvider.UploadUsingKeyHeader(
      FixedKeyHeader,
      instructionSet,
      metadata,
      payloadBytes
    );
  }

  async deleteLinkFile(fileId: Guid) {
    return this._driveProvider.DeleteFile(HomePageConfig.HomepageTargetDrive, fileId);
  }

  //returns the link files on the homepage drive
  async getLinkFiles(): Promise<LandingPageLinkFile[]> {
    const p: FileQueryParams = {
      targetDrive: HomePageConfig.HomepageTargetDrive,
      fileType: [HomePageConfig.LinkFileType],
    };

    const response = await this._driveProvider.QueryBatch(p);

    const links: LandingPageLinkFile[] = [];
    for (const key in response.searchResults) {
      const dsr = response.searchResults[key];

      const link = await this.decryptLinkContent(
        dsr,
        HomePageConfig.HomepageTargetDrive,
        response.includeMetadataHeader
      );
      links.push({
        ...link,
        fileId: Guid.parse(dsr.fileId),
        acl: dsr.accessControlList,
      });
    }

    return links;
  }

  private async getLinkFile(id: Guid): Promise<LandingPageLinkFile | null> {
    const params: FileQueryParams = {
      targetDrive: HomePageConfig.HomepageTargetDrive,
      tagsMatchAtLeastOne: [id.toString()],
    };

    const response = await this._driveProvider.QueryBatch<LandingPageLink>(params);

    if (response.searchResults.length == 0) {
      return null;
    }

    const link = await this.getLinkFileFromDsr(
      response.searchResults[0],
      HomePageConfig.HomepageTargetDrive,
      response.includeMetadataHeader
    );
    return link;
  }

  private async getLinkFileFromDsr(
    dsr: DriveSearchResult<LandingPageLink>,
    targetDrive: TargetDrive,
    includeMetadataHeader: boolean
  ): Promise<LandingPageLinkFile> {
    const link = await this.decryptLinkContent(dsr, targetDrive, includeMetadataHeader);
    return {
      ...link,
      fileId: Guid.parse(dsr.fileId),
      acl: dsr.accessControlList,
    };
  }

  private async decryptLinkContent(
    dsr: DriveSearchResult<any>,
    targetDrive: TargetDrive,
    includeMetadataHeader: boolean
  ): Promise<LandingPageLink> {
    if (dsr.contentIsComplete && includeMetadataHeader) {
      const bytes = await this._driveProvider.DecryptUsingKeyHeader(
        DataUtil.base64ToUint8Array(dsr.jsonContent),
        FixedKeyHeader
      );
      const json = DataUtil.byteArrayToString(bytes);
      return JSON.parse(json);
    } else {
      return await this._driveProvider.GetPayloadAsJson<LandingPageLink>(
        targetDrive,
        Guid.parse(dsr.fileId),
        FixedKeyHeader
      );
    }
  }
}
