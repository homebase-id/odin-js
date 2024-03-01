import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ActionButton,
  ErrorNotification,
  Input,
  Label,
  PaperPlane,
  Times,
  VolatileInput,
  getTextRootsRecursive,
  t,
  usePortal,
} from '@youfoundation/common-app';
import { RichText, NewDriveSearchResult, SecurityGroupType } from '@youfoundation/js-lib/core';
import { getNewId } from '@youfoundation/js-lib/helpers';
import { useMailConversation } from '../../hooks/mail/useMailConversation';
import { MailConversation } from '../../providers/MailProvider';
import { RecipientInput } from './RecipientInput';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';

export const ComposerDialog = ({ onClose }: { onClose: () => void }) => {
  const target = usePortal('modal-container');
  const identity = useDotYouClientContext().getIdentity();

  const {
    mutate: sendMail,
    status: sendMailStatus,
    error: sendMailError,
  } = useMailConversation().send;

  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<RichText>();

  const doSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!identity || !subject || !message || !recipients.length) return;

    const newEmailConversation: NewDriveSearchResult<MailConversation> = {
      fileMetadata: {
        appData: {
          content: {
            recipients,
            subject,
            message,
            originId: getNewId(),
            threadId: getNewId(),
            sender: identity,
          },
        },
      },
      serverMetadata: { accessControlList: { requiredSecurityGroup: SecurityGroupType.Connected } },
    };

    sendMail({ conversation: newEmailConversation, files: [] });
  };

  useEffect(() => {
    if (sendMailStatus === 'success') onClose();
  }, [sendMailStatus]);

  const dialog = (
    <>
      <ErrorNotification error={sendMailError} />
      <div className="fixed bottom-16 right-3 w-[calc(100%-1.5rem)] max-w-xl rounded-lg bg-background shadow-md md:bottom-5 md:right-5">
        <div className="mb-3 flex flex-row items-center justify-between px-5 pt-3">
          <h2>{t('New mail')}</h2>
          <ActionButton type="mute" icon={Times} onClick={onClose} size="square" />
        </div>
        <form className="" onSubmit={doSubmit}>
          <div className="flex flex-col gap-2 px-5">
            <div>
              <Label htmlFor="recipients">{t('To')}</Label>
              <RecipientInput
                id="recipients"
                recipients={recipients}
                setRecipients={setRecipients}
              />
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

          <div className="mt-3 flex flex-row-reverse gap-2 px-5 pb-5">
            <ActionButton type="primary" icon={PaperPlane} state={sendMailStatus}>
              {t('Send')}
            </ActionButton>

            <ActionButton
              type="secondary"
              onClick={(e) => {
                e.preventDefault();
                onClose();
              }}
              className="mr-auto"
            >
              {t('Discard')}
            </ActionButton>
          </div>
        </form>
      </div>
    </>
  );

  return createPortal(dialog, target);
};
