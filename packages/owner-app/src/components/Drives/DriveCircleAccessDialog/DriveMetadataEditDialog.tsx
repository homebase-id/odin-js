import { DriveDefinition } from '@youfoundation/js-lib/core';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Arrow } from '@youfoundation/common-app/icons';
import {
  t,
  ActionButton,
  usePortal,
  Label,
  CheckboxToggle,
  mergeStates,
  Input,
  DictionaryEditor,
} from '@youfoundation/common-app';
import { ErrorNotification } from '@youfoundation/common-app';
import { DialogWrapper } from '@youfoundation/common-app';
import { useDrive } from '../../../hooks/drives/useDrive';

const DriveMetadataEditDialog = ({
  title,
  confirmText,

  isOpen,
  driveDefinition,

  onConfirm,
  onCancel,
}: {
  title: string;
  confirmText?: string;

  isOpen: boolean;
  driveDefinition: DriveDefinition;

  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const {
    editAnonymousRead: {
      mutate: updateAnonymousRead,
      error: updateAnonymousReadError,
      status: updateAnonymousReadStatus,
      reset: resetAnonymousRead,
    },
    editDescription: {
      mutate: updateDescription,
      error: updateDescriptionError,
      status: updateDescriptionStatus,
      reset: resetDescription,
    },
    editAttributes: {
      mutate: updateAttributes,
      error: updateAttributesError,
      status: updateAttributesStatus,
      reset: resetAttributes,
    },
  } = useDrive();

  const [allowAnonymousReads, setAllowAnonymousReads] = useState(
    driveDefinition.allowAnonymousReads
  );
  const [metadata, setMetadata] = useState(driveDefinition.metadata);
  const [attributes, setAttributes] = useState(driveDefinition.attributes);

  useEffect(() => {
    if (
      updateAnonymousReadStatus === 'success' &&
      updateDescriptionStatus === 'success' &&
      updateAttributesStatus === 'success'
    ) {
      resetAnonymousRead();
      resetDescription();
      resetAttributes();
      onConfirm();
    }
  }, [updateAnonymousReadStatus, updateDescriptionStatus, updateAttributesStatus]);

  if (!isOpen) return null;

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel}>
      <>
        <ErrorNotification
          error={updateAnonymousReadError || updateDescriptionError || updateAttributesError}
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();

            updateAnonymousRead({
              targetDrive: driveDefinition.targetDriveInfo,
              newAllowAnonymousRead: allowAnonymousReads,
            });

            updateDescription({
              targetDrive: driveDefinition.targetDriveInfo,
              newDescription: metadata,
            });

            updateAttributes({
              targetDrive: driveDefinition.targetDriveInfo,
              newAttributes: attributes,
            });

            return false;
          }}
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-row items-center justify-between gap-2">
              <Label>
                {t('Allow anonymous reads')}
                <small className="block text-sm text-slate-400">
                  {t(
                    'Can the drive be read by anonymous users? Individual files can still be stricter.'
                  )}
                </small>
              </Label>

              <div>
                <CheckboxToggle
                  defaultChecked={driveDefinition.allowAnonymousReads}
                  onChange={(e) => setAllowAnonymousReads(e.currentTarget.checked)}
                />
              </div>
            </div>

            <div>
              <Label>{t('Metadata')}</Label>
              <Input
                defaultValue={driveDefinition.metadata}
                onChange={(e) => setMetadata(e.currentTarget.value)}
              />
            </div>

            <div>
              <Label>{t('Attributes')}</Label>
              <DictionaryEditor
                defaultValue={attributes}
                onChange={(newRecords) => setAttributes(newRecords)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
            <ActionButton
              icon={Arrow}
              state={mergeStates(updateAnonymousReadStatus, updateDescriptionStatus)}
            >
              {confirmText || t('Save')}
            </ActionButton>
            <ActionButton
              type="secondary"
              onClick={(e) => {
                e.preventDefault();
                onCancel();
              }}
            >
              {t('Cancel')}
            </ActionButton>
          </div>
        </form>
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default DriveMetadataEditDialog;
