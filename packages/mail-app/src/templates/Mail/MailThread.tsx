import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MailHomeHeader } from '../../components/Header/Header';
import { useMailThread } from '../../hooks/mail/useMailThread';
import {
  ActionButton,
  ActionGroup,
  ActionLink,
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
import { useMailConversation } from '../../hooks/mail/useMailConversation';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';
import { useLiveMailProcessor } from '../../hooks/mail/useLiveMailProcessor';
import { ROOT_PATH } from '../../app/App';
import { getNewId } from '@youfoundation/js-lib/helpers';
import { RecipientInput } from '../../components/Composer/RecipientInput';
import { MailHistory } from './MailHistory';
import { MailThreadInfo } from './MailThreadInfo';

const PAGE_SIZE = 100;
export const MailThread = () => {
  useLiveMailProcessor();

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
      <section className="mx-5 my-5 flex flex-col rounded-lg bg-background py-3">
        <MailThreadHeader mailThread={mailThread} subject={subject} className="px-5  " />
        <MailHistory
          mailThread={mailThread}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          className="px-5"
        />
        <MailThreadActions
          className="px-5"
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
  const [isReply, setIsReply] = useState(false);
  const [isForward, setIsForward] = useState(false);

  return (
    <div className={`mt-2 border-t border-gray-100 pt-3 dark:border-gray-800  ${className || ''}`}>
      {isReply ? (
        <ReplyAction {...threadProps} onDone={() => setIsReply(false)} />
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
  recipients: currentRecipients,
  originId,
  threadId,
  subject: currentSubject,
  onDone,
}: {
  recipients: string[];
  originId: string;
  threadId: string;
  subject: string;
  onDone: () => void;
}) => {
  const sender = useDotYouClientContext().getIdentity();
  const {
    mutate: sendMail,
    status: sendMailStatus,
    reset: resetState,
  } = useMailConversation().send;

  const [recipients, setRecipients] = useState<string[]>(currentRecipients);
  const [subject, setSubject] = useState<string>(currentSubject);
  const [message, setMessage] = useState<RichText>();

  // Reset state, when the message was sent successfully
  useEffect(() => {
    if (sendMailStatus === 'success') {
      setMessage([]);
      resetState();
      onDone();
    }
  }, [sendMailStatus]);

  const doSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    console.log('recipients', recipients);
    if (!message || !recipients.length) return;

    const newEmailConversation: NewDriveSearchResult<MailConversation> = {
      fileMetadata: {
        appData: {
          content: {
            recipients,
            subject,
            message,
            originId,
            threadId,
            sender,
          },
        },
      },
      serverMetadata: { accessControlList: { requiredSecurityGroup: SecurityGroupType.Connected } },
    };

    sendMail({ conversation: newEmailConversation, files: [] });
  };

  return (
    <div className="rounded-lg bg-primary/10 px-5 py-5 dark:bg-primary/30">
      <form onSubmit={doSubmit}>
        <h2 className="mb-2">{t('Your reply')}</h2>
        <div className="flex flex-col gap-2">
          <div>
            <Label htmlFor="recipients">{t('To')}</Label>
            <RecipientInput id="recipients" recipients={recipients} setRecipients={setRecipients} />
          </div>
          <div>
            <Label htmlFor="subject">{t('Subject')}</Label>
            <Input
              id="subject"
              required
              defaultValue={subject}
              onChange={(e) => setSubject(e.currentTarget.value)}
            />
          </div>
          <hr className="my-2" />
          <div>
            <Label className="sr-only">{t('Message')}</Label>
            <VolatileInput
              defaultValue={getTextRootsRecursive(message || []).join('')}
              onChange={(newValue) =>
                setMessage([
                  {
                    type: 'paragraph',
                    children: [{ text: newValue }],
                  },
                ])
              }
              placeholder="Your message"
              className="min-h-16 w-full rounded border border-gray-300 bg-white px-3 py-1 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-row-reverse gap-2">
          <ActionButton type="primary" icon={PaperPlane} state={sendMailStatus}>
            {t('Send')}
          </ActionButton>

          <ActionButton
            type="secondary"
            onClick={(e) => {
              e.preventDefault();
              onDone();
            }}
            className="mr-auto"
          >
            {t('Discard')}
          </ActionButton>
        </div>
      </form>
    </div>
  );
};

const ForwardAction = ({
  originId,
  subject: currentSubject,
  mailThread,
  onDone,
}: {
  originId: string;
  subject: string;
  mailThread: DriveSearchResult<MailConversation>[];
  onDone: () => void;
}) => {
  const sender = useDotYouClientContext().getIdentity();

  const {
    mutate: sendMail,
    status: sendMailStatus,
    reset: resetState,
  } = useMailConversation().send;

  // Reset state, when the message was sent successfully
  useEffect(() => {
    if (sendMailStatus === 'success') {
      setMessage([]);
      resetState();
      onDone();
    }
  }, [sendMailStatus]);

  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>(currentSubject);
  const [message, setMessage] = useState<RichText>();

  const doSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!subject || !message || !recipients.length) return;

    const newFowardedEmailConversation: NewDriveSearchResult<MailConversation> = {
      fileMetadata: {
        appData: {
          content: {
            recipients,
            subject,
            message,
            originId: originId,
            threadId: getNewId(),
            sender,
          },
        },
      },
      serverMetadata: { accessControlList: { requiredSecurityGroup: SecurityGroupType.Connected } },
    };

    sendMail({ conversation: newFowardedEmailConversation, files: [] });
  };

  return (
    <div className="rounded-lg bg-primary/10 px-5 py-5 dark:bg-primary/30">
      <form onSubmit={doSubmit}>
        <h2>{t('Forward')}</h2>
        <div className="flex flex-col gap-2">
          <div>
            <Label htmlFor="recipients">{t('To')}</Label>
            <RecipientInput id="recipients" recipients={recipients} setRecipients={setRecipients} />
          </div>
          <div>
            <Label htmlFor="subject">{t('Subject')}</Label>
            <Input
              id="subject"
              required
              defaultValue={subject}
              onChange={(e) => setSubject(e.currentTarget.value)}
            />
          </div>
          <hr className="my-2" />
          <div>
            <Label className="sr-only">{t('Message')}</Label>
            <VolatileInput
              defaultValue={getTextRootsRecursive(message || []).join('')}
              onChange={(newValue) =>
                setMessage([
                  {
                    type: 'paragraph',
                    children: [{ text: newValue }],
                  },
                ])
              }
              placeholder="Your message"
              className="min-h-32 w-full rounded border border-gray-300 bg-white px-3 py-1 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-row-reverse gap-2 pb-5">
          <ActionButton type="primary" icon={PaperPlane} state={sendMailStatus}>
            {t('Send')}
          </ActionButton>

          <ActionButton
            type="secondary"
            onClick={(e) => {
              e.preventDefault();
              onDone();
            }}
            className="mr-auto"
          >
            {t('Discard')}
          </ActionButton>
        </div>
      </form>
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
        <ActionLink
          href={`${ROOT_PATH}`}
          icon={ArrowLeft}
          type="mute"
          size="none"
          className="text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white"
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
