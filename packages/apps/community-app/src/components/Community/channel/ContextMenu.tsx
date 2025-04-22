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
  useOdinClientContext,
  useOutsideTrigger,
  ReactionsBarHandle,
  usePortal,
  ActionButton,
  getPlainTextFromRichText,
  COMMUNITY_ROOT_PATH,
} from '@homebase-id/common-app';
import { useEffect, useRef, useState } from 'react';
import { useCommunityMessage } from '../../../hooks/community/messages/useCommunityMessage';
import { CommunityMessageInfo } from '../Message/detail/CommunityMessageInfo';
import { CommunityReactionComposer } from '../Message/reactions/CommunityReactionComposer';
import {
  Bookmark,
  BookmarkSolid,
  Clipboard,
  Pencil,
  Persons,
  Pin,
  Question,
  ReplyArrow,
  Trash,
} from '@homebase-id/common-app/icons';
import {
  useCommunityLater,
  useManageCommunityLater,
} from '../../../hooks/community/useCommunityLater';
import { isTouchDevice } from '@homebase-id/js-lib/helpers';
import { createPortal } from 'react-dom';
import { useCommunityPin } from '../../../hooks/community/useCommunityPin';
import { useCommunityCollaborativeMsg } from '../../../hooks/community/useCommunityCollaborativeMsg';

export interface CommunityActions {
  doReply?: (msg: HomebaseFile<CommunityMessage>) => void;
  doDelete: (msg: HomebaseFile<CommunityMessage>, deleteForEveryone: boolean) => void;
  doEdit?: (msg: HomebaseFile<CommunityMessage>) => void;
}

