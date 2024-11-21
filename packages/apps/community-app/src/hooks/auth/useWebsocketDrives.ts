import { useDotYouClientContext } from '@homebase-id/common-app';
import { TargetDrive } from '@homebase-id/js-lib/core';
import { getTargetDriveFromCommunityId } from '../../providers/CommunityDefinitionProvider';
import { LOCAL_COMMUNITY_APP_DRIVE } from '../../providers/CommunityMetadataProvider';
import { useCommunities } from '../community/useCommunities';
import { useParams } from 'react-router-dom';
import { ChatDrive } from '@homebase-id/chat-app/src/providers/ConversationProvider';

export const useWebsocketDrives = () => {
  const dotYouClient = useDotYouClientContext();
  const { data: communities, isFetched } = useCommunities().all;
  const { communityKey } = useParams();

  if (!isFetched) {
    return {
      localCommunityDrives: null,
      remoteCommunityDrives: null,
    };
  }

  const localCommunities =
    communities?.filter(
      (community) =>
        !community.fileMetadata.senderOdinId ||
        community.fileMetadata.senderOdinId === dotYouClient.getHostIdentity()
    ) || [];

  const localCommunityDrives = [
    ChatDrive,
    LOCAL_COMMUNITY_APP_DRIVE,
    ...localCommunities.map(
      (community) =>
        community.fileMetadata.appData.uniqueId &&
        getTargetDriveFromCommunityId(community.fileMetadata.appData.uniqueId)
    ),
  ].filter(Boolean) as TargetDrive[];

  const remoteCommunityDrives = communityKey ? [getTargetDriveFromCommunityId(communityKey)] : null;

  return {
    localCommunityDrives,
    remoteCommunityDrives,
  };
};
