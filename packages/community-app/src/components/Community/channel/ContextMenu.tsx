import { HomebaseFile } from '@youfoundation/js-lib/core';
import {
  CommunityDeliveryStatus,
  CommunityMessage,
} from '../../../providers/CommunityMessageProvider';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import {
  useDotYouClient,
  ActionGroupOptionProps,
  t,
  ErrorNotification,
  ActionGroup,
  ChevronDown,
} from '@youfoundation/common-app';
import { useState } from 'react';
import { useCommunityMessage } from '../../../hooks/community/messages/useCommunityMessage';
import { CommunityMessageInfo } from '../Message/detail/CommunityMessageInfo';
import { EditCommunityMessage } from '../Message/detail/EditCommunityMessage';

export interface CommunityActions {
  doReply?: (msg: HomebaseFile<CommunityMessage>) => void;
  doDelete: (msg: HomebaseFile<CommunityMessage>, deleteForEveryone: boolean) => void;
}

export const ContextMenu = ({
  msg,
  community,
  communityActions,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community?: HomebaseFile<CommunityDefinition>;
  communityActions?: CommunityActions;
}) => {
  if (!communityActions) return null;
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [editMessage, setEditMessage] = useState(false);

  const { mutate: resend, error: resendError } = useCommunityMessage().update;

  const identity = useDotYouClient().getIdentity();
  const authorOdinId = msg.fileMetadata.senderOdinId;

  const messageFromMe = !authorOdinId || authorOdinId === identity;

  const optionalOptions: ActionGroupOptionProps[] = [];
  if (messageFromMe) {
    optionalOptions.push({
      label: t('Edit'),
      onClick: () => setEditMessage(true),
    });
    optionalOptions.push({
      label: t('Delete'),
      confirmOptions: {
        title: t('Delete message'),
        body: t('Are you sure you want to delete this message?'),
        buttonText: t('Delete'),
      },
      onClick: () => communityActions.doDelete(msg, true),
    });
  }

  if (community)
    optionalOptions.push({
      label: t('Message info'),
      onClick: () => setShowMessageInfo(true),
    });

  if (
    community &&
    msg.fileMetadata.appData.content.deliveryStatus === CommunityDeliveryStatus.Failed
  ) {
    optionalOptions.push({
      label: t('Retry sending'),
      onClick: () => resend({ updatedChatMessage: msg, community: community }),
    });
  }

  if (communityActions.doReply) {
    optionalOptions.push({
      label: t('Reply in thread'),
      onClick: () => communityActions.doReply && communityActions.doReply(msg),
    });
  }

  return (
    <>
      <ErrorNotification error={resendError} />
      {showMessageInfo && community ? (
        <CommunityMessageInfo
          msg={msg}
          community={community}
          onClose={() => setShowMessageInfo(false)}
        />
      ) : null}
      {editMessage && community ? (
        <EditCommunityMessage
          msg={msg}
          community={community}
          onClose={() => setEditMessage(false)}
        />
      ) : null}
      <ActionGroup
        options={[
          {
            label: t('Copy link'),
            onClick: () => {
              navigator.clipboard.writeText(
                `${window.location.href}/${msg.fileMetadata.appData.uniqueId}`
              );
            },
          },
          ...optionalOptions,
        ]}
        className="absolute right-1 top-[0.125rem] z-10 rounded-full bg-transparent group-hover:pointer-events-auto group-hover:bg-background/60"
        type={'mute'}
        size="square"
      >
        <span className="opacity-0 group-hover:opacity-100">
          <ChevronDown className="h-3 w-3" />
          <span className="sr-only ml-1">{t('More')}</span>
        </span>
      </ActionGroup>
    </>
  );
};
