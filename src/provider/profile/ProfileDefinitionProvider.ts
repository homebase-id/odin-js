import { Guid } from 'guid-typescript';
import { AttributeDefinitions } from '../core/AttributeData/AttributeDefinitions';
import { DataUtil } from '../core/DataUtil';
import DriveProvider from '../core/DriveData/DriveProvider';
import {
  DriveSearchResult,
  FileQueryParams,
  KeyHeader,
  TargetDrive,
} from '../core/DriveData/DriveTypes';
import { ProviderBase, ProviderOptions } from '../core/ProviderBase';
import TransitProvider from '../core/TransitData/TransitProvider';
import {
  SecurityGroupType,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../core/TransitData/TransitTypes';
import { BuiltInProfileAttributes, BuiltInProfiles, ProfileConfig } from './ProfileConfig';
import { ProfileDefinition } from './ProfileTypes';

const FixedKeyHeader: KeyHeader = {
  iv: new Uint8Array(Array(16).fill(1)),
  aesKey: new Uint8Array(Array(16).fill(1)),
};

const initialStandardProfile: ProfileDefinition = {
  profileId: BuiltInProfiles.StandardProfileId.toString(),
  name: 'Standard Info',
  description: '',
  sections: [
    {
      sectionId: BuiltInProfiles.PersonalInfoSectionId.toString(),
      name: 'Personal Info',
      attributes: [
        { attributeId: Guid.create().toString(), type: AttributeDefinitions.Name.type.toString() },
        { attributeId: Guid.create().toString(), type: AttributeDefinitions.Photo.type.toString() },
      ],
      priority: 1,
      isSystemSection: true,
    },
    {
      sectionId: BuiltInProfiles.SocialIdentitySectionId.toString(),
      name: 'Social Identities',
      attributes: [
        {
          attributeId: Guid.create().toString(),
          type: AttributeDefinitions.TwitterUsername.type.toString(),
        },
        {
          attributeId: Guid.create().toString(),
          type: AttributeDefinitions.FacebookUsername.type.toString(),
        },
        {
          attributeId: Guid.create().toString(),
          type: AttributeDefinitions.InstagramUsername.type.toString(),
        },
        {
          attributeId: Guid.create().toString(),
          type: AttributeDefinitions.TiktokUsername.type.toString(),
        },
        {
          attributeId: Guid.create().toString(),
          type: AttributeDefinitions.LinkedInUsername.type.toString(),
        },
      ],
      priority: 2,
      isSystemSection: true,
    },
  ],
};

const initialFinancialProfile: ProfileDefinition = {
  profileId: BuiltInProfiles.FinancialProfileId.toString(),
  name: 'Financial Info',
  description: '',
  sections: [
    {
      sectionId: BuiltInProfiles.CreditCardsSectionId.toString(),
      name: 'Credit Cards',
      attributes: [
        {
          attributeId: BuiltInProfileAttributes.CreditCards.toString(),
          type: AttributeDefinitions.CreditCard.type.toString(),
        },
      ],
      priority: 1,
      isSystemSection: true,
    },
  ],
};

interface ProfileDefinitionProviderOptions extends ProviderOptions {
  driveProvider: DriveProvider;
  transitProvider: TransitProvider;
}

export default class ProfileDefinitionProvider extends ProviderBase {
  private _driveProvider: DriveProvider;
  private _transitProvider: TransitProvider;

  constructor(options: ProfileDefinitionProviderOptions) {
    super({
      api: options.api,
      sharedSecret: options.sharedSecret,
    });
    this._driveProvider = options.driveProvider;
    this._transitProvider = options.transitProvider;
  }

  getDefaultProfileId(): Guid {
    return BuiltInProfiles.StandardProfileId;
  }

  async ensureConfiguration() {
    const save = async (definition: ProfileDefinition) => {
      const response = await this.getProfileDefinitionInternal(Guid.parse(definition.profileId));
      if (response?.definition == null) {
        await this.saveProfileDefinition(definition);
      }
    };

    await save(initialStandardProfile);
    await save(initialFinancialProfile);
  }

  async getProfileDefinitions(): Promise<ProfileDefinition[]> {
    const drives = await this._driveProvider.GetDrivesByType(
      ProfileConfig.ProfileDriveType,
      1,
      1000
    );
    const profileHeaders = drives.results.map((drive) => {
      return {
        id: drive.alias,
        name: drive.name,
      };
    });

    const definitions: ProfileDefinition[] = [];

    for (const key in profileHeaders) {
      const header = profileHeaders[key];

      //hit the drive for the profile definition file
      const { definition } = (await this.getProfileDefinitionInternal(Guid.parse(header.id))) ?? {
        definition: undefined,
      };

      //TODO: handle potential data issue
      if (definition) {
        definitions.push(definition);
      }
    }

    // debugger;
    return definitions;
  }

  async getProfileDefinition(profileId: Guid): Promise<ProfileDefinition | undefined> {
    const { definition } = (await this.getProfileDefinitionInternal(profileId)) ?? {
      definition: undefined,
    };
    return definition;
  }

  async saveProfileDefinition(definition: ProfileDefinition): Promise<void> {
    const driveMetadata = ''; //TODO: is this needed here?
    const targetDrive = ProfileDefinitionProvider.getTargetDrive(Guid.parse(definition.profileId));
    await this._driveProvider.EnsureDrive(targetDrive, definition.name, driveMetadata, true);

    const { fileId } = (await this.getProfileDefinitionInternal(
      Guid.parse(definition.profileId)
    )) ?? {
      fileId: undefined,
    };

    const instructionSet: UploadInstructionSet = {
      transferIv: this._transitProvider.Random16(),
      storageOptions: {
        overwriteFileId: fileId?.toString(),
        drive: targetDrive,
      },
      transitOptions: null,
    };

    //note: we tag it with the profile id AND also a tag indicating it is a definition
    const metadata: UploadFileMetadata = {
      contentType: 'application/json',
      appData: {
        tags: [definition.profileId.toString()],
        fileType: ProfileConfig.ProfileDefinitionFileType, //TODO: determine if we need to define these for defintion files?
        dataType: undefined, //TODO: determine if we need to define these for defintion files?
        contentIsComplete: false,
        jsonContent: null,
      },
      payloadIsEncrypted: false,
      accessControlList: { requiredSecurityGroup: SecurityGroupType.Anonymous }, //TODO: should this be owner only?
    };

    //reshape the definition to group attributes by their type
    const payloadJson: string = DataUtil.JsonStringify64(definition);
    const payloadBytes = DataUtil.stringToUint8Array(payloadJson);
    const result: UploadResult = await this._transitProvider.UploadUsingKeyHeader(
      FixedKeyHeader,
      instructionSet,
      metadata,
      payloadBytes
    );
  }

  ///

  private async getProfileDefinitionInternal(
    profileId: Guid
  ): Promise<{ definition: ProfileDefinition; fileId: Guid } | undefined> {
    const targetDrive = ProfileDefinitionProvider.getTargetDrive(profileId);

    const params: FileQueryParams = {
      tagsMatchAtLeastOne: [profileId.toString()],
      targetDrive: targetDrive,
      fileType: [ProfileConfig.ProfileDefinitionFileType],
    };

    const response = await this._driveProvider.QueryBatch<any>(params);

    // TODO Check Which one to take if multiple? Or only a first dev issue?
    if (response.searchResults.length >= 1) {
      if (response.searchResults.length !== 1) {
        console.warn(
          `profile [${profileId.toString()}] has more than one definition (${
            response.searchResults.length
          }). Using latest`
        );
        // console.warn(response.searchResults);

        /// Debug Code:
        // response.searchResults.map(async (profileDef) => {
        //   console.log(profileDef.fileId);
        //   const definition = await this.decryptDefinition(
        //     profileDef,
        //     targetDrive,
        //     response.includeMetadataHeader
        //   );
        //   console.log(definition);
        // });
      }
      const dsr = response.searchResults[0];
      const definition = await this.decryptDefinition(
        dsr,
        targetDrive,
        response.includeMetadataHeader
      );

      //sort the sections where lowest number is higher priority
      definition.sections = definition?.sections?.sort((a, b) => {
        return a.priority - b.priority;
      });

      return {
        fileId: Guid.parse(dsr.fileId),
        definition: definition,
      };
    }

    return;
  }

  private async decryptDefinition(
    dsr: DriveSearchResult<any>,
    targetDrive: TargetDrive,
    includeMetadataHeader: boolean
  ): Promise<ProfileDefinition> {
    if (dsr.contentIsComplete && includeMetadataHeader) {
      const bytes = await this._driveProvider.DecryptUsingKeyHeader(
        DataUtil.base64ToUint8Array(dsr.jsonContent),
        FixedKeyHeader
      );
      const json = DataUtil.byteArrayToString(bytes);
      return JSON.parse(json);
    } else {
      return await this._driveProvider.GetPayloadAsJson<any>(
        targetDrive,
        Guid.parse(dsr.fileId),
        FixedKeyHeader
      );
    }
  }

  public static getTargetDrive(profileId: Guid | string): TargetDrive {
    return {
      alias: typeof profileId === 'string' ? profileId : profileId.toString(),
      type: ProfileConfig.ProfileDriveType.toString(),
    };
  }
}

export const getTargetDriveFromProfileId = ProfileDefinitionProvider.getTargetDrive;
