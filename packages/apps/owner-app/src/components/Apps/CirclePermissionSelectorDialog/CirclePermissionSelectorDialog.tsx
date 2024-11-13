import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ActionButton, ActionButtonState, t } from '@homebase-id/common-app';
import { usePortal } from '@homebase-id/common-app';
import { CircleSelector } from '@homebase-id/common-app';
import { DialogWrapper } from '@homebase-id/common-app';
import { ErrorNotification } from '@homebase-id/common-app';
import { PermissionSetGrantRequest } from '../../../provider/app/AppManagementProviderTypes';
import PermissionSelector from '../../Form/PermissionSelector';
import DrivePermissionSelector from '../../Form/DrivePermissionSelector';
import { DriveDefinition } from '@homebase-id/js-lib/core';
import { Arrow } from '@homebase-id/common-app/icons';

const CirclePermissionSelectorDialog = ({
  title,
  isOpen,

  circleIds,
  defaultValue,
  drives,
  error,
  confirmState,

  hideCircleSelector,
  hidePermissionSelector,
  hideDriveSelector,

  onConfirm,
  onCancel,
}: {
  title: string;
  isOpen: boolean;

  circleIds: string[];
  defaultValue?: PermissionSetGrantRequest;
  drives: DriveDefinition[];
  error: unknown;
  confirmState?: ActionButtonState;

  hideCircleSelector?: boolean;
  hidePermissionSelector?: boolean;
  hideDriveSelector?: boolean;

  onConfirm: (circleIds: string[], permissionGrant: PermissionSetGrantRequest) => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const [newCircleIds, setNewCircleIds] = useState<string[]>([]);
  const [permissionSetGrant, setPermissionSetGrant] = useState<PermissionSetGrantRequest>(
    defaultValue ?? { drives: [], permissionSet: { keys: [] } }
  );

  if (!isOpen) {
    return null;
  }

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel}>
      <ErrorNotification error={error} />
      <>
        <form
          onSubmit={async (e) => {
            e.preventDefault();

            onConfirm([...newCircleIds], permissionSetGrant);
          }}
        >
          {hideCircleSelector ? null : (
            <div className="mb-6">
              <h2 className="mb-2 text-lg">{t('Which circles')}:</h2>
              <CircleSelector
                defaultValue={circleIds}
                onChange={(e) => setNewCircleIds(e.target.value)}
              />
            </div>
          )}
          {hidePermissionSelector ? null : (
            <div className="mb-6">
              <h2 className="mb-2 text-lg">{t('Have what permissions')}:</h2>
              <PermissionSelector
                type="app-circles"
                permissionSet={permissionSetGrant.permissionSet || { keys: [] }}
                onChange={(newVal) =>
                  setPermissionSetGrant({ ...permissionSetGrant, permissionSet: newVal })
                }
              />
            </div>
          )}
          {hideDriveSelector ? null : (
            <div className="mb-6">
              <h2 className="mb-2 text-lg">{t('Can access which drives')}:</h2>
              <DrivePermissionSelector
                onChange={(newVal) =>
                  setPermissionSetGrant({ ...permissionSetGrant, drives: newVal })
                }
                driveGrants={permissionSetGrant.drives || []}
                drives={drives}
              />
            </div>
          )}

          <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
            <ActionButton icon={Arrow} state={confirmState}>
              {t('Save')}
            </ActionButton>
            <ActionButton type="secondary" onClick={onCancel}>
              {t('Cancel')}
            </ActionButton>
          </div>
        </form>
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default CirclePermissionSelectorDialog;
