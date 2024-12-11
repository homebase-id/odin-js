import { ActionButton, ErrorBoundary, ErrorNotification, Label, t } from '@homebase-id/common-app';
import { useMailSettings } from '../../hooks/mail/useMailSettings';
import { RichTextEditor } from '@homebase-id/rich-text-editor';
import { useCallback, useState } from 'react';
import { MailSettings, mailSettingsUniqueId } from '../../providers/MailSettingsProvider';
import {
  HomebaseFile,
  NewHomebaseFile,
  RichText,
  SecurityGroupType,
} from '@homebase-id/js-lib/core';
import { MAIL_DRAFT_CONVERSATION_FILE_TYPE } from '../../providers/MailProvider';

const InitialMailSettings: NewHomebaseFile<MailSettings> = {
  fileMetadata: {
    appData: {
      uniqueId: mailSettingsUniqueId,
      content: {
        mailFooter: [],
      },
      userDate: new Date().getTime(),
      fileType: MAIL_DRAFT_CONVERSATION_FILE_TYPE,
    },
  },
  serverMetadata: {
    accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
  },
};

export const MailSettingsPage = () => {
  const {
    get: { data: serverMailSettings, isFetched: isMailSettingsFetched },
    save: {
      mutate: saveMailSettings,
      status: saveMailSettingsStatus,
      error: saveMailSettingsError,
    },
  } = useMailSettings();

  const [newMailSettings, setNewMailSettings] = useState<
    HomebaseFile<MailSettings> | NewHomebaseFile<MailSettings>
  >(serverMailSettings || InitialMailSettings);

  const handleRTEChange = useCallback((e: { target: { name: string; value: RichText } }) => {
    setNewMailSettings((prev) => ({
      ...prev,
      fileMetadata: {
        ...prev.fileMetadata,
        appData: {
          ...prev.fileMetadata.appData,
          content: {
            ...prev.fileMetadata.appData.content,
            mailFooter: e.target.value,
          },
        },
      },
    }));
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();

        saveMailSettings(newMailSettings);
      }}
      className="p-5"
    >
      <ErrorNotification error={saveMailSettingsError} />
      <div className="py-5">
        <h1 className="text-2xl">{t('Mail settings')}</h1>
      </div>

      <div className="py-5">
        <Label>{t('Mail Footer')}</Label>
        <ErrorBoundary>
          {isMailSettingsFetched ? (
            <RichTextEditor
              stickyToolbar={true}
              name="composer"
              defaultValue={serverMailSettings?.fileMetadata.appData.content.mailFooter}
              onChange={handleRTEChange}
              placeholder="Your footer here..."
              className="min-h-56 w-full rounded border border-gray-300 bg-white px-3 py-1 text-base leading-7 text-gray-700 outline-none transition-colors duration-200 ease-in-out dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              contentClassName="max-h-[50vh] overflow-auto"
            />
          ) : null}
        </ErrorBoundary>
      </div>

      <div className="flex flex-row-reverse">
        <ActionButton type="primary" state={saveMailSettingsStatus}>
          {t('Save')}
        </ActionButton>
      </div>
    </form>
  );
};
