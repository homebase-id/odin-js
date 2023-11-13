import {
  useCircles,
  t,
  ActionButton,
  Pencil,
  LoadingBlock,
  CirclePermissionView,
} from '@youfoundation/common-app';
import {
  getUniqueDrivesWithHighestPermission,
  stringGuidsEqual,
} from '@youfoundation/js-lib/helpers';
import AppMembershipView from '../../../components/PermissionViews/AppPermissionView/AppPermissionView';
import DrivePermissionView from '../../../components/PermissionViews/DrivePermissionView/DrivePermissionView';
import Section from '../../../components/ui/Sections/Section';
import { useApps } from '../../../hooks/apps/useApps';
import { AccessGrant } from '@youfoundation/js-lib/network';

export const ConnectionPermissionViewer = ({
  accessGrant,
  className,
  openEditCircleMembership,
}: {
  accessGrant: AccessGrant;
  className?: string;
  openEditCircleMembership?: () => void;
}) => {
  const { data: circles, isLoading: circlesLoading } = useCircles().fetch;
  const { data: apps, isLoading: appsLoading } = useApps().fetchRegistered;

  const grantedCircles = circles?.filter((circle) =>
    accessGrant.circleGrants.some((circleGrant) => circleGrant.circleId === circle.id)
  );

  const grantedAppIs = accessGrant.appGrants ? Object.keys(accessGrant.appGrants) : [];
  const grantedApps = apps?.filter((app) =>
    grantedAppIs.some((appId) => stringGuidsEqual(appId, app.appId))
  );

  const grantedDrives = [
    ...(grantedCircles?.flatMap((circle) => circle.driveGrants ?? []) ?? []),
    ...(grantedApps?.flatMap((app) => app.circleMemberPermissionSetGrantRequest.drives ?? []) ??
      []),
  ];

  const driveGrantsWithPermissionTree = getUniqueDrivesWithHighestPermission(grantedDrives)?.map(
    (drive) => {
      const viaCircles = grantedCircles?.filter(
        (circle) =>
          circle.driveGrants?.some(
            (driveGrant) =>
              driveGrant.permissionedDrive.drive.alias === drive.permissionedDrive.drive.alias &&
              driveGrant.permissionedDrive.drive.type === drive.permissionedDrive.drive.type
          )
      );

      const viaApps = grantedApps?.filter(
        (app) =>
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
              <div className="-my-4">
                {grantedCircles?.map((grantedCircle) => (
                  <CirclePermissionView
                    circleDef={grantedCircle}
                    key={grantedCircle.id}
                    className="my-4"
                  />
                ))}
              </div>
            </>
          )}
        </Section>
      ) : null}

      {grantedApps?.length || appsLoading ? (
        <Section title={t('Can use the following apps')}>
          <div className="-my-6">
            {grantedApps?.map((app) => {
              return <AppMembershipView key={`${app.appId}`} appDef={app} className="my-6" />;
            })}
          </div>
        </Section>
      ) : null}

      {driveGrantsWithPermissionTree?.length ? (
        <Section title={t('Access on the following drives')}>
          <div className="-my-6">
            {driveGrantsWithPermissionTree.map((grantsWithCircle) => {
              return (
                <DrivePermissionView
                  key={`${grantsWithCircle.driveGrant.permissionedDrive.drive.alias}-${grantsWithCircle.driveGrant.permissionedDrive.drive.type}`}
                  driveGrant={grantsWithCircle.driveGrant}
                  permissionTree={grantsWithCircle.permissionTree}
                  className="my-6"
                />
              );
            })}
          </div>
        </Section>
      ) : null}
    </div>
  );
};
