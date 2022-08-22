import { Guid } from 'guid-typescript';

import { Attribute, OrderedAttributeList, AttributeFile } from './AttributeDataTypes';

import {
  DriveSearchResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  KeyHeader,
} from '../DriveData/DriveTypes';
import { ProviderBase, ProviderOptions } from '../ProviderBase';
import {
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../TransitData/TransitTypes';
import { DataUtil } from '../DataUtil';
import { AttributeConfig } from './AttributeConfig';
import { ProfileConfig } from '../../profile/ProfileConfig';
import { DriveProvider } from '../DriveData/DriveProvider';
import TransitProvider from '../TransitData/TransitProvider';

const FixedKeyHeader: KeyHeader = {
  iv: new Uint8Array(Array(16).fill(1)),
  aesKey: new Uint8Array(Array(16).fill(1)),
};

interface AttributeDataproviderOptions extends ProviderOptions {
  driveProvider: DriveProvider;
  transitProvider: TransitProvider;
}

//Provides read write to attribute data
export default class AttributeDataProvider extends ProviderBase {
  private _driveProvider: DriveProvider;
  private _transitProvider: TransitProvider;

  constructor(options: AttributeDataproviderOptions) {
    super(options);

    this._driveProvider = options.driveProvider;
    this._transitProvider = options.transitProvider;
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
      tagsMatchAtLeastOne: sectionId ? [sectionId?.toString()] : [],
    };

    const result = await this._driveProvider.QueryBatch(qp, { maxRecords: pageSize });

    let attributes: AttributeFile[] = [];

    for (const key in result.searchResults) {
      const dsr: DriveSearchResult = result.searchResults[key];
      const fileId = dsr.fileMetadata.file.fileId;

      if (dsr.fileMetadata.payloadIsEncrypted) {
        throw new Error('Attribute is encrypted:TODO support this');
      }

      let attr: AttributeFile = {
        id: '',
        type: '',
        sectionId: '',
        priority: -1,
        data: null,
        profileId: profileId,
        acl: dsr.serverMetadata.accessControlList,
      };

      if (dsr.fileMetadata.appData.contentIsComplete && result.includeMetadataHeader) {
        const json = DataUtil.byteArrayToString(
          DataUtil.base64ToUint8Array(dsr.fileMetadata.appData.jsonContent)
        );
        attr = JSON.parse(json);
      } else {
        attr = await this._driveProvider.GetPayloadAsJson<any>(targetDrive, fileId, FixedKeyHeader);
      }
      attr.fileId = attr.fileId ?? fileId;

      // TODO: this overwrites the priority stored in the
      // attribute.  Need to fix this by considering if the
      // server-set priority is always more important than thex
      // order set by the user
      attr.priority = dsr.priority;
      attributes.push(attr);
    }

    //sort where lowest number is higher priority
    attributes = attributes.sort((a, b) => {
      return a.priority - b.priority;
    });

    return attributes;
  }

  //gets all versions of an attribute available to the caller
  async getAttributeVersions(
    profileId: string,
    sectionId: string,
    attributeType: string
  ): Promise<OrderedAttributeList | null> {
    const targetDrive = this.getTargetDrive(profileId);
    const qp: FileQueryParams = {
      targetDrive: targetDrive,
      fileType: [AttributeConfig.AttributeFileType],
      tagsMatchAll: [attributeType, sectionId],
    };

    const result = await this._driveProvider.QueryBatch(qp);
    let versions: Attribute[] = [];

    for (const key in result.searchResults) {
      const dsr: DriveSearchResult = result.searchResults[key];
      const fileId = dsr.fileMetadata.file.fileId;

      if (dsr.fileMetadata.payloadIsEncrypted) {
        throw new Error('Attribute is encrypted:TODO support this');
      }

      let attr: Attribute = {
        id: '',
        type: attributeType,
        sectionId: sectionId,
        priority: -1,
        data: null,
        profileId: profileId,
      };

      if (dsr.fileMetadata.appData.contentIsComplete && result.includeMetadataHeader) {
        const json = DataUtil.byteArrayToString(
          DataUtil.base64ToUint8Array(dsr.fileMetadata.appData.jsonContent)
        );
        attr = JSON.parse(json);
      } else {
        attr = await this._driveProvider.GetPayloadAsJson<any>(targetDrive, fileId, FixedKeyHeader);
      }

      // TODO: this overwrites the priority stored in the
      // attribute.  Need to fix this by considering if the
      // server-set priority is always more important than the
      // order set by the user
      attr.priority = dsr.priority;

      versions.push(attr);
    }

    //sort where lowest number is higher priority
    versions = versions.sort((a, b) => {
      return a.priority - b.priority;
    });

    const list: OrderedAttributeList = {
      profileId: profileId,
      attributeType: attributeType,
      versions: versions,
    };

    return list ?? null;
  }

  async getAttribute(profileId: string, id: string): Promise<AttributeFile | undefined> {
    const targetDrive = this.getTargetDrive(profileId);
    const qp: FileQueryParams = {
      targetDrive: targetDrive,
      tagsMatchAll: [id],
      fileType: [AttributeConfig.AttributeFileType],
    };

    const ro: GetBatchQueryResultOptions = {
      maxRecords: 1,
      includeMetadataHeader: true,
    };

    const response = await this._driveProvider.QueryBatch(qp, ro);

    if (response.searchResults.length == 0) {
      return;
    }

    if (response.searchResults.length > 1) {
      console.warn(
        'Attribute Id [' +
          id +
          '] in profile [' +
          profileId +
          '] has more than one file.  Using latest'
      );
    }

    const dsr: DriveSearchResult = response.searchResults[0];
    if (dsr.fileMetadata.payloadIsEncrypted) {
      throw new Error('Attribute is encrypted:TODO support this');
    }

    const fileId = dsr.fileMetadata.file.fileId;

    let payload: Attribute;

    if (dsr.fileMetadata.appData.contentIsComplete && response.includeMetadataHeader) {
      const json = DataUtil.byteArrayToString(
        DataUtil.base64ToUint8Array(dsr.fileMetadata.appData.jsonContent)
      );
      payload = JSON.parse(json);
    } else {
      payload = await this._driveProvider.GetPayloadAsJson<any>(
        targetDrive,
        fileId,
        FixedKeyHeader
      );
    }

    const attributeFile: AttributeFile = {
      ...payload,
      fileId: dsr.fileMetadata.file.fileId,
      acl: dsr.serverMetadata.accessControlList,
    };

    return attributeFile;
  }

  async saveAttribute(attribute: AttributeFile): Promise<AttributeFile> {
    //if a new attribute
    if (!attribute.id) {
      attribute.id = Guid.create().toString();
    }

    if (!attribute.id || !attribute.profileId || !attribute.type || !attribute.sectionId) {
      throw 'Attribute is missing id, profileId, sectionId, or type';
    }

    if (
      !Guid.isGuid(attribute.id) ||
      !Guid.isGuid(attribute.type) ||
      !Guid.isGuid(attribute.sectionId)
    ) {
      throw 'Attribute Id, profileId, sectionId, and type must be valid GUIDs';
    }

    const instructionSet: UploadInstructionSet = {
      transferIv: this._transitProvider.Random16(),
      storageOptions: {
        overwriteFileId: attribute?.fileId ?? '',
        drive: this.getTargetDrive(attribute.profileId),
      },
      transitOptions: null,
    };

    const payloadJson: string = DataUtil.JsonStringify64(attribute as Attribute);
    const payloadBytes = DataUtil.stringToUint8Array(payloadJson);

    // Set max of 3kb for jsonContent so enough room is left for metedata
    const shouldEmbedContent = payloadBytes.length < 3000;

    const metadata: UploadFileMetadata = {
      contentType: 'application/json',
      appData: {
        tags: [attribute.type, attribute.sectionId, attribute.profileId, attribute.id],
        fileType: AttributeConfig.AttributeFileType,
        contentIsComplete: shouldEmbedContent,
        jsonContent: shouldEmbedContent ? DataUtil.uint8ArrayToBase64(payloadBytes) : null,
      },
      payloadIsEncrypted: false,
      accessControlList: attribute.acl,
    };

    //note: downcasting so I don't store fileId and acl from AttributeFile

    const result: UploadResult = await this._transitProvider.UploadUsingKeyHeader(
      FixedKeyHeader,
      instructionSet,
      metadata,
      payloadBytes
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
      type: ProfileConfig.ProfileDriveType
    };
  }
}
