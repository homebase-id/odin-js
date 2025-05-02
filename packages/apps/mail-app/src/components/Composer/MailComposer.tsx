import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionButton,
  BlockerDialog,
  ErrorBoundary,
  ErrorNotification,
  FileOverview,
  FileSelector,
  Input,
  Label,
  getTextRootsRecursive,
  t,
  useAllContacts,
  useOutsideTrigger,
} from '@homebase-id/common-app';

import {
  NewHomebaseFile,
  SecurityGroupType,
  HomebaseFile,
  NewMediaFile,
  MediaFile,
  RichText,
  DEFAULT_PAYLOAD_KEY,
} from '@homebase-id/js-lib/core';
import { getNewId } from '@homebase-id/js-lib/helpers';
import { useMailConversation, useMailDraft } from '../../hooks/mail/useMailConversation';
import {
  MAIL_DRAFT_CONVERSATION_FILE_TYPE,
  MAIL_MESSAGE_PAYLOAD_KEY,
  MailConversation,
  MailDeliveryStatus,
  MailDrive,
} from '../../providers/MailProvider';
import { RecipientInput } from './RecipientInput';
import { useOdinClientContext } from '@homebase-id/common-app';
import { RichTextEditor } from '@homebase-id/rich-text-editor';
import { useBlocker } from 'react-router-dom';
import { MediaOptions } from '@homebase-id/rich-text-editor/src/editor/ImagePlugin/ImagePlugin';
import { useMailSettings } from '../../hooks/mail/useMailSettings';
import { Plus, PaperPlane, Save, Trash } from '@homebase-id/common-app/icons';
import type { Mentionable } from '@homebase-id/rich-text-editor';

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
  existingDraft?: HomebaseFile<MailConversation>;

  recipients?: string[];
  originId?: string;
  threadId?: string;
  subject?: string;
  forwardedMailThread?: HomebaseFile<MailConversation>[];

  onDone: () => void;
}) => {
  const { data: mailSettings, isFetched: mailSettingsFetched } = useMailSettings().get;

  const [expanded, setExpanded] = useState(!forwardedMailThread || !currentRecipients?.length);
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();
  const [autosavedDsr, setAutosavedDsr] = useState<
    NewHomebaseFile<MailConversation> | HomebaseFile<MailConversation>
  >(
    existingDraft || {
      fileMetadata: {
        appData: {
          content: {
            recipients: currentRecipients || [],
            subject: currentSubject || '',
            message: [],
            originId: originId || getNewId(),
            threadId: threadId || getNewId(),
            sender: loggedOnIdentity || '',
            forwardedMailThread,
            deliveryStatus: MailDeliveryStatus.NotSent,
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
    existingDraft?.fileMetadata.payloads?.filter((pyld) => pyld.key !== DEFAULT_PAYLOAD_KEY) || []
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
      reset: resetSaveDraft,
    },
    removeDraft: { mutate: removeDraft, status: removeDraftStatus, error: removeDraftError },
  } = useMailDraft();

  useEffect(() => {
    // Get fileId & (new) versionTag into the autosavedDsr
    if (saveDraftReturn) setAutosavedDsr(saveDraftReturn);
  }, [saveDraftReturn]);

  const doAutoSave = () => {
    if (saveDraftStatus === 'pending') return;
    resetSaveDraft();

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
    if (!content.subject || !content.message || !content.recipients.length) return;

    const anyNewRecipients = content.recipients.some(
      (recipient) => !currentRecipients?.includes(recipient)
    );

    const newEmailConversation: NewHomebaseFile<MailConversation> = {
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
      serverMetadata: {
        accessControlList: { requiredSecurityGroup: SecurityGroupType.AutoConnected },
      },
    };

    sendMail({ conversation: newEmailConversation, files: files });
  };

  const doDiscard = () => {
    if (autosavedDsr.fileId) {
      // Delete the draft on the server
      removeDraft(autosavedDsr as HomebaseFile<MailConversation>);
    } else {
      onDone();
    }
  };

  useEffect(() => {
    if (saveDraftStatus === 'success') onDone();
  }, [saveDraftStatus]);

  useEffect(() => {
    if (sendMailStatus === 'success') onDone();
  }, [sendMailStatus]);

  useEffect(() => {
    if (removeDraftStatus === 'success') onDone();
  }, [removeDraftStatus]);

  // Show browser specific message when trying to close the tab with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (
        getTextRootsRecursive(autosavedDsr.fileMetadata.appData.content.message).length &&
        saveDraftStatus !== 'success' &&
        autosavedDsr !== existingDraft
      ) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handler);

    return () => window.removeEventListener('beforeunload', handler);
  });

  // Block navigating elsewhere when data has been entered into the input
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !!getTextRootsRecursive(autosavedDsr.fileMetadata.appData.content.message).length &&
      currentLocation.pathname !== nextLocation.pathname &&
      sendMailStatus !== 'success' &&
      removeDraftStatus !== 'success' &&
      sendMailStatus !== 'pending' && // We include pending state, as the status might not have updated through to the blocker;
      removeDraftStatus !== 'pending' &&
      saveDraftStatus !== 'success' &&
      saveDraftStatus !== 'pending' &&
      autosavedDsr !== existingDraft
  );

  const { data: contacts } = useAllContacts(true);
  const mentionables: Mentionable[] = useMemo(
    () =>
      (contacts
        ?.map((contact) => {
          const content = contact.fileMetadata.appData.content;
          if (!content?.odinId) return;
          const name =
            content.name &&
            (content.name.displayName ??
              (content.name.givenName || content.name.surname
                ? `${content.name.givenName ?? ''} ${content.name.surname ?? ''}`
                : undefined));

          return {
            value: content.odinId,
            label: `${content.odinId} ${name ? `- ${name}` : ''}`,
          };
        })
        .filter(Boolean) as Mentionable[]) || [],
    [contacts]
  );

  const detailsRef = useRef<HTMLDivElement>(null);
  useOutsideTrigger(
    detailsRef,
    useCallback(
      () =>
        autosavedDsr.fileMetadata.appData.content.recipients?.length &&
        autosavedDsr.fileMetadata.appData.content.subject &&
        setExpanded(false),
      [autosavedDsr]
    )
  );

  const handleRTEChange = useCallback(
    (e: {
      target: {
        name: string;
        value: RichText;
      };
    }) =>
      setAutosavedDsr((currentDsr) => ({
        ...currentDsr,
        fileMetadata: {
          ...currentDsr.fileMetadata,
          appData: {
            ...currentDsr.fileMetadata.appData,
            content: {
              ...currentDsr.fileMetadata.appData.content,
              message: e.target.value,
            },
          },
        },
      })),
    [setAutosavedDsr]
  );

  const mediaOptions: MediaOptions = useMemo(
    () => ({
      fileId: autosavedDsr.fileId || '',
      mediaDrive: MailDrive,
      pendingUploadFiles: files.filter((f) => 'file' in f) as NewMediaFile[],
      onAppend: async (file) => {
        const fileKey = `${MAIL_MESSAGE_PAYLOAD_KEY}i${files.length}`;

        setFiles([...files, { file: file, key: fileKey }]);
        return { fileId: autosavedDsr.fileId || '', fileKey: fileKey };
      },
      onRemove: async ({ fileKey }: { fileId: string; fileKey: string }) => {
        setFiles(files.filter((f) => f.key !== fileKey));
        return true;
      },
    }),
    [setFiles, autosavedDsr.fileId, files]
  );

  return (
    <>
      <ErrorNotification error={removeDraftError || saveDraftError || sendMailError} />
      <form onSubmit={doSend}>
        <div className="flex flex-col gap-2">
          <div ref={detailsRef} className="contents">
            {expanded ? (
              <>
                <div>
                  <Label htmlFor="recipients">{t('To')}</Label>
                  <RecipientInput
                    id="recipients"
                    autoFocus={expanded}
                    recipients={autosavedDsr.fileMetadata.appData.content.recipients || []}
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
              </>
            ) : (
              <div
                onClick={() => setExpanded(true)}
                className="cursor-pointer text-sm opacity-50 transition-opacity hover:opacity-100"
              >
                <p>
                  <span className="font-semibold">{t('To')}</span>:{' '}
                  {autosavedDsr.fileMetadata.appData.content.recipients.join(', ')}
                </p>
                <p>
                  <span className="font-semibold">{t('Subject')}</span>:{' '}
                  {autosavedDsr.fileMetadata.appData.content.subject}
                </p>
              </div>
            )}
          </div>
          <div>
            <Label className="sr-only">{t('Message')}</Label>
            <ErrorBoundary>
              {mailSettingsFetched ? (
                <RichTextEditor
                  name="composer"
                  stickyToolbar={true}
                  defaultValue={
                    autosavedDsr.fileMetadata.appData.content.message?.length
                      ? autosavedDsr.fileMetadata.appData.content.message
                      : mailSettings?.fileMetadata.appData.content.mailFooter
                        ? [
                            { type: 'paragraph', children: [{ text: '' }] },
                            ...mailSettings.fileMetadata.appData.content.mailFooter,
                          ]
                        : undefined
                  }
                  onChange={handleRTEChange}
                  mediaOptions={mediaOptions}
                  mentionables={mentionables}
                  placeholder="Your message"
                  className="min-h-56 w-full rounded border border-gray-300 bg-white px-3 py-1 text-base leading-7 text-gray-700 outline-none transition-colors duration-200 ease-in-out dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  contentClassName="max-h-[50vh] overflow-auto"
                />
              ) : null}
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
                {t('Attachments')} <Plus className="h-5 w-5" />
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

        <div className="mt-3 flex flex-col gap-2 sm:flex-row-reverse">
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

          <div className="flex flex-row gap-2 sm:mr-auto">
            <ActionButton
              type="secondary"
              className="flex-grow"
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
      {blocker && blocker.reset && blocker.proceed ? (
        <BlockerDialog
          isOpen={blocker.state === 'blocked'}
          onCancel={blocker.reset}
          onProceed={blocker.proceed}
          title={t('You have unsaved changes')}
        >
          <p>{t('Are you sure you want to leave this page? Your changes will be lost.')}</p>
        </BlockerDialog>
      ) : null}
    </>
  );
};
