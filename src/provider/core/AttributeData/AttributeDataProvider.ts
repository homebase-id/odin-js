import { Attribute, AttributeFile } from './AttributeDataTypes';

import {
  DriveSearchResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  TargetDrive,
} from '../DriveData/DriveTypes';
import { ProviderBase, ProviderOptions } from '../ProviderBase';
import {
  SecurityGroupType,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../DriveData/DriveUploadTypes';
import { DataUtil } from '../DataUtil';
import { AttributeConfig } from './AttributeConfig';
import { ProfileConfig } from '../../profile/ProfileConfig';
import { DriveProvider } from '../DriveData/DriveProvider';

interface AttributeDataproviderOptions extends ProviderOptions {
  driveProvider: DriveProvider;
}

//Provides read write to attribute data
export class AttributeDataProvider extends ProviderBase {
  private _driveProvider: DriveProvider;

  constructor(options: AttributeDataproviderOptions) {
    super(options);

    this._driveProvider = options.driveProvider;
  }

  //Gets all attributes for a given profile.  if sectionId is defined, only attributes matching that section are returned.
  async getProfileAttributes(
    profileId: string,
    sectionId: string | undefined,
    pageSize: number
  ): Promise<AttributeFile[]> {
    const targetDrive = this.getTargetDrive(profileId);
    const qp: FileQueryParams = {
      targetDrive: targetDrive,
      fileType: [AttributeConfig.AttributeFileType],
      groupId: sectionId ? [sectionId] : undefined,
    };

    const result = await this._driveProvider.QueryBatch(qp, {
      maxRecords: pageSize,
      includeMetadataHeader: true, // Set to true to allow jsonContent to be there, and we don't need extra calls to get the header with jsonContent
    });

    let attributes: AttributeFile[] = await Promise.all(
      result.searchResults.map(async (dsr) =>
        this.dsrToAttributeFile(dsr, targetDrive, result.includeMetadataHeader)
      )
    );

    //sort where lowest number is higher priority
    attributes = attributes.sort((a, b) => {
      return a.priority - b.priority;
    });

    return attributes;
  }

  //gets all versions of an attribute available to the caller
  async getAttributeVersions(
    profileId: string,
    sectionId: string | undefined,
    tags: string[]
  ): Promise<AttributeFile[] | undefined> {
    const targetDrive = this.getTargetDrive(profileId);
    const qp: FileQueryParams = {
      targetDrive: targetDrive,
      fileType: [AttributeConfig.AttributeFileType],
      groupId: sectionId ? [sectionId] : undefined,
      tagsMatchAtLeastOne: tags,
    };

    const result = await this._driveProvider.QueryBatch(qp, {
      maxRecords: 10,
      includeMetadataHeader: true,
    });

    let attributes: AttributeFile[] = await Promise.all(
      result.searchResults.map(async (dsr) =>
        this.dsrToAttributeFile(dsr, targetDrive, result.includeMetadataHeader)
      )
    );

    //sort where lowest number is higher priority (!! sort happens in place)
    attributes = attributes.sort((a, b) => {
      return a.priority - b.priority;
    });

    return attributes;
  }

  async getAttribute(profileId: string, id: string): Promise<AttributeFile | undefined> {
    const targetDrive = this.getTargetDrive(profileId);
    const qp: FileQueryParams = {
      targetDrive: targetDrive,
      clientUniqueIdAtLeastOne: [id],
      fileType: [AttributeConfig.AttributeFileType],
    };

    const ro: GetBatchQueryResultOptions = {
      maxRecords: 1,
      includeMetadataHeader: true,
    };

    const result = await this._driveProvider.QueryBatch(qp, ro);

    if (result.searchResults.length == 0) {
      return;
    }

    if (result.searchResults.length > 1) {
      console.warn(
        `Attribute Id [${id}] in profile [${profileId}] has more than one file. Using latest`
      );
    }

    const dsr: DriveSearchResult = result.searchResults[0];
    return this.dsrToAttributeFile(dsr, targetDrive, result.includeMetadataHeader);
  }

  async getAttributes(
    profileId: string,
    tags: string[] | undefined,
    pageSize: number
  ): Promise<AttributeFile[]> {
    const targetDrive = this.getTargetDrive(profileId);
    const qp: FileQueryParams = {
      targetDrive: targetDrive,
      fileType: [AttributeConfig.AttributeFileType],
      tagsMatchAll: tags ?? undefined,
    };

    const result = await this._driveProvider.QueryBatch(qp, {
      maxRecords: pageSize,
      includeMetadataHeader: true,
    });

    let attributes: AttributeFile[] = await Promise.all(
      result.searchResults.map(async (dsr) =>
        this.dsrToAttributeFile(dsr, targetDrive, result.includeMetadataHeader)
      )
    );

    //sort where lowest number is higher priority
    attributes = attributes.sort((a, b) => {
      return a.priority - b.priority;
    });

    return attributes;
  }

  async dsrToAttributeFile(
    dsr: DriveSearchResult,
    targetDrive: TargetDrive,
    includeMetadataHeader: boolean
  ): Promise<AttributeFile> {
    const attrPayload = await this._driveProvider.GetPayload<AttributeFile>(
      targetDrive,
      dsr.fileId,
      dsr.fileMetadata,
      dsr.sharedSecretEncryptedKeyHeader,
      includeMetadataHeader
    );
    return {
      ...attrPayload,
      fileId: attrPayload.fileId ?? dsr.fileId,
      acl: dsr.serverMetadata?.accessControlList,
    };
  }

  async saveAttribute(attribute: AttributeFile): Promise<AttributeFile> {
    // If a new attribute
    if (!attribute.id) {
      attribute.id = DataUtil.getNewId();
    } else if (!attribute.fileId) {
      attribute.fileId =
        (await this.getAttribute(attribute.profileId, attribute.id))?.fileId ?? undefined;
    }

    const encrypt = !(
      attribute.acl.requiredSecurityGroup === SecurityGroupType.Anonymous ||
      attribute.acl.requiredSecurityGroup === SecurityGroupType.Authenticated
    );

    if (!attribute.id || !attribute.profileId || !attribute.type || !attribute.sectionId) {
      throw 'Attribute is missing id, profileId, sectionId, or type';
    }

    const instructionSet: UploadInstructionSet = {
      transferIv: this._driveProvider.Random16(),
      storageOptions: {
        overwriteFileId: attribute?.fileId ?? '',
        drive: this.getTargetDrive(attribute.profileId),
      },
      transitOptions: null,
    };

    const payloadJson: string = DataUtil.JsonStringify64({
      ...attribute,
      acl: undefined,
      fileId: undefined,
    } as Attribute);
    const payloadBytes = DataUtil.stringToUint8Array(payloadJson);

    // Set max of 3kb for jsonContent so enough room is left for metedata
    const shouldEmbedContent = payloadBytes.length < 3000;
    const metadata: UploadFileMetadata = {
      allowDistribution: false,
      contentType: 'application/json',
      appData: {
        uniqueId: attribute.id,
        tags: [attribute.type, attribute.sectionId, attribute.profileId, attribute.id],
        groupId: attribute.sectionId,
        fileType: AttributeConfig.AttributeFileType,
        contentIsComplete: shouldEmbedContent,
        jsonContent: shouldEmbedContent ? payloadJson : null,
      },
      payloadIsEncrypted: encrypt,
      accessControlList: attribute.acl,
    };

    const result: UploadResult = await this._driveProvider.Upload(
      instructionSet,
      metadata,
      payloadBytes,
      undefined,
      encrypt
    );

    //update server-side info
    attribute.fileId = result.file.fileId;
    return attribute;
  }

  async removeAttribute(profileId: string, attributeFileId: string): Promise<void> {
    const targetDrive = this.getTargetDrive(profileId);
    this._driveProvider.DeleteFile(targetDrive, attributeFileId);
  }

  private getTargetDrive(profileId: string) {
    return {
      alias: profileId,
      type: ProfileConfig.ProfileDriveType,
    };
  }
}
