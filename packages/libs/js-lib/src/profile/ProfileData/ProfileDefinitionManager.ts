const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;
import { DotYouClient } from '../../core/DotYouClient';
import { DEFAULT_PAYLOAD_KEY, MAX_HEADER_CONTENT_BYTES } from '../../core/constants';
import {
  getDrivesByType,
  FileQueryParams,
  DEFAULT_QUERY_BATCH_RESULT_OPTION,
  queryBatchCollection,
  getContentFromHeaderOrPayload,
  ensureDrive,
  UploadInstructionSet,
  UploadFileMetadata,
  SecurityGroupType,
  uploadFile,
  deleteFile,
  queryBatch,
  TargetDrive,
} from '../../core/core';
import {
  getNewId,
  getRandom16ByteArray,
  jsonStringify64,
  stringToUint8Array,
} from '../../helpers/helpers';
import { ProfileConfig } from './ProfileConfig';
import { ProfileDefinition, ProfileSection } from './ProfileTypes';

export const getProfileDefinitions = async (
  dotYouClient: DotYouClient
): Promise<ProfileDefinition[]> => {
  const drives = await getDrivesByType(dotYouClient, ProfileConfig.ProfileDriveType, 1, 1000);

  const profileHeaders = drives.results.map((drive) => {
    return {
      id: drive.targetDriveInfo.alias,
      name: drive.name,
    };
  });

  const queries = profileHeaders.map((header) => {
    const profileId = header.id;
    const targetDrive = GetTargetDriveFromProfileId(profileId);

    const params: FileQueryParams = {
      clientUniqueIdAtLeastOne: [profileId],
      targetDrive: targetDrive,
      fileType: [ProfileConfig.ProfileDefinitionFileType],
    };

    return {
      name: profileId,
      queryParams: params,
      resultOptions: DEFAULT_QUERY_BATCH_RESULT_OPTION,
    };
  });

  const response = await queryBatchCollection(dotYouClient, queries);

  const definitions = await Promise.all(
    response.results.map(async (response) => {
      if (response.searchResults.length == 1) {
        const profileDrive = GetTargetDriveFromProfileId(response.name);
        const dsr = response.searchResults[0];

        const definition = await getContentFromHeaderOrPayload<ProfileDefinition>(
          dotYouClient,
          profileDrive,
          dsr,
          response.includeMetadataHeader
        );

        return definition;
      }
    })
  );

  return definitions.filter((def) => def !== undefined) as ProfileDefinition[];
};

export const getProfileDefinition = async (
  dotYouClient: DotYouClient,
  profileId: string
): Promise<ProfileDefinition | undefined> => {
  try {
    const { definition } = (await getProfileDefinitionInternal(dotYouClient, profileId)) ?? {
      definition: undefined,
    };
    return definition;
  } catch (ex) {
    // Profile drive probably doesn't exist
    console.warn(ex);
    return;
  }
};

export const saveProfileDefinition = async (
  dotYouClient: DotYouClient,
  definition: ProfileDefinition
): Promise<void> => {
  if (!definition.profileId) {
    definition.profileId = getNewId();
  }

  const encrypt = true;

  const driveMetadata = 'Drive that stores: ' + definition.name;
  const targetDrive = GetTargetDriveFromProfileId(definition.profileId);
  await ensureDrive(dotYouClient, targetDrive, definition.name, driveMetadata, true);
  const { fileId, versionTag } = (await getProfileDefinitionInternal(
    dotYouClient,
    definition.profileId
  )) ?? {
    fileId: undefined,
    versionTag: undefined,
  };

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: fileId?.toString(),
      drive: targetDrive,
    },
  };

  const payloadJson: string = jsonStringify64(definition);
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for content so enough room is left for metedata
  const shouldEmbedContent = payloadBytes.length < MAX_HEADER_CONTENT_BYTES;

  const metadata: UploadFileMetadata = {
    versionTag: versionTag,
    allowDistribution: false,
    appData: {
      uniqueId: definition.profileId,
      tags: [definition.profileId],
      fileType: ProfileConfig.ProfileDefinitionFileType,
      dataType: undefined,
      content: shouldEmbedContent ? payloadJson : undefined,
    },
    isEncrypted: encrypt,
    accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
  };

  //reshape the definition to group attributes by their type
  await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    shouldEmbedContent
      ? undefined
      : [
          {
            payload: new OdinBlob([payloadBytes], { type: 'application/json' }),
            key: DEFAULT_PAYLOAD_KEY,
          },
        ],
    undefined,
    encrypt
  );
  return;
};

