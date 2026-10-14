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
import { TargetDrive } from '@homebase-id/js-lib/core';
import { Arrow } from '@homebase-id/common-app/icons';
import { useApps } from '../../../hooks/apps/useApps';
import { useDrives } from '../../../hooks/drives/useDrives';
import { DriveGrant } from '@homebase-id/js-lib/network';
import { drivesEqual, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { DriveSlugs, useDriveSlugFields } from './DriveSlugFields';

/**
 * Hands something that belongs to no app to one that does.
 *
 * Shared by circles and drives because the decision is the same one, and so is the trap: the
 * server sets ownership once and refuses to move it afterwards, so a wrong choice here is not
 * undoable from the console. That is what the warning is for, and why nothing is preselected --
 * a default app would make the irreversible choice the easy one.
 *
 * Drives carry an address as well as an owner, so they get the slug fields -- both required, since
 * the server keeps and derives nothing. Circles have no address and pass showSlugFields false.
 */
export const SetOwningAppDialog = ({
  title,
  subject,
  isOpen,
  showSlugFields,
  targetDrive,
  suggestedDriveSlug,
  suggestedDriveTypeSlug,
  circleDriveGrants,
  onConfirm,
  onCancel,
}: {
  title: string;
  /** What is being handed over, for the warning line -- e.g. "circle" or "drive". */
  subject: string;
  isOpen: boolean;
  showSlugFields?: boolean;
  /** The drive being handed over, when it is a drive. */
  targetDrive?: TargetDrive;
  /**
   * What the slug fields start with -- e.g. the slug the drive already carries, or one made from
   * its name. Only a starting point: the owner states both, and the server takes them as given.
   */
  suggestedDriveSlug?: string | null;
  suggestedDriveTypeSlug?: string | null;
  /**
   * The circle's own drive grants. Assigning a circle to an app also gives that app the access the
   * circle requires -- owning a circle you cannot grant is not ownership -- so what that amounts to
   * is listed here before the owner confirms rather than discovered afterwards.
   */
  circleDriveGrants?: DriveGrant[];
  /** `slugs` is set exactly when showSlugFields is, and then both are valid slugs. */
  onConfirm: (appId: string, slugs?: DriveSlugs) => Promise<unknown>;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const { data: apps, isLoading: appsLoading } = useApps().fetchRegistered;
  const {
    fetch: { data: allDrives },
  } = useDrives();

  const [appId, setAppId] = useState('');
  const [state, setState] = useState<ActionButtonState>('idle');
  const { slugs, fields: slugFields } = useDriveSlugFields({
    isOpen,
    appId,
    targetDrive,
    suggestedDriveSlug,
    suggestedDriveTypeSlug,
  });

  if (!isOpen) return null;

  const canSubmit = !!appId && (!showSlugFields || !!slugs);

  const reset = () => {
    setAppId('');
    setState('idle');
  };

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel} size="large">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canSubmit) return false;

          setState('loading');
          try {
            await onConfirm(appId, showSlugFields ? slugs : undefined);
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

        {showSlugFields ? slugFields : null}

        <GrantPreview
          appId={appId}
          apps={apps}
          circleDriveGrants={circleDriveGrants}
          allDrives={allDrives}
        />

        <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
          <ActionButton state={state} icon={Arrow} disabled={!canSubmit}>
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

/**
 * What the app is about to gain, worked out the same way the server works it out: every drive the
 * circle grants that the app does not already cover. Shown only once an app is chosen, and only
 * when there is something to say -- an app that already has the access needs no warning.
 */
const GrantPreview = ({
  appId,
  apps,
  circleDriveGrants,
  allDrives,
}: {
  appId: string;
  apps?: { appId: string; grant?: { driveGrants?: DriveGrant[] } }[];
  circleDriveGrants?: DriveGrant[];
  allDrives?: { name: string; targetDriveInfo: { alias: string; type: string } }[];
}) => {
  if (!appId || !circleDriveGrants?.length) return null;

  const app = apps?.find((a) => stringGuidsEqual(a.appId, appId));
  const held = app?.grant?.driveGrants ?? [];

  const missing = circleDriveGrants.filter((needed) => {
    const existing = held.find((h) =>
      drivesEqual(h.permissionedDrive.drive, needed.permissionedDrive.drive)
    );
    if (!existing) return true;
    // Covered only when the app already holds every permission the circle grants on that drive.
    return needed.permissionedDrive.permission.some(
      (p) => !existing.permissionedDrive.permission.includes(p)
    );
  });

  if (!missing.length) return null;

  const nameOf = (drive: { alias: string; type: string }) =>
    allDrives?.find((d) => drivesEqual(d.targetDriveInfo, drive))?.name ?? `${drive.alias}`;

  return (
    <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-700 dark:bg-amber-950">
      <p className="mb-2">
        {t(
          'This app will also be given access to the drives the circle grants, so that it can enrol people into it:'
        )}
      </p>
      <ul className="list-disc pl-5">
        {missing.map((m, i) => (
          <li key={i}>
            <strong>{nameOf(m.permissionedDrive.drive)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SetOwningAppDialog;
