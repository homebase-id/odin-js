import {
  useCircles,
  t,
  ActionButton,
  LoadingBlock,
  CirclePermissionView,
} from '@homebase-id/common-app';
import { Exclamation, Check, Pencil } from '@homebase-id/common-app/icons';
import {
  getUniqueDrivesWithHighestPermission,
  stringGuidsEqual,
} from '@homebase-id/js-lib/helpers';
import AppMembershipView from '../../../components/PermissionViews/AppPermissionView/AppPermissionView';
import DrivePermissionView from '../../../components/PermissionViews/DrivePermissionView/DrivePermissionView';
import Section from '../../../components/ui/Sections/Section';
import { useApps } from '../../../hooks/apps/useApps';
import { AccessGrant } from '@homebase-id/js-lib/network';
import { CircleMembershipStatus } from '../../../provider/network/troubleshooting/ConnectionGrantProvider';

export const ConnectionPermissionViewer = ({
  accessGrant,
  grantStatus,
  className,
  openEditCircleMembership,
}: {
  accessGrant: AccessGrant;
  grantStatus?: CircleMembershipStatus;
  className?: string;
  openEditCircleMembership?: () => void;
}) => {
  const { data: circles, isLoading: circlesLoading } = useCircles().fetch;
  const { data: apps, isLoading: appsLoading } = useApps().fetchRegistered;

  const grantedCircles = circles?.filter((circle) =>
    accessGrant.circleGrants.some((circleGrant) =>
      stringGuidsEqual(circleGrant.circleId, circle.id)
    )
  );

  const grantedAppIs = accessGrant.appGrants ? Object.keys(accessGrant.appGrants) : [];
  const grantedApps = apps?.filter((app) =>
    app.authorizedCircles.some((authorizedCircle) =>
      grantedCircles?.some((grantedCircle) => stringGuidsEqual(authorizedCircle, grantedCircle.id))
    )
  );

  const grantedDrives = [
    ...(grantedCircles?.flatMap((circle) => circle.driveGrants ?? []) ?? []),
    ...(grantedApps?.flatMap((app) => app.circleMemberPermissionSetGrantRequest.drives ?? []) ??
      []),
  ];

  const driveGrantsWithPermissionTree = getUniqueDrivesWithHighestPermission(grantedDrives)?.map(
    (drive) => {
      const viaCircles = grantedCircles?.filter((circle) =>
        circle.driveGrants?.some(
          (driveGrant) =>
            driveGrant.permissionedDrive.drive.alias === drive.permissionedDrive.drive.alias &&
            driveGrant.permissionedDrive.drive.type === drive.permissionedDrive.drive.type
        )
      );

      const viaApps = grantedApps?.filter((app) =>
        app.circleMemberPermissionSetGrantRequest.drives?.some(
          (driveGrant) =>
            driveGrant.permissionedDrive.drive.alias === drive.permissionedDrive.drive.alias &&
            driveGrant.permissionedDrive.drive.type === drive.permissionedDrive.drive.type
        )
      );

      const circleNames = viaCircles?.map((circle) => circle.name) ?? [];
      const appNames = viaApps?.map((app) => app.name) ?? [];

      return { driveGrant: drive, permissionTree: [...circleNames, ...appNames].join(', ') };
    }
  );

  return (
    <div className={className}>
      {grantedCircles?.length || circlesLoading ? (
        <Section
          title={t('Member of the following circles')}
          actions={<ActionButton onClick={openEditCircleMembership} type="mute" icon={Pencil} />}
        >
          {circlesLoading ? (
            <>
              <LoadingBlock className="mb-4 h-4 max-w-xs" />
              <LoadingBlock className="mb-4 h-4 max-w-xs" />
              <LoadingBlock className="mb-4 h-4 max-w-xs" />
            </>
          ) : (
            <>
              <div className="flex flex-col gap-4">
                {grantedCircles?.map((grantedCircle) => {
                  const grantStatusForCircle = grantStatus?.circles.find((circle) =>
                    stringGuidsEqual(circle.circleDefinitionId, grantedCircle.id)
                  );

                  const invalidPermissionKeys =
                    grantStatusForCircle?.analysis?.permissionKeysAreValid !== undefined
                      ? !grantStatusForCircle.analysis.permissionKeysAreValid
                      : false;

                  const missingDriveGrant =
                    grantStatusForCircle?.analysis?.driveGrantAnalysis !== undefined &&
                    grantedCircle.driveGrants !== undefined
                      ? grantStatusForCircle?.circleDefinitionDriveGrantCount !==
                        grantedCircle.driveGrants?.length
                      : false;

                  const invalidDriveGrant =
                    grantStatusForCircle?.analysis?.driveGrantAnalysis?.some(
                      (grant) => !grant.driveGrantIsValid
                    );

                  return (
                    <div
                      key={grantedCircle.id}
                      className="flex flex-row items-center justify-between"
                    >
                      <CirclePermissionView circleDef={grantedCircle} />
                      {invalidPermissionKeys || missingDriveGrant || invalidDriveGrant ? (
                        <div className="flex flex-row items-center gap-1">
                          <Exclamation className="h-4 w-4 text-red-500" />
                          <p className="text-sm text-red-500">
                            {invalidPermissionKeys
                              ? t('Invalid permission keys')
                              : missingDriveGrant
                                ? t('Missing drive grant')
                                : invalidDriveGrant
                                  ? t('Invalid drive grant')
                                  : ''}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-row items-center gap-1 opacity-50">
                          <Check className="h-4 w-4 " />
                          <p className="text-sm">{t('Validated')}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Section>
      ) : null}

      {grantedApps?.length || appsLoading ? (
        <Section title={t('Can use the following apps')}>
          <div className="flex flex-col gap-6">
            {grantedApps?.map((app) => {
              const invalidAppGrant = !grantedAppIs.some((appId) =>
                stringGuidsEqual(appId, app.appId)
              );
              return (
                <div
                  className="flex flex-row items-center justify-between gap-1"
                  key={`${app.appId}`}
                >
                  <AppMembershipView appDef={app} />
                  {invalidAppGrant ? (
                    <div className="flex flex-row items-center gap-1">
                      <Exclamation className="h-4 w-4 text-red-500" />
                      <p className="text-sm text-red-500">{t('Missing app grant')}</p>
                    </div>
                  ) : (
                    <div className="flex flex-row items-center gap-1 opacity-50">
                      <Check className="h-4 w-4 " />
                      <p className="text-sm">{t('Validated')}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      ) : null}

      {driveGrantsWithPermissionTree?.length ? (
        <Section title={t('Access on the following drives')}>
          <div className="flex flex-col gap-6">
            {driveGrantsWithPermissionTree.map((grantsWithCircle) => {
              return (
                <DrivePermissionView
                  key={`${grantsWithCircle.driveGrant.permissionedDrive.drive.alias}-${grantsWithCircle.driveGrant.permissionedDrive.drive.type}`}
                  driveGrant={grantsWithCircle.driveGrant}
                  permissionTree={grantsWithCircle.permissionTree}
                />
              );
            })}
          </div>
        </Section>
      ) : null}
    </div>
  );
};