export const saveProfileSection = async (
  dotYouClient: DotYouClient,
  profileId: string,
  profileSection: ProfileSection
) => {
  let isCreate = false;
  const encrypt = true;

  if (!profileSection.sectionId) {
    profileSection.sectionId = getNewId();
    isCreate = true;
  }

  const targetDrive = GetTargetDriveFromProfileId(profileId);
  const { fileId, versionTag } = (!isCreate
    ? await getProfileSectionInternal(dotYouClient, profileId, profileSection.sectionId)
    : { fileId: undefined, versionTag: undefined }) ?? {
    fileId: undefined,
  };

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: fileId ?? undefined,
      drive: targetDrive,
    },
  };

  const payloadJson: string = jsonStringify64(profileSection);
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for content so enough room is left for metedata
  const shouldEmbedContent = payloadBytes.length < MAX_HEADER_CONTENT_BYTES;

  // Note: we tag it with the profile id AND also a tag indicating it is a definition
  const metadata: UploadFileMetadata = {
    versionTag: versionTag,
    allowDistribution: false,
    appData: {
      tags: [profileId, profileSection.sectionId],
      groupId: profileId,
      fileType: ProfileConfig.ProfileSectionFileType,
      dataType: undefined,
      content: shouldEmbedContent ? payloadJson : undefined,
    },
    isEncrypted: encrypt,
    accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
  };

  await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    shouldEmbedContent
      ? undefined
      : [
          {
            payload: new OdinBlob([payloadBytes], { type: 'application/json' }),
            key: DEFAULT_PAYLOAD_KEY,
          },
        ],
    undefined,
    encrypt
  );
};

export const removeProfileSection = async (
  dotYouClient: DotYouClient,
  profileId: string,
  sectionId: string
) => {
  const targetDrive = GetTargetDriveFromProfileId(profileId);

  const profileSection = await getProfileSectionInternal(dotYouClient, profileId, sectionId);
  if (!profileSection) {
    console.error('[odin-js]', "Profile not found, can't delete");
    return false;
  }

  return deleteFile(dotYouClient, targetDrive, profileSection.fileId);
};

export const removeProfileDefinition = async (dotYouClient: DotYouClient, profileId: string) => {
  const targetDrive = GetTargetDriveFromProfileId(profileId);

  const profileDefinition = await getProfileDefinitionInternal(dotYouClient, profileId);
  if (!profileDefinition) {
    console.error('[odin-js]', "Profile not found, can't delete");
    return false;
  }

  // TODO: remove drive
  return deleteFile(dotYouClient, targetDrive, profileDefinition.fileId);
};

export const getProfileSections = async (
  dotYouClient: DotYouClient,
  profileId: string
): Promise<ProfileSection[]> => {
  const targetDrive = GetTargetDriveFromProfileId(profileId);

  const params: FileQueryParams = {
    targetDrive: targetDrive,
    fileType: [ProfileConfig.ProfileSectionFileType],
    groupId: [profileId],
  };

  const response = await queryBatch(dotYouClient, params);
  if (response.searchResults.length >= 1) {
    const sections = (
      await Promise.all(
        response.searchResults.map(
          async (dsr) =>
            await getContentFromHeaderOrPayload<ProfileSection>(
              dotYouClient,
              targetDrive,
              dsr,
              response.includeMetadataHeader
            )
        )
      )
    ).filter((section) => !!section) as ProfileSection[];
    sections.sort((a, b) => {
      return a.priority - b.priority;
    });
    return sections;
  }

  return [];
};

export const GetTargetDriveFromProfileId = (profileId: string): TargetDrive => {
  return {
    alias: profileId,
    type: ProfileConfig.ProfileDriveType,
  };
};

///

const getProfileDefinitionInternal = async (
  dotYouClient: DotYouClient,
  profileId: string
): Promise<{ definition: ProfileDefinition; versionTag: string; fileId: string } | undefined> => {
  const targetDrive = GetTargetDriveFromProfileId(profileId);

  const params: FileQueryParams = {
    clientUniqueIdAtLeastOne: [profileId],
    targetDrive: targetDrive,
    fileType: [ProfileConfig.ProfileDefinitionFileType],
  };

  const response = await queryBatch(dotYouClient, params);

  if (response.searchResults.length >= 1) {
    if (response.searchResults.length !== 1) {
      console.warn(
        `profile [${profileId}] has more than one definition (${response.searchResults.length}). Using latest`
      );
    }
    const dsr = response.searchResults[0];
    const definition = await getContentFromHeaderOrPayload<ProfileDefinition>(
      dotYouClient,
      targetDrive,
      dsr,
      response.includeMetadataHeader
    );

    if (!definition) return undefined;

    return {
      fileId: dsr.fileId,
      versionTag: dsr.fileMetadata.versionTag,
      definition: definition,
    };
  }

  return;
};

const getProfileSectionInternal = async (
  dotYouClient: DotYouClient,
  profileId: string,
  sectionId: string
) => {
  const targetDrive = GetTargetDriveFromProfileId(profileId);

  const params: FileQueryParams = {
    tagsMatchAtLeastOne: [sectionId],
    targetDrive: targetDrive,
    fileType: [ProfileConfig.ProfileSectionFileType],
  };

  const response = await queryBatch(dotYouClient, params);

  if (response.searchResults.length >= 1) {
    if (response.searchResults.length !== 1) {
      console.warn(
        `Section [${sectionId}] has more than one definition (${response.searchResults.length}). Using latest`
      );
    }
    const dsr = response.searchResults[0];
    const definition = await getContentFromHeaderOrPayload<ProfileSection>(
      dotYouClient,
      targetDrive,
      dsr,
      response.includeMetadataHeader
    );

    return {
      fileId: dsr.fileId,
      versionTag: dsr.fileMetadata.versionTag,
      definition: definition,
    };
  }

  return;
};
