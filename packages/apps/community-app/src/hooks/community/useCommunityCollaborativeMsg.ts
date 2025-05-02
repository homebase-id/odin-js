import { HomebaseFile } from '@homebase-id/js-lib/core';
import { BACKEDUP_PAYLOAD_KEY, CommunityMessage } from '../../providers/CommunityMessageProvider';
import { useCommunityMessage } from './messages/useCommunityMessage';
import {
  CommunityDefinition,
  getTargetDriveFromCommunityId,
} from '../../providers/CommunityDefinitionProvider';
import { useContentFromPayload, useOdinClientContext } from '@homebase-id/common-app';

export const useCommunityCollaborativeMsg = ({
  msg,
  community,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community?: HomebaseFile<CommunityDefinition>;
}) => {
  const loggedInOdinId = useOdinClientContext().getLoggedInIdentity();

  const { mutate, ...updateProps } = useCommunityMessage().update;
  const isCollaborative = msg.fileMetadata.appData.content.isCollaborative;
  const isAuthor = msg.fileMetadata.senderOdinId === loggedInOdinId;
  const { data: backedupData } = useContentFromPayload<CommunityMessage>(
    isCollaborative &&
      isAuthor &&
      community &&
      community.fileMetadata.appData.uniqueId &&
      msg.fileId
      ? {
        odinId: community?.fileMetadata.senderOdinId,
        targetDrive: getTargetDriveFromCommunityId(community.fileMetadata.appData.uniqueId),
        fileId: msg.fileId,
        payloadKey: BACKEDUP_PAYLOAD_KEY,
        systemFileType: msg.fileSystemType,
      }
      : undefined
  );

  return {
    isCollaborative,
    toggleCollaborative: {
      mutate: () => {
        if (!msg || !community) return;

        mutate({
          updatedChatMessage: {
            ...msg,
            fileMetadata: {
              ...msg.fileMetadata,
              appData: {
                ...msg.fileMetadata.appData,
                content: {
                  ...msg.fileMetadata.appData.content,
                  isCollaborative: !isCollaborative,
                },
              },
            },
          },
          community,
          storeBackup: !isCollaborative,
        });
      },
      updateProps,
    },
    canBackup: isCollaborative && isAuthor && !!community && !!backedupData,
    restoreAndMakePrivate: {
      mutate: () => {
        if (!msg || !community || !backedupData) return;

        mutate({
          updatedChatMessage: {
            ...msg,
            fileMetadata: {
              ...msg.fileMetadata,
              appData: {
                ...msg.fileMetadata.appData,
                content: {
                  ...backedupData,
                  isCollaborative: false,
                },
              },
            },
          },
          community,
        });
      },
      updateProps,
    },
  };
};
