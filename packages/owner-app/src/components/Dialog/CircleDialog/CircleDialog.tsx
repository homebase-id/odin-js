import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Arrow, Textarea, t } from '@youfoundation/common-app';
import { useCircle } from '@youfoundation/common-app';
import { usePortal } from '@youfoundation/common-app';
import { ErrorNotification } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { Input } from '@youfoundation/common-app';
import { Label } from '@youfoundation/common-app';
import PermissionFlagsEditor from '../../Form/PermissionFlagsEditor';

import { DialogWrapper } from '@youfoundation/common-app';
import { CircleDefinition } from '@youfoundation/js-lib/network';

const CircleDialog = ({
  title,
  confirmText,
  isOpen,
  defaultValue,
  onConfirm,
  onCancel,
}: {
  title: string;
  confirmText?: string;

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
  } = useCircle({}).createOrUpdate;

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
              required
            />
          </div>

          <div className="mb-5 flex flex-row">
            <Label htmlFor="name" className="my-auto mr-2">
              {t('Permissions')}
            </Label>
            <PermissionFlagsEditor
              className="ml-auto"
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
