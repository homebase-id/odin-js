import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ActionButton,
  ActionButtonState,
  DialogWrapper,
  Label,
  t,
  usePortal,
} from '@homebase-id/common-app';
import { Arrow } from '@homebase-id/common-app/icons';
import { useApps } from '../../../hooks/apps/useApps';

/**
 * Hands something that belongs to no app to one that does.
 *
 * Shared by circles and drives because the decision is the same one, and so is the trap: the
 * server sets ownership once and refuses to move it afterwards, so a wrong choice here is not
 * undoable from the console. That is what the warning is for, and why nothing is preselected --
 * a default app would make the irreversible choice the easy one.
 *
 * Drives carry an address as well as an owner, so they get the optional slug fields. Circles have
 * no address and pass showSlugFields false.
 */
export const SetOwningAppDialog = ({
  title,
  subject,
  isOpen,
  showSlugFields,
  onConfirm,
  onCancel,
}: {
  title: string;
  /** What is being handed over, for the warning line -- e.g. "circle" or "drive". */
  subject: string;
  isOpen: boolean;
  showSlugFields?: boolean;
  onConfirm: (appId: string, driveSlug?: string, driveTypeSlug?: string) => Promise<unknown>;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const { data: apps, isLoading: appsLoading } = useApps().fetchRegistered;

  const [appId, setAppId] = useState('');
  const [driveSlug, setDriveSlug] = useState('');
  const [driveTypeSlug, setDriveTypeSlug] = useState('');
  const [state, setState] = useState<ActionButtonState>('idle');

  if (!isOpen) return null;

  const reset = () => {
    setAppId('');
    setDriveSlug('');
    setDriveTypeSlug('');
    setState('idle');
  };

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel} size="large">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!appId) return false;

          setState('loading');
          try {
            await onConfirm(
              appId,
              driveSlug.trim() || undefined,
              driveTypeSlug.trim() || undefined
            );
          } catch (ex) {
            console.error('Failed to set the owning app', ex);
            setState('error');
            return false;
          }

          setState('success');
          reset();
          return false;
        }}
      >
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
          {t('This cannot be undone.')}{' '}
          {t(
            `Ownership is set once: the server refuses to move a ${subject} between apps afterwards, because pending enrollments and addresses are recorded against the app that owns it.`
          )}
        </p>

        <div className="mb-5">
          <Label htmlFor="owningApp">{t('App')}</Label>
          <select
            id="owningApp"
            required
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-black"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
          >
            {/* Nothing preselected: the choice cannot be taken back, so it has to be made. */}
            <option value="">{t('Choose an app...')}</option>
            {apps?.map((app) => (
              <option key={app.appId} value={app.appId}>
                {app.name}
              </option>
            ))}
          </select>
          {!apps?.length && !appsLoading ? (
            <p className="mt-1 text-sm text-slate-400">
              {t('No apps registered on your identity')}
            </p>
          ) : null}
        </div>

        {showSlugFields ? (
          <>
            <div className="mb-5">
              <Label htmlFor="driveSlug">{t('Drive slug')}</Label>
              <input
                id="driveSlug"
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-black"
                placeholder={t('Derived from the name when left blank')}
                value={driveSlug}
                onChange={(e) => setDriveSlug(e.target.value)}
              />
              <p className="mt-1 text-sm text-slate-400">
                {t(
                  'The segment this drive answers to under the app, as /apps/{app}/drives/{slug}.'
                )}
              </p>
            </div>
            <div className="mb-5">
              <Label htmlFor="driveTypeSlug">{t('Drive type slug')}</Label>
              <input
                id="driveTypeSlug"
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-black"
                placeholder={t('Derived from the type when left blank')}
                value={driveTypeSlug}
                onChange={(e) => setDriveTypeSlug(e.target.value)}
              />
              <p className="mt-1 text-sm text-slate-400">
                {t('A category to filter on, not an address.')}
              </p>
            </div>
          </>
        ) : null}

        <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
          <ActionButton state={state} icon={Arrow} disabled={!appId}>
            {t('Assign')}
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
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default SetOwningAppDialog;
