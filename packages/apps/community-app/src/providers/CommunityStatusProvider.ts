import {
  DotYouClient,
  getFileHeaderBytesByUniqueId,
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
  uploadFile,
  UploadFileMetadata,
  UploadInstructionSet,
} from '@homebase-id/js-lib/core';
import {
  getFileHeaderBytesOverPeerByUniqueId,
  TransitInstructionSet,
  uploadFileOverPeer,
} from '@homebase-id/js-lib/peer';
import { CommunityDefinition, getTargetDriveFromCommunityId } from './CommunityDefinitionProvider';
import {
  getRandom16ByteArray,
  jsonStringify64,
  toGuidId,
  tryJsonParse,
} from '@homebase-id/js-lib/helpers';

export interface CommunityStatus {
  emoji?: string;
  status?: string;
  validTill?: number;
}

export const COMMUNITY_STATUS_FILE_TYPE = 7030;

export const setStatus = async (
  dotYouClient: DotYouClient,
  community: HomebaseFile<CommunityDefinition>,
  status: CommunityStatus
) => {
  const currentStatus = await internalGetStatus(
    dotYouClient,
    community,
    dotYouClient.getLoggedInIdentity() || ''
  );

  const newStatus: NewHomebaseFile<CommunityStatus> = {
    ...currentStatus,
    fileMetadata: {
      ...currentStatus?.fileMetadata,
      appData: {
        ...currentStatus?.fileMetadata.appData,
        content: status,
      },
    },
    serverMetadata: {
      accessControlList: community.fileMetadata.appData.content.acl || {
        requiredSecurityGroup: SecurityGroupType.AutoConnected,
      },
      ...currentStatus?.serverMetadata,
    },
  };
  return await internalSaveStatusFile(dotYouClient, community, newStatus);
};

const internalSaveStatusFile = async (
  dotYouClient: DotYouClient,
  community: HomebaseFile<CommunityDefinition>,
  status: HomebaseFile<CommunityStatus> | NewHomebaseFile<CommunityStatus>
) => {
  const targetDrive = getTargetDriveFromCommunityId(
    community.fileMetadata.appData.uniqueId as string
  );
  const uniqueId = toGuidId(dotYouClient.getLoggedInIdentity() || '');
  const metedata: UploadFileMetadata = {
    versionTag: status?.fileMetadata.versionTag,
    allowDistribution: true,
    appData: {
      uniqueId: uniqueId,

      fileType: COMMUNITY_STATUS_FILE_TYPE,
      content: jsonStringify64(status.fileMetadata.appData.content),
    },
    isEncrypted: true,
    accessControlList: status.serverMetadata?.accessControlList ||
      community.fileMetadata.appData.content.acl || {
      requiredSecurityGroup: SecurityGroupType.AutoConnected,
    },
  };

  if (dotYouClient.getHostIdentity() !== community.fileMetadata.senderOdinId) {
    const instructions: TransitInstructionSet = {
      remoteTargetDrive: targetDrive,
      overwriteGlobalTransitFileId: status.fileMetadata.globalTransitId,
      transferIv: getRandom16ByteArray(),
      recipients: [community.fileMetadata.senderOdinId],
    };

    return await uploadFileOverPeer(
      dotYouClient,
      instructions,
      metedata,
      undefined,
      undefined,
      true
    );
  } else {
    const instructions: UploadInstructionSet = {
      storageOptions: {
        drive: targetDrive,
      },
    };

    return await uploadFile(dotYouClient, instructions, metedata, undefined, undefined, true);
  }
};

export const internalGetStatus = async (
  dotYouClient: DotYouClient,
  community: HomebaseFile<CommunityDefinition>,
  odinId: string
): Promise<HomebaseFile<CommunityStatus> | null> => {
  const uniqueId = toGuidId(odinId);
  const targetDrive = getTargetDriveFromCommunityId(
    community.fileMetadata.appData.uniqueId as string
  );

  if (dotYouClient.getHostIdentity() !== community.fileMetadata.senderOdinId) {
    const header = await getFileHeaderBytesOverPeerByUniqueId(
      dotYouClient,
      community.fileMetadata.senderOdinId,
      targetDrive,
      uniqueId
    );
    if (!header) return null;
    return {
      ...header,
      fileMetadata: {
        ...header.fileMetadata,
        appData: {
          ...header.fileMetadata.appData,
          content: tryJsonParse<CommunityStatus>(header.fileMetadata.appData.content),
        },
      },
    };
  } else {
    const header = await getFileHeaderBytesByUniqueId(dotYouClient, targetDrive, uniqueId);
    if (!header) return null;

    return {
      ...header,
      fileMetadata: {
        ...header.fileMetadata,
        appData: {
          ...header.fileMetadata.appData,
          content: tryJsonParse<CommunityStatus>(header.fileMetadata.appData.content),
        },
      },
    };
  }
};

export const getStatus = async (
  dotYouClient: DotYouClient,
  community: HomebaseFile<CommunityDefinition>,
  odinId: string
): Promise<CommunityStatus | null> => {
  return (
    (await internalGetStatus(dotYouClient, community, odinId))?.fileMetadata.appData.content || null
  );
};
