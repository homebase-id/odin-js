import { t, Alert, ActionButton, Label, Input } from '@homebase-id/common-app';
import { useEffect, useState } from 'react';
import Section from '../../components/ui/Sections/Section';
import { useAccountRemoval } from '../../hooks/removal/useAccountRemoval';

export const DeleteAccountSettings = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const {
    status: { data: statusData },
    delete: { mutate: deleteAccount, status: deleteStatus },
    undelete: { mutate: undeleteAccount, status: undeleteStatus },
  } = useAccountRemoval();

  const isScheduledForDeletion = !!statusData?.plannedDeletionDate;
  useEffect(() => setCurrentPassword(''), [deleteStatus, undeleteStatus]);

  if (isScheduledForDeletion) {
    const scheduledDate = new Date(statusData.plannedDeletionDate as number);
    return (
      <>
        <Alert type="critical" className="mb-5">
          {t('Your account is scheduled for deletion on')} {scheduledDate.toLocaleDateString()}
        </Alert>
        <Section title={t('Cancel delete account')}>
          <p className="mb-5 max-w-lg text-slate-400">
            {t('Would you like to cancel the deletion of your account? You can do so until')}{' '}
            {scheduledDate.toLocaleDateString()}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();

              if (e.currentTarget.reportValidity()) undeleteAccount(currentPassword);
            }}
          >
            <div className="mb-2">
              <Label>{t('Your password')}</Label>
              <Input
                required
                name="currentPassowrd"
                id="currentPassowrd"
                type="password"
                onChange={(e) => setCurrentPassword(e.target.value)}
                defaultValue={currentPassword}
                autoComplete="current-password"
              />
            </div>
            <div className="mt-5 flex flex-row-reverse">
              <ActionButton
                confirmOptions={{
                  title: t('Cancel the deletion of your account'),
                  body: t('Are you sure you want to cancel the deletion of your account?'),
                  buttonText: t('Cancel delete account'),
                }}
                state={undeleteStatus}
                disabled={!currentPassword}
                onClick={() => undeleteAccount(currentPassword)}
              >
                {t('Cancel delete account')}
              </ActionButton>
            </div>
          </form>
        </Section>
      </>
    );
  } else {
    return (
      <>
        <Section title={t('Delete account')}>
          <p className="mb-5 max-w-lg text-slate-400">
            {t(
              `If you want to delete you account, you can request account deletion below.
              Once requested, you account will be scheduled for deletion after 30 days.
              In that time you will be able to cancel the request.`
            )}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.currentTarget.reportValidity()) deleteAccount(currentPassword);
            }}
          >
            <div className="mb-2">
              <Label>{t('Your password')}</Label>
              <Input
                required
                name="currentPassowrd"
                id="currentPassowrd"
                type="password"
                onChange={(e) => setCurrentPassword(e.target.value)}
                defaultValue={currentPassword}
                autoComplete="current-password"
              />
            </div>
            <div className="mt-5 flex flex-row-reverse">
              <ActionButton
                confirmOptions={{
                  title: t('Delete account'),
                  body: t('Are you sure you want to delete your account?'),
                  buttonText: t('Delete account'),
                }}
                state={deleteStatus}
                disabled={!currentPassword}
                onClick={() => deleteAccount(currentPassword)}
              >
                {t('Delete account')}
              </ActionButton>
            </div>
          </form>
        </Section>
      </>
    );
  }
};
