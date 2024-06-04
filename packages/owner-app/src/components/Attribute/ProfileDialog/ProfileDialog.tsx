import { ProfileDefinition } from '@youfoundation/js-lib/profile';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Arrow, t } from '@youfoundation/common-app';
import { usePortal } from '@youfoundation/common-app';
import { useProfiles } from '@youfoundation/common-app';
import { ErrorNotification } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { Input, Label, Textarea } from '@youfoundation/common-app';
import { DialogWrapper } from '@youfoundation/common-app';

const ProfileDialog = ({
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
  defaultValue?: ProfileDefinition;

  onConfirm: (newProfileDef: ProfileDefinition) => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const {
    mutateAsync: saveProfileDefinition,
    status: saveProfileDefinitionStatus,
    error: saveProfileError,
  } = useProfiles().saveProfile;

  const [newProfileDef, setNewProfileDef] = useState<ProfileDefinition>(
    defaultValue
      ? {
          ...defaultValue,
        }
      : ({
          name: '',
          description: '',
        } as ProfileDefinition)
  );

  if (!isOpen) {
    return null;
  }

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel}>
      <>
        <ErrorNotification error={saveProfileError} />
        <form
          onSubmit={async (e) => {
            e.preventDefault();

            await saveProfileDefinition(newProfileDef);
            onConfirm(newProfileDef);

            return false;
          }}
        >
          <div className="mb-5">
            <Label htmlFor="name">{t('Name')}</Label>
            <Input
              id="name"
              name="profileName"
              defaultValue={newProfileDef.name}
              onChange={(e) => {
                setNewProfileDef({ ...newProfileDef, name: e.target.value });
              }}
              required
            />
          </div>
          <div className="mb-5">
            <Label htmlFor="name">{t('Description')}</Label>
            <Textarea
              id="description"
              name="profileDescription"
              defaultValue={newProfileDef.description}
              onChange={(e) => {
                setNewProfileDef({ ...newProfileDef, description: e.target.value });
              }}
              required
            />
          </div>

          <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
            <ActionButton state={saveProfileDefinitionStatus} icon={Arrow}>
              {confirmText || t('Add Profile')}
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

export default ProfileDialog;
