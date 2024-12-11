import { HomebaseFile } from '@homebase-id/js-lib/core';
import {
  CommunityDeliveryStatus,
  CommunityMessage,
} from '../../../providers/CommunityMessageProvider';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import {
  ActionGroupOptionProps,
  t,
  ErrorNotification,
  ActionGroup,
  useDotYouClientContext,
  useOutsideTrigger,
  ReactionsBarHandle,
} from '@homebase-id/common-app';
import { useRef, useState } from 'react';
import { useCommunityMessage } from '../../../hooks/community/messages/useCommunityMessage';
import { CommunityMessageInfo } from '../Message/detail/CommunityMessageInfo';
import { CommunityReactionComposer } from '../Message/reactions/CommunityReactionComposer';
import { Bookmark, BookmarkSolid, ReplyArrow } from '@homebase-id/common-app/icons';
import { useCommunityLater } from '../../../hooks/community/useCommunityLater';

export interface CommunityActions {
  doReply?: (msg: HomebaseFile<CommunityMessage>) => void;
  doDelete: (msg: HomebaseFile<CommunityMessage>, deleteForEveryone: boolean) => void;
  doEdit?: (msg: HomebaseFile<CommunityMessage>) => void;
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
  const [isStickyOpen, setIsStickyOpen] = useState(false);
  const reactionsBarRef = useRef<ReactionsBarHandle>(null);
  const wrapperRef = useRef(null);
  useOutsideTrigger(wrapperRef, () => {
    reactionsBarRef.current?.close();
    setIsStickyOpen(false);
  });

  return (
    <div
      className={`absolute right-5 top-[-3rem] z-10 flex flex-row items-center rounded-lg bg-background px-1 py-2 text-foreground shadow-md ${isStickyOpen ? 'visible' : 'invisible group-hover:pointer-events-auto group-hover:visible'}`}
      ref={wrapperRef}
    >
      <CommunityReactionComposer
        ref={reactionsBarRef}
        msg={msg}
        community={community}
        onOpen={() => setIsStickyOpen(true)}
        onClose={() => setIsStickyOpen(false)}
      />
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

  const {
    isSaved,
    toggleSave: { mutate: toggleSave, error: toggleSaveError },
  } = useCommunityLater({
    messageId: msg.fileMetadata.appData.uniqueId,
    systemFileType: msg.fileSystemType,
  });

  const { mutate: resend, error: resendError } = useCommunityMessage().update;

  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
  const authorOdinId = msg.fileMetadata.senderOdinId;

  const messageFromMe = !authorOdinId || authorOdinId === loggedOnIdentity;

  const optionalOptions: ActionGroupOptionProps[] = [];
  if (messageFromMe) {
    if (communityActions.doEdit) {
      optionalOptions.push({
        label: t('Edit'),
        onClick: () => communityActions.doEdit?.(msg),
      });
    }
    if (communityActions.doDelete) {
      optionalOptions.push({
        label: t('Delete'),
        confirmOptions: {
          title: t('Delete message'),
          body: t('Are you sure you want to delete this message?'),
          buttonText: t('Delete'),
        },
        onClick: () => communityActions.doDelete?.(msg, true),
      });
    }
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
      <ErrorNotification error={resendError || toggleSaveError} />
      {showMessageInfo && community ? (
        <CommunityMessageInfo
          msg={msg}
          community={community}
          onClose={() => setShowMessageInfo(false)}
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
      <button
        className="rounded-full p-2 text-slate-400 hover:bg-slate-300 hover:dark:bg-slate-700"
        onClick={() => toggleSave()}
      >
        {isSaved ? <BookmarkSolid className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
      </button>
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
