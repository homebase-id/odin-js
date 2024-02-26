import { InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import {
  DriveSearchResult,
  NewDriveSearchResult,
  SecurityGroupType,
} from '@youfoundation/js-lib/core';
import { getNewId } from '@youfoundation/js-lib/helpers';
import { NewMediaFile } from '@youfoundation/js-lib/public';
import {
  MailConversation,
  MailConversationsReturn,
  MailThreadReturn,
  uploadMail,
} from '../../providers/MailProvider';

export const useMailConversation = () => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const sendMessage = async ({
    conversation,
    files,
  }: {
    conversation: NewDriveSearchResult<MailConversation>;
    files?: NewMediaFile[];
  }): Promise<NewDriveSearchResult<MailConversation> | null> => {
    const conversationContent = conversation.fileMetadata.appData.content;
    const uniqueId = conversation.fileMetadata.appData.uniqueId || getNewId();
    const threadId = conversationContent.threadId || getNewId();
    const originId = conversationContent.originId || getNewId();

    const newMailConversation: NewDriveSearchResult<MailConversation> = {
      fileMetadata: {
        appData: {
          uniqueId: uniqueId,
          groupId: threadId,
          content: {
            ...conversationContent,
            originId: originId,
            threadId: threadId,
          },
          userDate: new Date().getTime(),
        },
      },
      serverMetadata: {
        accessControlList: {
          requiredSecurityGroup: SecurityGroupType.Connected,
        },
      },
    };

    const uploadResult = await uploadMail(dotYouClient, newMailConversation, files);
    if (!uploadResult) throw new Error('Failed to send the chat message');

    newMailConversation.fileId = uploadResult.file.fileId;
    newMailConversation.fileMetadata.versionTag = uploadResult.newVersionTag;
    newMailConversation.fileMetadata.appData.previewThumbnail = uploadResult.previewThumbnail;

    // const deliveredToInboxes = recipients.map(
    //   (recipient) =>
    //     uploadResult.recipientStatus[recipient].toLowerCase() === TransferStatus.DeliveredToInbox
    // );

    return newMailConversation;
  };

  return {
    send: useMutation({
      mutationFn: sendMessage,
      onMutate: async ({ conversation }) => {
        const existingConversations = queryClient.getQueryData<
          InfiniteData<MailConversationsReturn>
        >(['mail-conversations']);

        if (existingConversations) {
          const newConversations: InfiniteData<MailConversationsReturn> = {
            ...existingConversations,
            pages: [
              ...existingConversations.pages.map((page, index) => {
                return {
                  ...page,
                  results:
                    index === 0
                      ? [
                          conversation as DriveSearchResult<MailConversation>,
                          ...(existingConversations?.pages[0].results || []),
                        ]
                      : page.results,
                };
              }),
            ],
          };

          queryClient.setQueryData(['mail-conversations'], newConversations);
        }

        const threadId = conversation.fileMetadata.appData.content.threadId;
        const existingMailThread = queryClient.getQueryData<InfiniteData<MailThreadReturn>>([
          'mail-thread',
          threadId,
        ]);

        if (existingMailThread && threadId) {
          const newMailThread: InfiniteData<MailThreadReturn> = {
            ...existingMailThread,
            pages: [
              {
                ...existingMailThread.pages[0],
                results: [
                  conversation as DriveSearchResult<MailConversation>,
                  ...(existingMailThread.pages[0].results || []),
                ],
              },
            ],
          };

          queryClient.setQueryData(['mail-thread', threadId], newMailThread);
        }
      },
      onError: () => {
        //
      },
      onSettled: async () => {
        //
      },
    }),
  };
};
