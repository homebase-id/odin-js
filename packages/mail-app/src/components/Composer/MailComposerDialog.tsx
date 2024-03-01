import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ActionButton,
  ErrorNotification,
  Input,
  Label,
  PaperPlane,
  Save,
  Times,
  VolatileInput,
  getTextRootsRecursive,
  t,
  usePortal,
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
import { useSearchParams } from 'react-router-dom';

export const ComposerDialog = ({ onClose }: { onClose: () => void }) => {
  const target = usePortal('modal-container');

  const [searchParams] = useSearchParams();
  const draftFileId = searchParams.get('new');
  const isDraft = !!draftFileId;

  const { data: draftDsr } = useMailDraft(isDraft ? { draftFileId } : undefined).getDraft;

  const dialog = (
    <>
      {isDraft ? (
        draftDsr ? (
          <MailComposer onDone={onClose} existingDraft={draftDsr} />
        ) : null
      ) : (
        <MailComposer onDone={onClose} />
      )}
    </>
  );

  return createPortal(dialog, target);
};

const MailComposer = ({
  existingDraft,
  onDone,
}: {
  existingDraft?: DriveSearchResult<MailConversation>;
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
            recipients: [],
            subject: '',
            message: [
              {
                type: 'paragraph',
                children: [{ text: '' }],
              },
            ],
            originId: getNewId(),
            threadId: getNewId(),
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
      <div className="fixed bottom-16 right-3 w-[calc(100%-1.5rem)] max-w-xl rounded-lg bg-background shadow-md md:bottom-5 md:right-5">
        <div className="mb-3 flex flex-row items-center justify-between px-5 pt-3">
          <h2>{existingDraft ? t('Edit draft') : t('New mail')}</h2>
          <ActionButton type="mute" icon={Times} onClick={onDone} size="square" />
        </div>
        <form className="" onSubmit={doSend}>
          <div className="flex flex-col gap-2 px-5">
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

          <div className="mt-3 flex flex-row-reverse gap-2 px-5 pb-5">
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
      </div>
    </>
  );
};
