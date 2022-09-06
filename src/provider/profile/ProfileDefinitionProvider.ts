import { nanoid } from 'nanoid';
import { DataUtil } from '../core/DataUtil';
import { DriveProvider } from '../core/DriveData/DriveProvider';
import {
  DriveSearchResult,
  FileQueryParams,
  KeyHeader,
  TargetDrive,
} from '../core/DriveData/DriveTypes';
import { ProviderBase, ProviderOptions } from '../core/ProviderBase';
import {
  SecurityGroupType,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../core/DriveData/DriveUploadTypes';
import { BuiltInProfiles, ProfileConfig } from './ProfileConfig';
import { ProfileDefinition, ProfileSection } from './ProfileTypes';

const FixedKeyHeader: KeyHeader = {
  iv: new Uint8Array(Array(16).fill(1)),
  aesKey: new Uint8Array(Array(16).fill(1)),
};

const initialStandardProfile: ProfileDefinition = {
  profileId: BuiltInProfiles.StandardProfileId,
  name: 'Standard Info',
  description: '',
};

const initialPersonalInfoSection = {
  sectionId: BuiltInProfiles.PersonalInfoSectionId,
  name: 'Personal Info',
  priority: 1,
  isSystemSection: true,
};

const initialSocialIdentitySection = {
  sectionId: BuiltInProfiles.SocialIdentitySectionId,
  name: 'Social Identities',
  priority: 2,
  isSystemSection: true,
};

const initialFinancialProfile: ProfileDefinition = {
  profileId: BuiltInProfiles.FinancialProfileId,
  name: 'Financial Info',
  description: '',
};

const initialCreditCardSection = {
  sectionId: BuiltInProfiles.CreditCardsSectionId,
  name: 'Credit Cards',
  priority: 1,
  isSystemSection: true,
};

interface ProfileDefinitionProviderOptions extends ProviderOptions {
  driveProvider: DriveProvider;
}

export default class ProfileDefinitionProvider extends ProviderBase {
  private _driveProvider: DriveProvider;

  constructor(options: ProfileDefinitionProviderOptions) {
    super({
      api: options.api,
      sharedSecret: options.sharedSecret,
    });
    this._driveProvider = options.driveProvider;
  }

  getDefaultProfileId(): string {
    return BuiltInProfiles.StandardProfileId;
  }

  async ensureConfiguration() {
    if (!(await this.getProfileDefinition(initialStandardProfile.profileId))) {
      await this.saveProfileDefinition(initialStandardProfile);

      await this.saveProfileSection(initialStandardProfile.profileId, initialPersonalInfoSection);
      await this.saveProfileSection(initialStandardProfile.profileId, initialSocialIdentitySection);
    }
    if (!(await this.getProfileDefinition(initialFinancialProfile.profileId))) {
      await this.saveProfileDefinition(initialFinancialProfile);

      await this.saveProfileSection(initialFinancialProfile.profileId, initialCreditCardSection);
    }
  }

  async getProfileDefinitions(): Promise<ProfileDefinition[]> {
    const drives = await this._driveProvider.GetDrivesByType(
      ProfileConfig.ProfileDriveType,
      1,
      1000
    );

    const profileHeaders = drives.results.map((drive) => {
      return {
        id: drive.targetDriveInfo.alias,
        name: drive.name,
      };
    });

    const definitions = await Promise.all(
      profileHeaders.map(async (header) => {
        const { definition } = (await this.getProfileDefinitionInternal(header.id)) ?? {
          definition: undefined,
        };

        return definition;
      })
    );

    return definitions.filter((def) => def !== undefined) as ProfileDefinition[];
  }

  async getProfileDefinition(profileId: string): Promise<ProfileDefinition | undefined> {
    try {
      const { definition } = (await this.getProfileDefinitionInternal(profileId)) ?? {
        definition: undefined,
      };
      return definition;
    } catch (ex) {
      // Profile drive probably doesn't exist
      console.log(ex);
      return;
    }
  }

  async saveProfileDefinition(definition: ProfileDefinition): Promise<void> {
    if (!definition.profileId) {
      definition.profileId = DataUtil.toByteArrayId(nanoid());
    }

    const driveMetadata = ''; //TODO: is this needed here?
    const targetDrive = ProfileDefinitionProvider.getTargetDrive(definition.profileId);
    await this._driveProvider.EnsureDrive(targetDrive, definition.name, driveMetadata, true);
    const { fileId } = (await this.getProfileDefinitionInternal(definition.profileId)) ?? {
      fileId: undefined,
    };

    const instructionSet: UploadInstructionSet = {
      transferIv: this._driveProvider.Random16(),
      storageOptions: {
        overwriteFileId: fileId?.toString(),
        drive: targetDrive,
      },
      transitOptions: null,
    };

    const payloadJson: string = DataUtil.JsonStringify64(definition);
    const payloadBytes = DataUtil.stringToUint8Array(payloadJson);

    // Set max of 3kb for jsonContent so enough room is left for metedata
    const shouldEmbedContent = payloadBytes.length < 3000;

    //note: we tag it with the profile id AND also a tag indicating it is a definition
    const metadata: UploadFileMetadata = {
      contentType: 'application/json',
      appData: {
        tags: [definition.profileId],
        fileType: ProfileConfig.ProfileDefinitionFileType, //TODO: determine if we need to define these for defintion files?
        dataType: undefined, //TODO: determine if we need to define these for defintion files?
        contentIsComplete: shouldEmbedContent,
        jsonContent: shouldEmbedContent ? DataUtil.uint8ArrayToBase64(payloadBytes) : null,
      },
      payloadIsEncrypted: false,
      accessControlList: { requiredSecurityGroup: SecurityGroupType.Anonymous }, //TODO: should this be owner only?
    };

    //reshape the definition to group attributes by their type
    const result: UploadResult = await this._driveProvider.UploadUsingKeyHeader(
      FixedKeyHeader,
      instructionSet,
      metadata,
      payloadBytes
    );
  }

  async saveProfileSection(profileId: string, profileSection: ProfileSection) {
    let isCreate = false;

    if (!profileSection.sectionId) {
      profileSection.sectionId = DataUtil.toByteArrayId(nanoid());
      isCreate = true;
    }

    const targetDrive = ProfileDefinitionProvider.getTargetDrive(profileId);
    const { fileId } = (!isCreate
      ? await this.getProfileSectionInternal(profileId, profileSection.sectionId)
      : { fileId: undefined }) ?? {
      fileId: undefined,
    };

    const instructionSet: UploadInstructionSet = {
      transferIv: this._driveProvider.Random16(),
      storageOptions: {
        overwriteFileId: fileId ?? undefined,
        drive: targetDrive,
      },
      transitOptions: null,
    };

    const payloadJson: string = DataUtil.JsonStringify64(profileSection);
    const payloadBytes = DataUtil.stringToUint8Array(payloadJson);

    // Set max of 3kb for jsonContent so enough room is left for metedata
    const shouldEmbedContent = payloadBytes.length < 3000;

    // Note: we tag it with the profile id AND also a tag indicating it is a definition
    const metadata: UploadFileMetadata = {
      contentType: 'application/json',
      appData: {
        tags: [profileId, profileSection.sectionId],
        threadId: profileId,
        fileType: ProfileConfig.ProfileSectionFileType, //TODO: determine if we need to define these for defintion files?
        dataType: undefined, //TODO: determine if we need to define these for defintion files?
        contentIsComplete: shouldEmbedContent,
        jsonContent: shouldEmbedContent ? DataUtil.uint8ArrayToBase64(payloadBytes) : null,
      },
      payloadIsEncrypted: false,
      accessControlList: { requiredSecurityGroup: SecurityGroupType.Anonymous }, //TODO: should this be owner only?
    };

    //reshape the definition to group attributes by their type
    await this._driveProvider.UploadUsingKeyHeader(
      FixedKeyHeader,
      instructionSet,
      metadata,
      payloadBytes
    );
  }

  async getProfileSections(profileId: string): Promise<ProfileSection[]> {
    const targetDrive = ProfileDefinitionProvider.getTargetDrive(profileId);

    const params: FileQueryParams = {
      targetDrive: targetDrive,
      fileType: [ProfileConfig.ProfileSectionFileType],
      groupId: [profileId],
    };

    const response = await this._driveProvider.QueryBatch(params);

    // TODO Check Which one to take if multiple? Or only a first dev issue?
    if (response.searchResults.length >= 1) {
      const sections = await Promise.all(
        response.searchResults.map(
          async (result) =>
            await this.decryptSection(result, targetDrive, response.includeMetadataHeader)
        )
      );
      sections.sort((a, b) => {
        return a.priority - b.priority;
      });
      return sections;
    }

    return [];
  }

  ///

  private async getProfileDefinitionInternal(
    profileId: string
  ): Promise<{ definition: ProfileDefinition; fileId: string } | undefined> {
    const targetDrive = ProfileDefinitionProvider.getTargetDrive(profileId);

    const params: FileQueryParams = {
      tagsMatchAtLeastOne: [profileId.toString()],
      targetDrive: targetDrive,
      fileType: [ProfileConfig.ProfileDefinitionFileType],
    };

    const response = await this._driveProvider.QueryBatch(params);

    // TODO Check Which one to take if multiple? Or only a first dev issue?
    if (response.searchResults.length >= 1) {
      if (response.searchResults.length !== 1) {
        console.warn(
          `profile [${profileId.toString()}] has more than one definition (${
            response.searchResults.length
          }). Using latest`
        );
      }
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
  ): Promise<ProfileDefinition> {
    if (dsr.fileMetadata.appData.contentIsComplete && includeMetadataHeader) {
      const json = DataUtil.byteArrayToString(
        DataUtil.base64ToUint8Array(dsr.fileMetadata.appData.jsonContent)
      );
      return JSON.parse(json);
    } else {
      return await this._driveProvider.GetPayloadAsJson<any>(
        targetDrive,
        dsr.fileMetadata.file.fileId,
        FixedKeyHeader
      );
    }
  }

  private async getProfileSectionInternal(profileId: string, sectionId: string) {
    const targetDrive = ProfileDefinitionProvider.getTargetDrive(profileId);

    const params: FileQueryParams = {
      tagsMatchAtLeastOne: [sectionId],
      targetDrive: targetDrive,
      fileType: [ProfileConfig.ProfileSectionFileType],
    };

    const response = await this._driveProvider.QueryBatch(params);

    // TODO Check Which one to take if multiple? Or only a first dev issue?
    if (response.searchResults.length >= 1) {
      if (response.searchResults.length !== 1) {
        console.warn(
          `Section [${sectionId}] has more than one definition (${response.searchResults.length}). Using latest`
        );
      }
      const dsr = response.searchResults[0];
      const definition = await this.decryptSection(
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

  private async decryptSection(
    dsr: DriveSearchResult,
    targetDrive: TargetDrive,
    includeMetadataHeader: boolean
  ): Promise<ProfileSection> {
    if (dsr.fileMetadata.appData.contentIsComplete && includeMetadataHeader) {
      const json = DataUtil.byteArrayToString(
        DataUtil.base64ToUint8Array(dsr.fileMetadata.appData.jsonContent)
      );
      return JSON.parse(json);
    } else {
      return await this._driveProvider.GetPayloadAsJson<any>(
        targetDrive,
        dsr.fileMetadata.file.fileId,
        FixedKeyHeader
      );
    }
  }

  public static getTargetDrive(profileId: string): TargetDrive {
    return {
      alias: profileId,
      type: ProfileConfig.ProfileDriveType,
    };
  }
}

export const getTargetDriveFromProfileId = ProfileDefinitionProvider.getTargetDrive;
