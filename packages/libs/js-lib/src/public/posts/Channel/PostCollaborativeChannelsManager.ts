import { DotYouClient } from '../../../core/DotYouClient';
import { FileQueryParams } from '../../../core/DriveData/Drive/DriveTypes';
import { deleteFile } from '../../../core/DriveData/File/DriveFileManager';
import { getContentFromHeaderOrPayload } from '../../../core/DriveData/File/DriveFileProvider';
import {
  AccessControlList,
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
} from '../../../core/DriveData/File/DriveFileTypes';
import { queryBatch } from '../../../core/DriveData/Query/DriveQueryService';
import { uploadFile } from '../../../core/DriveData/Upload/DriveFileUploader';
import {
  UpdateResult,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../../../core/DriveData/Upload/DriveUploadTypes';
import { getRandom16ByteArray, jsonStringify64, toGuidId } from '../../../helpers/DataUtil';
import { BlogConfig, RemoteCollaborativeChannelDefinition } from '../PostTypes';

export const getChannelLinkDefinitions = async (
  dotYouClient: DotYouClient
): Promise<HomebaseFile<RemoteCollaborativeChannelDefinition>[] | null> => {
  const params: FileQueryParams = {
    targetDrive: BlogConfig.FeedDrive,
    fileType: [BlogConfig.RemoteChannelDefinitionFileType],
  };

  const response = await queryBatch(dotYouClient, params);

  if (!response.searchResults.length) {
    return null;
  }

  return (
    await Promise.all(
      response.searchResults.map((dsr) =>
        dsrToChannelLink(dotYouClient, dsr, response.includeMetadataHeader)
      )
    )
  ).filter(Boolean) as HomebaseFile<RemoteCollaborativeChannelDefinition>[];
};

export const saveChannelLink = async (
  dotYouClient: DotYouClient,
  definition: NewHomebaseFile<RemoteCollaborativeChannelDefinition>
): Promise<UpdateResult | UploadResult | undefined> => {
  const channelContent = definition.fileMetadata.appData.content;

  if (!definition.fileMetadata.appData.uniqueId) {
    definition.fileMetadata.appData.uniqueId = toGuidId(
      `${channelContent.odinId}-${channelContent.name}`
    );
  }
  const encrypt = true;

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      drive: BlogConfig.FeedDrive,
    },
  };

  const payloadJson: string = jsonStringify64({
    ...definition.fileMetadata.appData.content,
  });

  const metadata: UploadFileMetadata = {
    allowDistribution: false,
    appData: {
      uniqueId: definition.fileMetadata.appData.uniqueId,
      tags: [definition.fileMetadata.appData.uniqueId],
      fileType: BlogConfig.RemoteChannelDefinitionFileType,
      content: payloadJson,
    },
    isEncrypted: encrypt,
    accessControlList: definition.serverMetadata?.accessControlList,
  };

  const result = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    undefined,
    undefined,
    encrypt
  );
  if (!result) throw new Error(`Upload failed`);

  return result;
};

export const removeChannelLink = async (
  dotYouClient: DotYouClient,
  channelLink: HomebaseFile<RemoteCollaborativeChannelDefinition>
) => {
  return await deleteFile(dotYouClient, BlogConfig.FeedDrive, channelLink.fileId);
};

const dsrToChannelLink = async (
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<RemoteCollaborativeChannelDefinition> | undefined> => {
  const definitionContent =
    await getContentFromHeaderOrPayload<RemoteCollaborativeChannelDefinition>(
      dotYouClient,
      BlogConfig.FeedDrive,
      dsr,
      includeMetadataHeader
    );
  if (!definitionContent) return undefined;

  const file: HomebaseFile<RemoteCollaborativeChannelDefinition> = {
    ...dsr,
    fileMetadata: {
      ...dsr.fileMetadata,
      appData: {
        ...dsr.fileMetadata.appData,
        content: { ...definitionContent, acl: parseAcl(definitionContent.acl) },
      },
    },
    serverMetadata: undefined,
  };

  return file;
};

const parseAcl = (acl: AccessControlList) => {
  if (acl.requiredSecurityGroup.toLowerCase() === 'connected') {
    return {
      ...acl,
      requiredSecurityGroup: SecurityGroupType.Connected,
    };
  }

  return acl;
};
