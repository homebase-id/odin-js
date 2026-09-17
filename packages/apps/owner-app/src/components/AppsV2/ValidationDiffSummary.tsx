import { ReactNode } from 'react';
import { SubtleMessage, t } from '@homebase-id/common-app';
import { AppManifestV2, AppRegistrationValidationResult, TargetDriveV2 } from '@homebase-id/js-lib/auth';
import Section from '../ui/Sections/Section';
import PermissionView from '../PermissionViews/PermissionView/PermissionView';
import { PermissionKeyList } from '../Apps/AppOverviewParts';
import {
  CircleGrantedDrives,
  DriveAccessList,
  OwnedCirclePreview,
  OwnedDriveSummary,
} from './AppsV2Parts';
import { targetDriveKey } from './appsV2Helpers';

const Block = ({
  compact,
  title,
  children,
}: {
  compact?: boolean;
  title: string;
  children: ReactNode;
}) =>
  compact ? (
    <div className="my-4">
      <h3 className="mb-2 text-sm font-medium text-slate-400">{title}</h3>
      {children}
    </div>
  ) : (
    <Section title={title}>{children}</Section>
  );

/**
 * What applying a manifest changes, from its validation diff: what the app will create and own,
 * drive access gained/lost (each drive labelled with its owning app), permission keys and authorized
 * circles. Shared by /owner/app-registration and the bundle consent page (`compact`).
 */
export const ValidationDiffSummary = ({
  manifest,
  validation,
  driveName,
  circleName,
  compact,
}: {
  manifest: AppManifestV2;
  validation: AppRegistrationValidationResult;
  driveName: (drive: TargetDriveV2) => string | undefined;
  circleName: (circleId: string) => string;
  compact?: boolean;
}) => {
  const diff = validation.diff;
  const isUpdate = validation.isRegistered;
  const nothingChanges =
    isUpdate &&
    !diff.drivesToCreate.length &&
    !diff.circlesToCreate.length &&
    !diff.driveAccessGained.length &&
    !diff.driveAccessLost.length &&
    !diff.permissionKeysGained.length &&
    !diff.permissionKeysLost.length &&
    !diff.authorizedCirclesAdded.length &&
    !diff.authorizedCirclesRemoved.length;

  return (
    <>
    {nothingChanges ? (
      <SubtleMessage className="my-5">{t('Nothing changes: the app is up to date.')}</SubtleMessage>
    ) : null}

    {diff.drivesToCreate.length || diff.circlesToCreate.length ? (
      <Block compact={compact} title={t('Will create and own')}>
        <div className="flex flex-col gap-4">
          {diff.drivesToCreate.map((drive) => (
            <OwnedDriveSummary
              drive={drive}
              appSlug={manifest.appSlug}
              key={targetDriveKey(drive.targetDrive)}
            />
          ))}
          {diff.circlesToCreate.map((circle) => (
            <OwnedCirclePreview circle={circle} driveName={driveName} key={circle.id} />
          ))}
        </div>
      </Block>
    ) : null}

    {diff.driveAccessGained.length ? (
      <Block compact={compact} title={t('Will gain access to')}>
        <DriveAccessList entries={diff.driveAccessGained} />
      </Block>
    ) : null}

    {diff.driveAccessLost.length ? (
      <Block compact={compact} title={t('Will lose access to')}>
        <DriveAccessList entries={diff.driveAccessLost} />
      </Block>
    ) : null}

    {diff.permissionKeysGained.length ? (
      <Block compact={compact} title={t('Will be allowed to')}>
        <div className="flex flex-col gap-4">
          {diff.permissionKeysGained.map((key) => (
            <PermissionView permission={key} key={key} />
          ))}
        </div>
      </Block>
    ) : null}

    {diff.permissionKeysLost.length ? (
      <Block compact={compact} title={t('Will no longer be allowed to')}>
        <div className="flex flex-col gap-4 line-through decoration-slate-400">
          {diff.permissionKeysLost.map((key) => (
            <PermissionView permission={key} key={key} />
          ))}
        </div>
      </Block>
    ) : null}

    {diff.authorizedCirclesAdded.length || diff.authorizedCirclesRemoved.length ? (
      <Block compact={compact} title={t('Circles this app works with')}>
        <div className="flex flex-col gap-2">
          {diff.authorizedCirclesAdded.map((id) => (
            <p key={`add-${id}`}>
              <span className="text-green-600">+ </span>
              {circleName(id)}
            </p>
          ))}
          {diff.authorizedCirclesRemoved.map((id) => (
            <p key={`remove-${id}`} className="text-slate-400">
              <span className="text-red-600">- </span>
              {circleName(id)}
            </p>
          ))}
          {manifest.circleMemberPermissionGrant &&
          (manifest.circleMemberPermissionGrant.drives?.length ||
            manifest.circleMemberPermissionGrant.permissionSet?.keys?.length) ? (
            <div className="mt-3">
              <p className="mb-1 text-sm text-slate-400">
                {t('Members of these circles get, within this app')}:
              </p>
              <CircleGrantedDrives
                grants={manifest.circleMemberPermissionGrant.drives ?? []}
                driveName={driveName}
              />
              {manifest.circleMemberPermissionGrant.permissionSet?.keys?.length ? (
                <div className="mt-2">
                  <PermissionKeyList keys={manifest.circleMemberPermissionGrant.permissionSet.keys} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Block>
    ) : null}

    {isUpdate && (diff.drivesAlreadyOwned.length || diff.circlesAlreadyOwned.length) ? (
      <p className="my-5 text-sm text-slate-400">
        {t('Already owns')}:{' '}
        {[...diff.drivesAlreadyOwned.map((d) => d.name), ...diff.circlesAlreadyOwned.map((c) => c.name)].join(
          ', '
        )}
      </p>
    ) : null}
    </>
  );
};
