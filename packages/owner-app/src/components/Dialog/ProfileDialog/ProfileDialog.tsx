import { ProfileDefinition } from '@youfoundation/js-lib';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../helpers/i18n/dictionary';
import usePortal from '../../../hooks/portal/usePortal';
import useProfiles from '../../../hooks/profiles/useProfiles';
import ErrorNotification from '../../ui/Alerts/ErrorNotification/ErrorNotification';
import ActionButton from '../../ui/Buttons/ActionButton';
import Input from '../../Form/Input';
import Label from '../../Form/Label';
import Textarea from '../../Form/Textarea';
import DialogWrapper from '../../ui/Dialog/DialogWrapper';

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

  onConfirm: () => void;
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
            onConfirm();

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

          <div className="-m-2 flex flex-row-reverse py-3">
            <ActionButton className="m-2" state={saveProfileDefinitionStatus} icon={'send'}>
              {confirmText || t('Add Profile')}
            </ActionButton>
            <ActionButton className="m-2" type="secondary" onClick={onCancel}>
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
