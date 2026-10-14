import { useEffect, useState } from 'react';
import { Label, t } from '@homebase-id/common-app';
import { TargetDrive } from '@homebase-id/js-lib/core';
import {
  drivesEqual,
  isValidSlug,
  SLUG_FORMAT_DESCRIPTION,
  SLUG_MAX_LENGTH,
  stringGuidsEqual,
} from '@homebase-id/js-lib/helpers';
import { useDrives } from '../../../hooks/drives/useDrives';

export interface DriveSlugs {
  driveSlug: string;
  driveTypeSlug: string;
}

const inputClassName =
  'w-full rounded border border-gray-300 bg-white px-3 py-2 font-mono dark:border-gray-700 dark:bg-black';

/**
 * The two slugs a drive needs whenever it is handed to an app (set-owner or reassign). The server
 * requires both, derives neither and coerces neither, so both inputs are required and the caller
 * only gets a value back once both are valid -- `undefined` otherwise, which the dialog treats as
 * "cannot submit".
 *
 * Drive slugs are unique per owning app, so a slug another drive of the chosen app already holds
 * is flagged here too. That check is a hint from the drives list the console already has; the
 * server is the one that enforces it.
 */
export const useDriveSlugFields = ({
  isOpen,
  appId,
  targetDrive,
  suggestedDriveSlug,
  suggestedDriveTypeSlug,
}: {
  isOpen: boolean;
  appId: string;
  targetDrive?: TargetDrive;
  suggestedDriveSlug?: string | null;
  suggestedDriveTypeSlug?: string | null;
}) => {
  const {
    fetch: { data: allDrives },
  } = useDrives();

  const [driveSlug, setDriveSlug] = useState(suggestedDriveSlug ?? '');
  const [driveTypeSlug, setDriveTypeSlug] = useState(suggestedDriveTypeSlug ?? '');

  // Every time the dialog opens it starts again from the suggestion.
  useEffect(() => {
    if (!isOpen) return;
    setDriveSlug(suggestedDriveSlug ?? '');
    setDriveTypeSlug(suggestedDriveTypeSlug ?? '');
  }, [isOpen, suggestedDriveSlug, suggestedDriveTypeSlug]);

  const takenByApp =
    !!appId &&
    !!allDrives?.some(
      (d) =>
        stringGuidsEqual(d.appId ?? undefined, appId) &&
        d.driveSlug === driveSlug &&
        !(targetDrive && drivesEqual(d.targetDriveInfo, targetDrive))
    );

  const slugs: DriveSlugs | undefined =
    isValidSlug(driveSlug) && isValidSlug(driveTypeSlug) && !takenByApp
      ? { driveSlug, driveTypeSlug }
      : undefined;

  const fields = (
    <>
      <div className="mb-5">
        <Label htmlFor="driveSlug">{t('Drive slug')}</Label>
        <input
          id="driveSlug"
          required
          maxLength={SLUG_MAX_LENGTH}
          className={inputClassName}
          value={driveSlug}
          onChange={(e) => setDriveSlug(e.target.value)}
          autoComplete="off"
        />
        <p className="mt-1 text-sm text-slate-400">
          {t('The segment this drive answers to under the app, as /apps/{app}/drives/{slug}.')}{' '}
          {t(SLUG_FORMAT_DESCRIPTION)}
        </p>
        {driveSlug && !isValidSlug(driveSlug) ? (
          <p className="mt-1 text-sm text-red-500">{t('Not a valid slug')}</p>
        ) : takenByApp ? (
          <p className="mt-1 text-sm text-red-500">
            {t('Another drive of this app already uses this slug')}
          </p>
        ) : null}
      </div>
      <div className="mb-5">
        <Label htmlFor="driveTypeSlug">{t('Drive type slug')}</Label>
        <input
          id="driveTypeSlug"
          required
          maxLength={SLUG_MAX_LENGTH}
          className={inputClassName}
          value={driveTypeSlug}
          onChange={(e) => setDriveTypeSlug(e.target.value)}
          autoComplete="off"
        />
        <p className="mt-1 text-sm text-slate-400">
          {t('A category to filter on, not an address.')} {t(SLUG_FORMAT_DESCRIPTION)}
        </p>
        {driveTypeSlug && !isValidSlug(driveTypeSlug) ? (
          <p className="mt-1 text-sm text-red-500">{t('Not a valid slug')}</p>
        ) : null}
      </div>
    </>
  );

  return { slugs, fields };
};
