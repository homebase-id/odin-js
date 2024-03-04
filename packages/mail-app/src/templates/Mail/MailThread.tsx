import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MailHomeHeader } from '../../components/Header/Header';
import { useMailThread } from '../../hooks/mail/useMailThread';
import {
  ActionButton,
  ActionGroup,
  Archive,
  ArrowLeft,
  ErrorNotification,
  Input,
  Label,
  PaperPlane,
  ReplyArrow,
  Share,
  Trash,
  VolatileInput,
  flattenInfinteData,
  getTextRootsRecursive,
  t,
} from '@youfoundation/common-app';
import {
  DriveSearchResult,
  NewDriveSearchResult,
  RichText,
  SecurityGroupType,
} from '@youfoundation/js-lib/core';
import { MailConversation, getAllRecipients } from '../../providers/MailProvider';
import { useMailConversation, useMailDraft } from '../../hooks/mail/useMailConversation';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';
import { getNewId } from '@youfoundation/js-lib/helpers';
import { RecipientInput } from '../../components/Composer/RecipientInput';
import { MailHistory } from './MailHistory';
import { MailThreadInfo } from './MailThreadInfo';
import { MailComposer } from '../../components/Composer/MailComposer';
import { useSearchParams } from 'react-router-dom';

const PAGE_SIZE = 100;
export const MailThread = () => {
  const identity = useDotYouClientContext().getIdentity();
  const { conversationKey } = useParams();

  const {
    data: messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMailThread({ threadId: conversationKey }).fetch;

  // Flatten all pages, sorted descending and slice on the max number expected
  const mailThread = useMemo(
    () =>
      flattenInfinteData<DriveSearchResult<MailConversation>>(
        messages,
        PAGE_SIZE,
        (a, b) =>
          (a.fileMetadata.appData.userDate || a.fileMetadata.created) -
          (b.fileMetadata.appData.userDate || b.fileMetadata.created)
      ),
    [messages]
  );

  const { subject, threadId, originId, recipients } = useMemo(() => {
    const lastMessage = mailThread?.[mailThread.length - 1];
    const allRecipients = getAllRecipients(lastMessage, identity);

    return {
      ...lastMessage?.fileMetadata.appData.content,
      threadId:
        lastMessage?.fileMetadata.appData.groupId ||
        lastMessage?.fileMetadata.appData.content.threadId,
      recipients: allRecipients,
    };
  }, [mailThread]);

  return (
    <>
      <MailHomeHeader />
      <section className="flex flex-col bg-background py-3 md:mx-5 md:my-5 md:rounded-lg">
        <MailThreadHeader mailThread={mailThread} subject={subject} className="px-2 md:px-5  " />
        <MailHistory
          mailThread={mailThread}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          className="px-2 md:px-5"
        />
        <MailThreadActions
          className="px-2 md:px-5"
          mailThread={mailThread}
          originId={originId}
          threadId={threadId}
          recipients={recipients}
          subject={subject}
        />
      </section>
    </>
  );
};
const MailThreadActions = ({
  mailThread,
  className,
  ...threadProps
}: {
  mailThread: DriveSearchResult<MailConversation>[];
  className?: string;
  recipients: string[];
  originId: string;
  threadId: string;
  subject: string;
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const draftFileId = searchParams.get('draft');

  const [isReply, setIsReply] = useState(!!draftFileId);
  const [isForward, setIsForward] = useState(false);

  useEffect(() => {
    if (draftFileId) setIsReply(true);
  }, [draftFileId]);

  return (
    <div className={`mt-2 border-t border-gray-100 pt-3 dark:border-gray-800  ${className || ''}`}>
      {isReply ? (
        <ReplyAction
          {...threadProps}
          draftFileId={draftFileId || undefined}
          onDone={() => {
            setIsReply(false);
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('draft');
            setSearchParams(newSearchParams);
          }}
        />
      ) : isForward ? (
        <ForwardAction
          subject={threadProps.subject}
          originId={threadProps.originId}
          mailThread={mailThread}
          onDone={() => setIsForward(false)}
        />
      ) : (
        <div className="flex flex-row gap-2">
          <ActionButton type="secondary" icon={ReplyArrow} onClick={() => setIsReply(!isReply)}>
            {t('Reply')}
          </ActionButton>
          <ActionButton type="secondary" icon={Share} onClick={() => setIsForward(!isForward)}>
            {t('Forward')}
          </ActionButton>
        </div>
      )}
    </div>
  );
};

const ReplyAction = ({
  draftFileId,

  recipients,
  originId,
  threadId,
  subject,
  onDone,
}: {
  draftFileId: string | undefined;

  recipients: string[];
  originId: string;
  threadId: string;
  subject: string;
  onDone: () => void;
}) => {
  const hasDraft = !!draftFileId;
  const { data: draftDsr } = useMailDraft(hasDraft ? { draftFileId } : undefined).getDraft;

  return (
    <div className="rounded-lg bg-primary/10 px-2 py-5 dark:bg-primary/30 md:px-5">
      {hasDraft && !draftDsr ? null : (
        <MailComposer
          existingDraft={draftDsr || undefined}
          recipients={recipients}
          originId={originId}
          threadId={threadId}
          subject={subject}
          onDone={onDone}
          key={draftFileId}
        />
      )}
    </div>
  );
};

const ForwardAction = ({
  originId,
  subject,
  mailThread,
  onDone,
}: {
  originId: string;
  subject: string;
  mailThread: DriveSearchResult<MailConversation>[];
  onDone: () => void;
}) => {
  return (
    <div className="rounded-lg bg-primary/10 px-2 py-5 dark:bg-primary/30 md:px-5">
      <MailComposer
        originId={originId}
        subject={subject}
        onDone={onDone}
        forwardedMailThread={mailThread}
      />
    </div>
  );
};

const MailThreadHeader = ({
  mailThread,
  subject,
  className,
}: {
  mailThread: DriveSearchResult<MailConversation>[];
  subject: string | undefined;
  className?: string;
}) => {
  const [showMailThreadInfo, setShowMailThreadInfo] = useState(false);

  const {
    mutate: removeThread,
    status: removeThreadStatus,
    error: removeThreadError,
  } = useMailThread().remove;
  const {
    mutate: archiveThread,
    status: archiveThreadStatus,
    error: archiveThreadError,
  } = useMailThread().archive;

  const doArchive = () => archiveThread(mailThread);
  const doRemove = () => removeThread(mailThread);

  return (
    <>
      <ErrorNotification error={removeThreadError || archiveThreadError} />
      <div
        className={`sticky top-[3.7rem] z-20 mb-2 flex flex-row items-center border-b border-gray-100 bg-background pb-3 dark:border-gray-800 ${className || ''}`}
      >
        <ActionButton
          onClick={() => window.history.back()}
          icon={ArrowLeft}
          type="mute"
          size="none"
          className="p-2 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white"
        />
        <ActionButton
          type="mute"
          className="p-2 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white"
          size="none"
          icon={Trash}
          state={removeThreadStatus}
          confirmOptions={{
            title: t('Delete conversation'),
            body: t('Are you sure you want to delete the conversation?'),
            buttonText: t('Delete'),
          }}
          onClick={doRemove}
        />
        <ActionButton
          type="mute"
          className="p-2 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white"
          size="none"
          icon={Archive}
          state={archiveThreadStatus}
          onClick={doArchive}
        />
        <h1 className="ml-3 text-xl">{subject}</h1>
        <ActionGroup
          className="ml-auto"
          type={'mute'}
          size="square"
          options={[
            {
              label: t('Thread info'),
              onClick: () => setShowMailThreadInfo(true),
            },
          ]}
        />
      </div>
      {showMailThreadInfo ? (
        <MailThreadInfo mailThread={mailThread} onClose={() => setShowMailThreadInfo(false)} />
      ) : null}
    </>
  );
};
