import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Textarea,
  t,
  useCircle,
  usePortal,
  ErrorNotification,
  ActionButton,
  Input,
  Label,
  DialogWrapper,
  Alert,
} from '@homebase-id/common-app';
import PermissionFlagsEditor from '../../Form/PermissionFlagsEditor';
import { CircleDefinition } from '@homebase-id/js-lib/network';
import { Arrow } from '@homebase-id/common-app/icons';

const CircleDialog = ({
  title,
  confirmText,
  isOpen,
  permissionEditOnly,
  defaultValue,
  onConfirm,
  onCancel,
}: {
  title: string;
  confirmText?: string;
  permissionEditOnly?: boolean;
  isOpen: boolean;
  defaultValue: CircleDefinition;

  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const {
    mutateAsync: createOrUpdate,
    status: createOrUpdateStatus,
    error: updateError,
  } = useCircle().createOrUpdate;

  const [newCircleDefinition, setNewCircleDefinition] = useState<CircleDefinition>(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setNewCircleDefinition(defaultValue);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const reset = () => {
    setNewCircleDefinition(defaultValue);
  };

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel} size="4xlarge">
      <>
        <ErrorNotification error={updateError} />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newCircleDefinition) return;
            await createOrUpdate(newCircleDefinition);
            reset();
            onConfirm();

            return false;
          }}
        >
          {permissionEditOnly ? (
            <Alert type={'info'} isCompact={true} className="mb-2">
              {t(`This is a system circle, you can't change the name and description`)}
            </Alert>
          ) : null}
          <div
            className={
              permissionEditOnly ? 'pointer-events-none select-none opacity-50' : undefined
            }
          >
            <div className="mb-5">
              <Label htmlFor="name">{t('Name')}</Label>
              <Input
                id="name"
                name="circleName"
                defaultValue={newCircleDefinition?.name}
                onChange={(e) => {
                  setNewCircleDefinition({ ...newCircleDefinition, name: e.target.value });
                }}
                required
              />
            </div>
            <div className="mb-5">
              <Label htmlFor="name">{t('Description')}</Label>
              <Textarea
                id="description"
                name="circleDescription"
                defaultValue={newCircleDefinition.description}
                onChange={(e) => {
                  setNewCircleDefinition({
                    ...newCircleDefinition,
                    description: e.target.value,
                  });
                }}
              />
            </div>
          </div>

          <div className="mb-5 flex flex-col sm:flex-row">
            <Label htmlFor="name" className="my-auto mr-2">
              {t('Permissions')}
            </Label>
            <PermissionFlagsEditor
              className="sm:ml-auto"
              defaultValue={newCircleDefinition.permissions?.keys ?? [0]}
              onChange={(newValue) => {
                setNewCircleDefinition({
                  ...newCircleDefinition,
                  permissions: { keys: newValue },
                });
              }}
            />
          </div>

          <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
            <ActionButton state={createOrUpdateStatus} icon={Arrow}>
              {confirmText || t('Add Circle')}
            </ActionButton>
            <ActionButton
              type="secondary"
              onClick={() => {
                reset();
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

export default CircleDialog;
