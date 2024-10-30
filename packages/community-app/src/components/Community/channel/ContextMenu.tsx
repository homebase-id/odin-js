import { HomebaseFile } from '@homebase-id/js-lib/core';
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
} from '@homebase-id/common-app';
import { useState } from 'react';
import { useCommunityMessage } from '../../../hooks/community/messages/useCommunityMessage';
import { CommunityMessageInfo } from '../Message/detail/CommunityMessageInfo';
import { EditCommunityMessage } from '../Message/detail/EditCommunityMessage';
import { CommunityReactionComposer } from '../Message/reactions/CommunityReactionComposer';
import { ReplyArrow } from '@homebase-id/common-app/icons';

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
  return (
    <div className="invisible absolute right-5 top-[-2rem] z-10 flex flex-row items-center rounded-lg bg-background px-1 py-2 text-foreground shadow-md group-hover:pointer-events-auto group-hover:visible">
      <CommunityReactionComposer msg={msg} community={community} />
      <CommunityContextActions
        msg={msg}
        community={community}
        communityActions={communityActions}
      />
    </div>
  );
};

const CommunityContextActions = ({
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
      {communityActions.doReply ? (
        <button
          className="rounded-full p-2 text-slate-400 hover:bg-slate-300 hover:dark:bg-slate-700"
          onClick={() => communityActions.doReply && communityActions.doReply(msg)}
        >
          <ReplyArrow className="h-5 w-5" />
        </button>
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
        type={'mute'}
        size="square"
        alwaysInPortal={true}
      />
    </>
  );
};
