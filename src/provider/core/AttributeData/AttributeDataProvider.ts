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
import DriveProvider from '../DriveData/DriveProvider';
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
    profileId: Guid,
    sectionId: Guid | undefined,
    pageNumber: number,
    pageSize: number
  ): Promise<Attribute[]> {
    const targetDrive = this.getTargetDrive(profileId);
    const qp: FileQueryParams = {
      targetDrive: targetDrive,
      fileType: [AttributeConfig.AttributeFileType],
      tagsMatchAtLeastOne: sectionId ? [sectionId?.toString()] : [],
    };

    const result = await this._driveProvider.QueryBatch<any>(qp);

    let attributes: Attribute[] = [];

    for (const key in result.searchResults) {
      const dsr: DriveSearchResult<any> = result.searchResults[key];
      const fileId = Guid.parse(dsr.fileId);

      if (dsr.payloadIsEncrypted) {
        throw new Error('Attribute is encrypted:TODO support this');
      }

      let attr: Attribute = {
        id: '',
        type: '',
        sectionId: '',
        priority: -1,
        data: null,
        profileId: profileId.toString(),
      };

      if (dsr.contentIsComplete && result.includeMetadataHeader) {
        const bytes = await this._driveProvider.DecryptUsingKeyHeader(
          DataUtil.base64ToUint8Array(dsr.jsonContent),
          FixedKeyHeader
        );
        const json = DataUtil.byteArrayToString(bytes);
        attr = JSON.parse(json);
      } else {
        attr = await this._driveProvider.GetPayloadAsJson<any>(targetDrive, fileId, FixedKeyHeader);
      }

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
    profileId: Guid,
    sectionId: Guid,
    attributeType: Guid
  ): Promise<OrderedAttributeList | null> {
    const targetDrive = this.getTargetDrive(profileId);
    const qp: FileQueryParams = {
      targetDrive: targetDrive,
      fileType: [AttributeConfig.AttributeFileType],
      tagsMatchAtLeastOne: [attributeType.toString()],
    };

    const result = await this._driveProvider.QueryBatch<any>(qp);
    let versions: Attribute[] = [];

    for (const key in result.searchResults) {
      const dsr: DriveSearchResult<any> = result.searchResults[key];
      const fileId = Guid.parse(dsr.fileId);

      if (dsr.payloadIsEncrypted) {
        throw new Error('Attribute is encrypted:TODO support this');
      }

      let attr: Attribute = {
        id: '',
        type: attributeType.toString(),
        sectionId: '',
        priority: -1,
        data: null,
        profileId: profileId.toString(),
      };

      if (dsr.contentIsComplete && result.includeMetadataHeader) {
        const bytes = await this._driveProvider.DecryptUsingKeyHeader(
          DataUtil.base64ToUint8Array(dsr.jsonContent),
          FixedKeyHeader
        );
        const json = DataUtil.byteArrayToString(bytes);
        attr = JSON.parse(json);
      } else {
        attr = await this._driveProvider.GetPayloadAsJson<any>(targetDrive, fileId, FixedKeyHeader);
      }

      // TODO: this overwrites the priority stored in the
      // attribute.  Need to fix this by considering if the
      // server-set priority is always more important than the
      // order set by the user
      attr.priority = dsr.priority;

      //HACK: filter by section id until we can query by multiple tags on the server
      if (sectionId.equals(Guid.parse(attr.sectionId))) {
        versions.push(attr);
      }
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

  async getAttribute(profileId: Guid, id: Guid | string): Promise<AttributeFile | undefined> {
    id = typeof id === 'string' ? Guid.parse(id) : id;
    // console.log(`Looking for attribute: ${id} in profile ${profileId}`);

    const targetDrive = this.getTargetDrive(profileId);
    const qp: FileQueryParams = {
      targetDrive: targetDrive,
      tagsMatchAll: [id.toString()],
      fileType: [AttributeConfig.AttributeFileType],
    };

    const ro: GetBatchQueryResultOptions = {
      maxRecords: 1,
      includeMetadataHeader: true,
    };

    const response = await this._driveProvider.QueryBatch<any>(qp, ro);

    // console.log('get attribute search results', qp, response);

    if (response.searchResults.length == 0) {
      return;
    }

    if (response.searchResults.length > 1) {
      console.warn(
        'Attribute Id [' +
          id.toString() +
          '] in profile [' +
          profileId.toString() +
          '] has more than one file.  Using latest'
      );
    }

    const dsr: DriveSearchResult<any> = response.searchResults[0];
    if (dsr.payloadIsEncrypted) {
      throw new Error('Attribute is encrypted:TODO support this');
    }

    const fileId = Guid.parse(dsr.fileId);

    let payload: Attribute;

    if (dsr.contentIsComplete && response.includeMetadataHeader) {
      const bytes = await this._driveProvider.DecryptUsingKeyHeader(
        DataUtil.base64ToUint8Array(dsr.jsonContent),
        FixedKeyHeader
      );
      const json = DataUtil.byteArrayToString(bytes);
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
      fileId: Guid.parse(dsr.fileId),
      acl: dsr.accessControlList,
    };

    // console.log('get attribute', attributeFile);
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
      !Guid.isGuid(attribute.profileId) ||
      !Guid.isGuid(attribute.type) ||
      !Guid.isGuid(attribute.sectionId)
    ) {
      throw 'Attribute Id, profileId, sectionId, and type must be valid GUIDs';
    }

    const instructionSet: UploadInstructionSet = {
      transferIv: this._transitProvider.Random16(),
      storageOptions: {
        overwriteFileId: Guid.isGuid(attribute?.fileId ?? '') ? attribute.fileId?.toString() : null,
        drive: this.getTargetDrive(Guid.parse(attribute.profileId)),
      },
      transitOptions: null,
    };

    const metadata: UploadFileMetadata = {
      contentType: 'application/json',
      appData: {
        tags: [attribute.type, attribute.sectionId, attribute.profileId, attribute.id.toString()],
        fileType: AttributeConfig.AttributeFileType,
        contentIsComplete: false,
        jsonContent: null,
      },
      payloadIsEncrypted: false,
      accessControlList: attribute.acl,
    };

    //note: downcasting so I don't store fileId and acl from AttributeFile
    const payloadJson: string = DataUtil.JsonStringify64(attribute as Attribute);
    const payloadBytes = DataUtil.stringToUint8Array(payloadJson);
    const result: UploadResult = await this._transitProvider.UploadUsingKeyHeader(
      FixedKeyHeader,
      instructionSet,
      metadata,
      payloadBytes
    );

    //update server-side info
    attribute.fileId = Guid.parse(result.file.fileId);
    return attribute;
  }

  private getTargetDrive(profileId: Guid) {
    return {
      alias: profileId.toString(),
      type: ProfileConfig.ProfileDriveType.toString(),
    };
  }
}
