import { byteArrayToString, TargetDrive } from '@youfoundation/js-lib';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '@youfoundation/common-app';
import useDrive from '../../../hooks/drives/useDrive';
import useExport, { importable, isImportable } from '../../../hooks/drives/useExport';
import { usePortal } from '@youfoundation/common-app';
import { Alert } from '@youfoundation/common-app';
import { ErrorNotification } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { DialogWrapper } from '@youfoundation/common-app';

const ImportDialog = ({
  title,
  confirmText,
  isOpen,
  targetDrive,
  onCancel,
}: {
  title: string;
  confirmText?: string;

  isOpen: boolean;

  targetDrive?: TargetDrive;

  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const {
    mutateAsync: importUnencrypted,
    status: importStatus,
    error: importError,
  } = useExport().importUnencrypted;
  const [errorMessage, setErrorMessage] = useState<string>();
  const [dataObject, setDataObject] = useState<importable>();
  const {
    fetch: { data: dataObjectDrive },
  } = useDrive({
    targetDrive: !targetDrive ? dataObject?.metadata?.drive?.targetDriveInfo : undefined,
  });

  const [importDataStatus, setImportDataStatus] = useState<{ fileId: string; status: boolean }[]>();

  if (!isOpen) {
    return null;
  }

  const importData = async (formatDrive?: boolean) => {
    if (!dataObject) {
      return;
    }

    setImportDataStatus(
      await importUnencrypted({
        drive: targetDrive,
        formatDrive: formatDrive,
        data: dataObject,
      })
    );

    // onConfirm();
  };

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel} size="2xlarge">
      <>
        <ErrorNotification error={importError} />
        {errorMessage && (
          <Alert type="critical" className="mb-8">
            {errorMessage}
          </Alert>
        )}

        <input
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              const arrayBuffer = await file.arrayBuffer();
              const contents = byteArrayToString(new Uint8Array(arrayBuffer));
              const dataObject = JSON.parse(contents);

              if (!isImportable(dataObject)) {
                setErrorMessage(t('The file provided is not in the right JSON format'));
                return;
              } else {
                setErrorMessage(undefined);
              }

              setDataObject(dataObject);
            }
          }}
          type="file"
          accept="application/json"
          className={`w-full rounded border border-gray-300 bg-white px-3 py-1 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100`}
        />

        {dataObject && (
          <div className="my-8">
            {!targetDrive ? (
              dataObjectDrive ? (
                <p className="pb-2">
                  {t('This drive already exists:')} {dataObject.metadata.drive.name}
                </p>
              ) : (
                <p className="pb-2">
                  {t('A new drive will be created:')} {dataObject.metadata.drive.name}
                </p>
              )
            ) : (
              (dataObject.metadata.drive.targetDriveInfo.alias !== targetDrive.alias ||
                dataObject.metadata.drive.targetDriveInfo.type !== targetDrive.type) && (
                <p className="pb-2 text-orange-600">
                  {t('Warning')}: {t('the export originates from a different drive')}
                </p>
              )
            )}

            <p className="mb-6 text-xl">
              {t('Found the following')} {dataObject.files.length} {t('files')}.{' '}
              <small className="block text-sm">
                {t('Exported on')}:{' '}
                {new Date(dataObject.metadata.date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                })}
              </small>
            </p>

            <ul className="-my-1 max-h-[25vh] overflow-auto">
              {dataObject.files.map((file) => (
                <li
                  key={file.fileId}
                  className={`my-1 flex flex-row rounded-lg border border-slate-200 px-2 py-1 dark:border-slate-700 ${
                    importDataStatus &&
                    (importDataStatus?.find((status) => status.fileId === file.fileId)?.status ===
                    true
                      ? 'bg-green-200 dark:bg-green-900'
                      : 'bg-red-200 dark:bg-red-900')
                  }`}
                >
                  {file.fileId} <span className="ml-auto">{file.fileMetadata.contentType}</span>
                </li>
              ))}
            </ul>
            {targetDrive || dataObjectDrive ? (
              <small className="mt-6 block text-sm">
                {t('Data on the drive will be overwritten when importing')}
              </small>
            ) : null}
          </div>
        )}

        <div className="-m-2 flex flex-row-reverse pt-10 ">
          <ActionButton className="m-2" onClick={() => importData()} state={importStatus}>
            {confirmText ?? t('Import')}
          </ActionButton>
          {targetDrive || dataObjectDrive ? (
            <ActionButton
              className="m-2"
              onClick={() => importData(true)}
              state={importStatus}
              type="secondary"
            >
              {t('Clean drive & import')}
            </ActionButton>
          ) : null}
          <ActionButton className="m-2" type="secondary" onClick={onCancel}>
            {t('Close')}
          </ActionButton>
        </div>
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default ImportDialog;