export const ContextMenu = ({
  msg,
  community,
  communityActions,
  isTouchOpen,
  setIsTouchOpen,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community?: HomebaseFile<CommunityDefinition>;
  communityActions?: CommunityActions;
  isTouchOpen?: boolean;
  setIsTouchOpen?: (isTouchOpen: boolean) => void;
}) => {
  const [isStickyOpen, setIsStickyOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const reactionsBarRef = useRef<ReactionsBarHandle>(null);
  const wrapperRef = useRef(null);
  useOutsideTrigger(wrapperRef, () => {
    reactionsBarRef.current?.close();
    setIsStickyOpen(false);
  });

  const isTouch = isTouchDevice() && window.innerWidth < 1024;

  const target = usePortal('context-menu');
  const [clickable, setClickable] = useState(false);
  useEffect(() => {
    if (isTouchOpen) setTimeout(() => setClickable(true), 750);
    else setClickable(false);
  }, [isTouchOpen]);

  if (!isTouch) {
    return (
      <div
        className={[
          'absolute right-5 top-[-3rem] z-10',
          'flex flex-row items-center rounded-lg bg-background px-1 py-2 text-foreground shadow-md',
          isStickyOpen || isContextOpen
            ? 'visible'
            : `invisible ${isTouch ? '' : 'group-hover:pointer-events-auto group-hover:visible'}`,
        ].join(' ')}
        ref={wrapperRef}
      >
        <CommunityReactionComposer
          ref={reactionsBarRef}
          msg={msg}
          community={community}
          onOpen={() => setIsStickyOpen(true)}
          onClose={() => {
            setIsStickyOpen(false);
          }}
        />
        <CommunityContextActions
          msg={msg}
          community={community}
          communityActions={communityActions}
          renderActionGroup={true}
          onOpen={() => setIsContextOpen(true)}
          onClose={() => setIsContextOpen(false)}
        />
      </div>
    );
  }

  if (!isTouchOpen) return null;
  return createPortal(
    <div
      className={`fixed inset-0 z-20 flex flex-col justify-end bg-page-background/70 ${clickable ? 'pointer-events-auto' : 'pointer-events-none'}`}
      onClick={() => setIsTouchOpen?.(false)}
    >
      <div
        className="min-h-40 rounded-t-md bg-background px-2 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-2 pb-2">
          <CommunityReactionComposer
            ref={reactionsBarRef}
            msg={msg}
            community={community}
            onClick={() => setIsTouchOpen?.(false)}
            onOpen={() => setIsStickyOpen(true)}
            onClose={() => {
              if (!clickable) return;
              setIsStickyOpen(false);
              setIsTouchOpen?.(false);
            }}
            className={'w-full gap-2'}
          />
        </div>
        <hr />
        <CommunityContextActions
          msg={msg}
          community={community}
          communityActions={communityActions}
          renderActionGroup={false}
          onClose={() => setIsTouchOpen?.(false)}
        />
        <hr />
        {setIsTouchOpen ? (
          <ActionButton
            onClick={() => setIsTouchOpen?.(false)}
            className="w-full px-2 py-2 text-center"
            type="mute"
          >
            {t('Close')}
          </ActionButton>
        ) : null}
      </div>
    </div>,
    target
  );
};

const CommunityContextActions = ({
  msg,
  community,
  communityActions,
  renderActionGroup,
  onOpen,
  onClose,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community?: HomebaseFile<CommunityDefinition>;
  communityActions?: CommunityActions;
  renderActionGroup: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}) => {
  if (!communityActions) return null;
  const [showMessageInfo, setShowMessageInfo] = useState(false);

  const { isSaved } = useCommunityLater({
    messageId: msg.fileMetadata.appData.uniqueId,
  });
  const {
    toggleSave: { mutate: toggleSave, error: toggleSaveError },
  } = useManageCommunityLater({
    messageId: msg.fileMetadata.appData.uniqueId,
    systemFileType: msg.fileSystemType,
  });

  const {
    isPinned,
    togglePin: { mutate: togglePin },
  } = useCommunityPin({ msg, community });

  const {
    isCollaborative,
    toggleCollaborative: { mutate: toggleCollaborative },
    canBackup,
    restoreAndMakePrivate: { mutate: restoreAndMakePrivate },
  } = useCommunityCollaborativeMsg({ msg, community });

  const { mutate: resend, error: resendError } = useCommunityMessage().update;

  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();
  const authorOdinId = msg.fileMetadata.originalAuthor;

  const messageFromMe = !authorOdinId || authorOdinId === loggedOnIdentity;

  const channelId = msg.fileMetadata.appData.content.channelId;
  const threadId = msg.fileMetadata.appData.content.threadId;
  const optionalOptions: ActionGroupOptionProps[] = [
    {
      icon: Clipboard,
      label: t('Copy link'),
      onClick: () => {
        navigator.clipboard.writeText(
          `${import.meta.env.VITE_CENTRAL_LOGIN_HOST}/redirect${COMMUNITY_ROOT_PATH}/${community?.fileMetadata.senderOdinId}/${community?.fileMetadata.appData.uniqueId}/${channelId}/${threadId ? `${threadId}/thread/` : ``}${msg.fileMetadata.appData.uniqueId}`
        );
      },
    },
    {
      icon: Clipboard,
      label: t('Copy text'),
      onClick: () => {
        navigator.clipboard.writeText(
          getPlainTextFromRichText(msg.fileMetadata.appData.content.message, true) || ''
        );
      },
    },
    {
      icon: Pin,
      label: isPinned ? t('Unpin message') : t('Pin message'),
      onClick: () => togglePin(),
    },
  ];

  if ((messageFromMe || isCollaborative) && communityActions.doEdit) {
    optionalOptions.push({
      icon: Pencil,
      label: t('Edit'),
      onClick: () => {
        onClose && onClose();
        communityActions.doEdit?.(msg);
      },
    });
  }

  if (messageFromMe) {
    if (communityActions.doDelete) {
      optionalOptions.push({
        icon: Trash,
        label: t('Delete'),
        confirmOptions: {
          title: t('Delete message'),
          body: t('Are you sure you want to delete this message?'),
          buttonText: t('Delete'),
        },
        onClick: () => communityActions.doDelete?.(msg, true),
      });
    }

    if (!isCollaborative) {
      optionalOptions.push({
        icon: Persons,
        label: t('Make collaborative'),
        onClick: () => toggleCollaborative(),
      });
    } else {
      optionalOptions.push({
        icon: Persons,
        label: t('Make private'),
        actionOptions: {
          title: t('Make private'),
          body: t(
            'Are you sure you want to make this message private again, other collaborators will no longer be able to edit the message?'
          ),
          type: 'info',
          options: [
            {
              children: t('Make private'),
              onClick: () => toggleCollaborative(),
            },
            canBackup
              ? {
                  children: t('Restore and make private'),
                  onClick: () => restoreAndMakePrivate(),
                  type: 'remove',
                }
              : undefined,
          ],
        },
      });
    }
  }

  if (community)
    optionalOptions.push({
      icon: Question,
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

      {renderActionGroup ? (
        <>
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
            options={optionalOptions.map((option) => ({ ...option, icon: undefined }))}
            type={'mute'}
            size="square"
            alwaysInPortal={true}
            onOpen={onOpen}
            onClose={onClose}
          />
        </>
      ) : (
        <div className="flex flex-col items-start">
          {communityActions.doReply ? (
            <ActionButton
              icon={ReplyArrow}
              onClick={() => communityActions.doReply && communityActions.doReply(msg)}
              type="mute"
            >
              {t('Reply')}
            </ActionButton>
          ) : null}
          <ActionButton
            onClick={() => toggleSave()}
            icon={isSaved ? BookmarkSolid : Bookmark}
            type="mute"
            key={isSaved ? 'remove' : 'save'}
          >
            {isSaved ? t('Remove from later') : t('Save for later')}
          </ActionButton>
          {optionalOptions.map((option) => {
            return (
              <ActionButton key={option.label} {...option} type="mute">
                {option.label}
              </ActionButton>
            );
          })}
        </div>
      )}
    </>
  );
};
