import { TargetDrive } from '@homebase-id/js-lib/core';
import { getTargetDriveFromCommunityId } from '../../providers/CommunityDefinitionProvider';
import { LOCAL_COMMUNITY_APP_DRIVE } from '../../providers/CommunityMetadataProvider';
import { useParams } from 'react-router-dom';
import { ChatDrive } from '@homebase-id/chat-app/src/providers/ConversationProvider';
import { useLocalCommunityDrives } from '../community/useLocalCommunityDrives';

export const useWebsocketDrives = () => {
  const { data: communityDrives, isFetched } = useLocalCommunityDrives(true);

  const { communityKey } = useParams();

  if (!isFetched) {
    return {
      localCommunityDrives: null,
      remoteCommunityDrives: null,
    };
  }

  const localCommunityDrives = [
    ChatDrive,
    LOCAL_COMMUNITY_APP_DRIVE,
    ...(communityDrives?.map((drive) => drive.targetDriveInfo) || []),
  ].filter(Boolean) as TargetDrive[];

  const remoteCommunityDrives = communityKey ? [getTargetDriveFromCommunityId(communityKey)] : null;

  return {
    localCommunityDrives,
    remoteCommunityDrives,
  };
};
