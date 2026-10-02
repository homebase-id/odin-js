import { TargetDrive } from '@homebase-id/js-lib/core';
import { OWNER_APP_ID, OWNER_ROOT } from '../constants';

/**
 * Where the owner console shows an app, and the drives and circles it owns.
 *
 * Drives and circles live under the app that owns them. One owned by no app -- or by the owner
 * console itself -- lives under the owner console's own page.
 */
export const getOwnerAppPath = (appId?: string | null) =>
  `${OWNER_ROOT}/third-parties/apps/${encodeURIComponent(appId || OWNER_APP_ID)}`;

export const getOwnerDrivePath = (appId: string | null | undefined, targetDrive: TargetDrive) =>
  `${getOwnerAppPath(appId)}/drives/${targetDrive.alias}_${targetDrive.type}`;

export const getOwnerCirclePath = (appId: string | null | undefined, circleId: string) =>
  `${getOwnerAppPath(appId)}/circles/${encodeURIComponent(circleId)}`;
