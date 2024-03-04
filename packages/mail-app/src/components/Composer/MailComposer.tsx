import { useEffect, useState } from 'react';
import {
  ActionButton,
  ErrorNotification,
  Input,
  Label,
  PaperPlane,
  Save,
  VolatileInput,
  getTextRootsRecursive,
  t,
} from '@youfoundation/common-app';
import {
  NewDriveSearchResult,
  SecurityGroupType,
  DriveSearchResult,
} from '@youfoundation/js-lib/core';
import { getNewId } from '@youfoundation/js-lib/helpers';
import { useMailConversation, useMailDraft } from '../../hooks/mail/useMailConversation';
import { MAIL_DRAFT_CONVERSATION_FILE_TYPE, MailConversation } from '../../providers/MailProvider';
import { RecipientInput } from './RecipientInput';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';

export const MailComposer = ({
  existingDraft,

  recipients: currentRecipients,
  originId,
  threadId,
  subject: currentSubject,

  onDone,
}: {
  existingDraft?: DriveSearchResult<MailConversation>;

  recipients?: string[];
  originId?: string;
  threadId?: string;
  subject?: string;

  onDone: () => void;
}) => {
  const identity = useDotYouClientContext().getIdentity();

  const [autosavedDsr, setAutosavedDsr] = useState<
    NewDriveSearchResult<MailConversation> | DriveSearchResult<MailConversation>
  >(
    existingDraft || {
      fileMetadata: {
        appData: {
          content: {
            recipients: currentRecipients || [],
            subject: currentSubject || '',
            message: [
              {
                type: 'paragraph',
                children: [{ text: '' }],
              },
            ],
            originId: originId || getNewId(),
            threadId: threadId || getNewId(),
            sender: identity,
          },
          userDate: new Date().getTime(),
          fileType: MAIL_DRAFT_CONVERSATION_FILE_TYPE,
        },
      },
      serverMetadata: {
        accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
      },
    }
  );

  const {
    mutate: sendMail,
    status: sendMailStatus,
    error: sendMailError,
  } = useMailConversation().send;

  const {
    mutate: saveDraft,
    status: saveDraftStatus,
    error: saveDraftError,
    data: saveDraftReturn,
  } = useMailDraft().saveDraft;

  useEffect(() => {
    if (saveDraftReturn) {
      // Get fileId & (new) versionTag into the autosavedDsr
      setAutosavedDsr(saveDraftReturn);
    }
  }, [saveDraftReturn]);

  const doAutoSave = () => {
    if (saveDraftStatus === 'pending') return;

    const newSavedDsr = { ...autosavedDsr };
    newSavedDsr.fileMetadata.appData.content = {
      ...autosavedDsr.fileMetadata.appData.content,
    };
    setAutosavedDsr(newSavedDsr);
    saveDraft({ conversation: newSavedDsr, files: [] });
  };

  const doSend: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const content = autosavedDsr.fileMetadata.appData.content;
    if (!identity || !content.subject || !content.message || !content.recipients.length) return;

    const newEmailConversation: NewDriveSearchResult<MailConversation> = {
      ...autosavedDsr,
      serverMetadata: { accessControlList: { requiredSecurityGroup: SecurityGroupType.Connected } },
    };

    sendMail({ conversation: newEmailConversation, files: [] });
  };

  useEffect(() => {
    if (sendMailStatus === 'success') onDone();
  }, [sendMailStatus]);

  return (
    <>
      <ErrorNotification error={saveDraftError || sendMailError} />
      <form className="" onSubmit={doSend}>
        <div className="flex flex-col gap-2 ">
          <div>
            <Label htmlFor="recipients">{t('To')}</Label>
            <RecipientInput
              id="recipients"
              recipients={autosavedDsr.fileMetadata.appData.content.recipients}
              setRecipients={(newRecipients) =>
                setAutosavedDsr({
                  ...autosavedDsr,
                  fileMetadata: {
                    ...autosavedDsr.fileMetadata,
                    appData: {
                      ...autosavedDsr.fileMetadata.appData,
                      content: {
                        ...autosavedDsr.fileMetadata.appData.content,
                        recipients: newRecipients,
                      },
                    },
                  },
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="subject">{t('Subject')}</Label>
            <Input
              id="subject"
              required
              defaultValue={autosavedDsr.fileMetadata.appData.content.subject}
              onChange={(e) =>
                setAutosavedDsr({
                  ...autosavedDsr,
                  fileMetadata: {
                    ...autosavedDsr.fileMetadata,
                    appData: {
                      ...autosavedDsr.fileMetadata.appData,
                      content: {
                        ...autosavedDsr.fileMetadata.appData.content,
                        subject: e.currentTarget.value,
                      },
                    },
                  },
                })
              }
            />
          </div>
          <hr className="my-2" />
          <div>
            <Label className="sr-only">{t('Message')}</Label>
            <VolatileInput
              defaultValue={getTextRootsRecursive(
                autosavedDsr.fileMetadata.appData.content.message || []
              ).join('')}
              onChange={(newValue) =>
                setAutosavedDsr({
                  ...autosavedDsr,
                  fileMetadata: {
                    ...autosavedDsr.fileMetadata,
                    appData: {
                      ...autosavedDsr.fileMetadata.appData,
                      content: {
                        ...autosavedDsr.fileMetadata.appData.content,
                        message: [
                          {
                            type: 'paragraph',
                            children: [{ text: newValue }],
                          },
                        ],
                      },
                    },
                  },
                })
              }
              placeholder="Your message"
              className="min-h-32 w-full rounded border border-gray-300 bg-white px-3 py-1 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-row-reverse gap-2">
          <ActionButton type="primary" icon={PaperPlane} state={sendMailStatus}>
            {t('Send')}
          </ActionButton>
          <ActionButton
            type="secondary"
            icon={Save}
            state={saveDraftStatus}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              doAutoSave();
            }}
          >
            {t('Save as draft')}
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
    </>
  );
};
