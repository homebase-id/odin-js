import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MailHomeHeader } from '../../components/Header/Header';
import { useMailThread } from '../../hooks/mail/useMailThread';
import {
  ActionButton,
  ActionLink,
  Archive,
  ArrowLeft,
  ConnectionImage,
  ConnectionName,
  Input,
  Label,
  PaperPlane,
  ReplyArrow,
  RichTextRenderer,
  Share,
  Trash,
  VolatileInput,
  flattenInfinteData,
  formatToTimeAgoWithRelativeDetail,
  getTextRootsRecursive,
  t,
} from '@youfoundation/common-app';
import {
  DriveSearchResult,
  NewDriveSearchResult,
  RichText,
  SecurityGroupType,
} from '@youfoundation/js-lib/core';
import { MailConversation } from '../../providers/MailProvider';
import { useMailConversation } from '../../hooks/mail/useMailConversation';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';
import { useLiveMailProcessor } from '../../hooks/mail/useLiveMailProcessor';
import { ROOT_PATH } from '../../app/App';
import { getNewId } from '@youfoundation/js-lib/helpers';
import { RecipientInput } from '../../components/Composer/RecipientInput';

const PAGE_SIZE = 100;
export const MailThread = () => {
  const isOnline = useLiveMailProcessor();

  const identity = useDotYouClientContext().getIdentity();
  const { conversationKey } = useParams();
  const { data: messages } = useMailThread({ threadId: conversationKey }).thread;

  // Flatten all pages, sorted descending and slice on the max number expected
  const mailThread = useMemo(
    () =>
      flattenInfinteData<DriveSearchResult<MailConversation>>(
        messages,
        PAGE_SIZE,
        (a, b) =>
          (b.fileMetadata.appData.userDate || b.fileMetadata.created) -
          (a.fileMetadata.appData.userDate || a.fileMetadata.created)
      ),
    [messages]
  );

  const { subject, threadId, originId, recipients } = useMemo(() => {
    const originalRecipients = mailThread?.[0]?.fileMetadata.appData.content.recipients || [];
    const originalSender = mailThread?.[0]?.fileMetadata.senderOdinId;

    const allRecipients = [...originalRecipients, originalSender || identity].filter(
      (recipient) => recipient && recipient !== identity
    );

    return {
      ...mailThread?.[0]?.fileMetadata.appData.content,
      recipients: allRecipients,
    };
  }, [mailThread]);

  return (
    <>
      <MailHomeHeader />
      <section className="mx-5 my-5 flex flex-col rounded-lg bg-background py-3">
        <MailThreadHeader subject={subject} className="px-5" />
        <MailMessages mailThread={mailThread} className="px-5" />
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

const MailMessages = ({
  mailThread,
  className,
}: {
  mailThread: DriveSearchResult<MailConversation>[];
  className?: string;
}) => {
  return (
    <div className={`flex flex-col-reverse ${className || ''}`}>
      {mailThread?.map((message) => (
        <div className="py-1" key={message.fileId}>
          <MailMessage message={message} />
        </div>
      ))}
    </div>
  );
};

const MailMessage = ({
  message,
  className,
}: {
  message: DriveSearchResult<MailConversation>;
  className?: string;
}) => {
  const messageFromMe = !message.fileMetadata.senderOdinId;
  return (
    <div
      key={message.fileId}
      className={`flex gap-4 ${messageFromMe ? 'flex-row-reverse' : 'flex-row'} ${className || ''}`}
    >
      {messageFromMe ? null : (
        <ConnectionImage className="h-10 w-10" odinId={message.fileMetadata.senderOdinId} />
      )}
      <div className="w-full max-w-[75vw] rounded-lg bg-page-background px-2 py-2 md:max-w-lg">
        <div className={`flex flex-row gap-2`}>
          <p className="font-semibold">
            {!messageFromMe ? (
              <ConnectionName odinId={message.fileMetadata.senderOdinId} />
            ) : (
              t('Me')
            )}
          </p>
          <p>{formatToTimeAgoWithRelativeDetail(new Date(message.fileMetadata.created), true)}</p>
        </div>
        <RichTextRenderer body={message.fileMetadata.appData.content.message} />
      </div>
    </div>
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
  recipients,
  originId,
  threadId,
  subject,
  onDone,
}: {
  recipients: string[];
  originId: string;
  threadId: string;
  subject: string;
  onDone: () => void;
}) => {
  const { mutate: sendMail, status: sendMailStatus } = useMailConversation().send;
  const [message, setMessage] = useState<RichText>();

  const doSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
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
          },
        },
      },
      serverMetadata: { accessControlList: { requiredSecurityGroup: SecurityGroupType.Connected } },
    };

    console.log('newEmailConversation', newEmailConversation);

    sendMail({ conversation: newEmailConversation, files: [] });
  };

  return (
    <div className="rounded-lg bg-page-background px-5 py-5">
      <form onSubmit={doSubmit}>
        <h2 className="mb-2">{t('Your reply')}</h2>
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
  mailThread,
  onDone,
}: {
  originId: string;
  mailThread: DriveSearchResult<MailConversation>[];
  onDone: () => void;
}) => {
  const { mutate: sendMail, status: sendMailStatus } = useMailConversation().send;

  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<RichText>();

  const doSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!subject || !message || !recipients.length) return;

    console.log('mailThread', mailThread);

    const newFowardedEmailConversation: NewDriveSearchResult<MailConversation> = {
      fileMetadata: {
        appData: {
          content: {
            recipients,
            subject,
            message,
            originId: originId,
            threadId: getNewId(),
          },
        },
      },
      serverMetadata: { accessControlList: { requiredSecurityGroup: SecurityGroupType.Connected } },
    };

    sendMail({ conversation: newFowardedEmailConversation, files: [] });
  };

  return (
    <div className="rounded-lg bg-page-background px-5 py-5">
      <form className="" onSubmit={doSubmit}>
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
  subject,
  className,
}: {
  subject: string | undefined;
  className?: string;
}) => {
  return (
    <div
      className={`sticky top-[3.7rem] mb-2 flex flex-row items-center border-b border-gray-100 bg-background pb-3 dark:border-gray-800 ${className || ''}`}
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
        confirmOptions={{
          title: t('Delete conversation'),
          body: t('Are you sure you want to delete the conversation?'),
          buttonText: t('Delete'),
        }}
        onClick={() => {
          //
        }}
      />
      <ActionButton
        type="mute"
        className="p-2 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white"
        size="none"
        icon={Archive}
        onClick={() => {
          //
        }}
      />
      <h1 className="ml-3 text-xl">{subject}</h1>
    </div>
  );
};
