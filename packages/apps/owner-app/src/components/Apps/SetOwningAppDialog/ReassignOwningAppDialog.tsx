import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ActionButton,
  ActionButtonState,
  Alert,
  DialogWrapper,
  Label,
  t,
  usePortal,
} from '@homebase-id/common-app';
import { Arrow } from '@homebase-id/common-app/icons';
import { useApps } from '../../../hooks/apps/useApps';
import { TargetDrive } from '@homebase-id/js-lib/core';
import { DriveSlugs, useDriveSlugFields } from './DriveSlugFields';

/**
 * Moves a circle or drive from the app that owns it to another.
 *
 * Deliberately not the same dialog as SetOwningAppDialog. Adoption fills a gap and breaks nothing;
 * this takes something away from the app that has it, and for a drive it stops an address other
 * identities resolve against. Two operations with different consequences should not look alike, and
 * the destination app must not be one keystroke from the wrong one.
 *
 * The confirmation phrase is the point: the warning above it is skippable, typing is not.
 */
export const ReassignOwningAppDialog = ({
  title,
  subject,
  isOpen,
  currentAppName,
  requireSlug,
  targetDrive,
  currentDriveSlug,
  currentDriveTypeSlug,
  onConfirm,
  onCancel,
}: {
  title: string;
  /** "circle" or "drive", for the warning copy. */
  subject: string;
  isOpen: boolean;
  /** The app losing it, named so the owner can see what they are undoing. */
  currentAppName?: string | null;
  /** Drives only: the address changes, so both slugs are stated rather than derived. */
  requireSlug?: boolean;
  targetDrive?: TargetDrive;
  /** Prefilled into the fields as a starting point; the owner still states both. */
  currentDriveSlug?: string | null;
  currentDriveTypeSlug?: string | null;
  /** `slugs` is set exactly when requireSlug is, and then both are valid slugs. */
  onConfirm: (appId: string, slugs?: DriveSlugs) => Promise<unknown>;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const { data: apps, isLoading: appsLoading } = useApps().fetchRegistered;

  const [appId, setAppId] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [state, setState] = useState<ActionButtonState>('idle');
  const { slugs, fields: slugFields } = useDriveSlugFields({
    isOpen,
    appId,
    targetDrive,
    suggestedDriveSlug: currentDriveSlug,
    suggestedDriveTypeSlug: currentDriveTypeSlug,
  });

  if (!isOpen) return null;

  const reset = () => {
    setAppId('');
    setConfirmation('');
    setState('idle');
  };

  const confirmed = confirmation.trim().toUpperCase() === 'REASSIGN';
  const slugOk = !requireSlug || !!slugs;
  const canSubmit = !!appId && confirmed && slugOk;

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel} size="large">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canSubmit) return false;

          setState('loading');
          try {
            await onConfirm(appId, requireSlug ? slugs : undefined);
          } catch (ex) {
            console.error('Failed to reassign the owning app', ex);
            setState('error');
            return false;
          }

          setState('success');
          reset();
          return false;
        }}
      >
        <Alert type="critical" className="mb-5" title={t('This is not the ordinary path')}>
          <ul className="list-disc pl-5 text-sm">
            {currentAppName ? (
              <li>
                {t('This is owned by')} <strong>{currentAppName}</strong>, {t('which loses it.')}
              </li>
            ) : null}
            {requireSlug ? (
              <li>
                {t(
                  'The current address stops resolving. Any identity holding it gets nothing -- there is no forwarding and no alias.'
                )}
              </li>
            ) : (
              <li>
                {t(
                  'Pending enrollments queued against this circle are moved to the new app so they are not stranded.'
                )}
              </li>
            )}
            <li>{t('There is no undo beyond reassigning it back.')}</li>
          </ul>
        </Alert>

        <div className="mb-5">
          <Label htmlFor="reassignApp">{t('Move to')}</Label>
          <select
            id="reassignApp"
            required
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-black"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
          >
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

        {requireSlug ? (
          <>
            <p className="mb-2 text-sm text-slate-400">
              {currentDriveSlug ? `${t('Currently')} ${currentDriveSlug}. ` : ''}
              {t(
                'Required, not derived: the address is changing, so it is stated rather than guessed.'
              )}
            </p>
            {slugFields}
          </>
        ) : null}

        <div className="mb-5">
          <Label htmlFor="reassignConfirm">{t('Type REASSIGN to confirm')}</Label>
          <input
            id="reassignConfirm"
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-black"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
          <ActionButton state={state} icon={Arrow} disabled={!canSubmit}>
            {t('Reassign')} {subject}
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

export default ReassignOwningAppDialog;
