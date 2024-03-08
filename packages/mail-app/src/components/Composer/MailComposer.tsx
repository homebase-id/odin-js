import { useEffect, useState } from 'react';
import {
  ActionButton,
  ErrorBoundary,
  ErrorNotification,
  FileOverview,
  FileSelector,
  Input,
  Label,
  PaperPlane,
  Plus,
  Save,
  Trash,
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
import {
  MAIL_DRAFT_CONVERSATION_FILE_TYPE,
  MAIL_MESSAGE_PAYLOAD_KEY,
  MailConversation,
  MailDrive,
} from '../../providers/MailProvider';
import { RecipientInput } from './RecipientInput';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';
import { RichTextEditor } from '@youfoundation/rich-text-editor';
import { NewMediaFile, MediaFile } from '@youfoundation/js-lib/public';

const FIFTY_MEGA_BYTES = 50 * 1024 * 1024;

export const MailComposer = ({
  existingDraft,

  recipients: currentRecipients,
  originId,
  threadId,
  subject: currentSubject,
  forwardedMailThread,

  onDone,
}: {
  existingDraft?: DriveSearchResult<MailConversation>;

  recipients?: string[];
  originId?: string;
  threadId?: string;
  subject?: string;
  forwardedMailThread?: DriveSearchResult<MailConversation>[];

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
            message: [{ text: '' }],
            originId: originId || getNewId(),
            threadId: threadId || getNewId(),
            sender: identity,
            forwardedMailThread,
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

  const [files, setFiles] = useState<(NewMediaFile | MediaFile)[]>(
    existingDraft?.fileMetadata.payloads || []
  );

  const {
    mutate: sendMail,
    status: sendMailStatus,
    error: sendMailError,
  } = useMailConversation().send;

  const {
    saveDraft: {
      mutate: saveDraft,
      status: saveDraftStatus,
      error: saveDraftError,
      data: saveDraftReturn,
    },
    removeDraft: { mutate: removeDraft, status: removeDraftStatus, error: removeDraftError },
  } = useMailDraft();

  useEffect(() => {
    // Get fileId & (new) versionTag into the autosavedDsr
    if (saveDraftReturn) setAutosavedDsr(saveDraftReturn);
  }, [saveDraftReturn]);

  const doAutoSave = () => {
    if (saveDraftStatus === 'pending') return;

    const newSavedDsr = { ...autosavedDsr };
    newSavedDsr.fileMetadata.appData.content = {
      ...autosavedDsr.fileMetadata.appData.content,
    };
    setAutosavedDsr(newSavedDsr);
    saveDraft({ conversation: newSavedDsr, files: files });
  };

  const doSend: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const content = autosavedDsr.fileMetadata.appData.content;
    if (!identity || !content.subject || !content.message || !content.recipients.length) return;

    const anyNewRecipients = content.recipients.some((recipient) =>
      currentRecipients?.includes(recipient)
    );

    const newEmailConversation: NewDriveSearchResult<MailConversation> = {
      ...autosavedDsr,
      fileMetadata: {
        ...autosavedDsr.fileMetadata,
        appData: {
          ...autosavedDsr.fileMetadata.appData,
          content: {
            ...autosavedDsr.fileMetadata.appData.content,
            forwardedMailThread: anyNewRecipients ? forwardedMailThread : undefined,
          },
        },
      },
      serverMetadata: { accessControlList: { requiredSecurityGroup: SecurityGroupType.Connected } },
    };

    sendMail({ conversation: newEmailConversation, files: files });
  };

  const doDiscard = () => {
    if (autosavedDsr.fileId) {
      // Delete the draft on the server
      removeDraft(autosavedDsr as DriveSearchResult<MailConversation>);
    } else {
      onDone();
    }
  };

  useEffect(() => {
    if (sendMailStatus === 'success') onDone();
  }, [sendMailStatus]);

  useEffect(() => {
    if (removeDraftStatus === 'success') onDone();
  }, [removeDraftStatus]);

  // Show browser specific message when trying to close the tab with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (getTextRootsRecursive(autosavedDsr.fileMetadata.appData.content.message).length) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handler);

    return () => window.removeEventListener('beforeunload', handler);
  });

  return (
    <>
      <ErrorNotification error={removeDraftError || saveDraftError || sendMailError} />
      <form onSubmit={doSend}>
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
            <ErrorBoundary>
              <RichTextEditor
                name="composer"
                defaultValue={autosavedDsr.fileMetadata.appData.content.message || []}
                onChange={(e) =>
                  setAutosavedDsr({
                    ...autosavedDsr,
                    fileMetadata: {
                      ...autosavedDsr.fileMetadata,
                      appData: {
                        ...autosavedDsr.fileMetadata.appData,
                        content: {
                          ...autosavedDsr.fileMetadata.appData.content,
                          message: e.target.value,
                        },
                      },
                    },
                  })
                }
                mediaOptions={
                  autosavedDsr.fileId
                    ? {
                        fileId: autosavedDsr.fileId,
                        mediaDrive: MailDrive,
                        pendingUploadFiles: files.filter((f) => 'file' in f) as NewMediaFile[],
                        onAppend: async (file) => {
                          const fileKey = `${MAIL_MESSAGE_PAYLOAD_KEY}i${files.length}`;

                          setFiles([...files, { file: file, key: fileKey }]);
                          return { fileId: autosavedDsr.fileId as string, fileKey: fileKey };
                        },
                        onRemove: async ({ fileKey }: { fileId: string; fileKey: string }) => {
                          setFiles(files.filter((f) => f.key !== fileKey));
                          return true;
                        },
                      }
                    : undefined
                }
                placeholder="Your message"
                className="min-h-44 w-full rounded border border-gray-300 bg-white px-3 py-1 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </ErrorBoundary>
          </div>

          <div>
            <FileSelector
              accept="*"
              onChange={(mediaFiles) =>
                setFiles([...(files ?? []), ...mediaFiles.map((file) => ({ file }))])
              }
              maxSize={FIFTY_MEGA_BYTES}
              className="mb-2"
            >
              <span className="flex flex-row items-center gap-2">
                {t('Attachments')} <Plus className="h-4 w-4" />
              </span>
            </FileSelector>
            <FileOverview
              files={files?.map((file) => ({
                ...file,
                fileId: (file as MediaFile).fileId || autosavedDsr.fileId,
              }))}
              cols={8}
              setFiles={setFiles}
              targetDrive={MailDrive}
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
              onDone();
            }}
          >
            {t('Save as draft')}
          </ActionButton>

          <div className="mr-auto flex flex-row gap-2">
            <ActionButton
              type="secondary"
              onClick={(e) => {
                e.preventDefault();
                onDone();
              }}
            >
              {t('Cancel')}
            </ActionButton>
            {autosavedDsr.fileId ? (
              <ActionButton
                type="secondary"
                icon={Trash}
                size="square"
                onClick={(e) => {
                  e.preventDefault();
                  doDiscard();
                }}
                confirmOptions={
                  getTextRootsRecursive(autosavedDsr.fileMetadata.appData.content.message).length
                    ? {
                        title: t('Discard draft'),
                        body: t('Are you sure you want to discard this draft?'),
                        buttonText: t('Discard'),
                      }
                    : undefined
                }
              />
            ) : null}
          </div>
        </div>
      </form>
    </>
  );
};
