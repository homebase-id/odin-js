import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityMessage } from '../../providers/CommunityMessageProvider';
import { useCommunityMessage } from './messages/useCommunityMessage';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';

export const useCommunityCollaborativeMsg = ({
  msg,
  community,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community?: HomebaseFile<CommunityDefinition>;
}) => {
  const { mutate, ...updateProps } = useCommunityMessage().update;
  const isCollaborative = msg.fileMetadata.appData.content.isCollaborative;

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
          storeBackup: true,
        });
      },
      updateProps,
    },
  };
};
