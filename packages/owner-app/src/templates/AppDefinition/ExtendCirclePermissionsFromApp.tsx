import { useSearchParams } from 'react-router-dom';
import {
  ActionButton,
  CirclePermissionView,
  ErrorNotification,
  t,
  useCircle,
  useCircles,
} from '@homebase-id/common-app';
import { Arrow } from '@homebase-id/common-app/icons';
import Section from '../../components/ui/Sections/Section';
import DrivePermissionRequestView from '../../components/PermissionViews/DrivePermissionRequestView/DrivePermissionRequestView';
import { useApp } from '../../hooks/apps/useApp';
import { drivesParamToDriveGrantRequest } from './RegisterApp';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { DriveGrant } from '@homebase-id/js-lib/network';
import { useEffect } from 'react';

const ExtendCirclePermissionsFromApp = () => {
  // Read the queryString
  const [searchParams] = useSearchParams();

  const appId = searchParams.get('appId');
  const returnUrl = searchParams.get('return');

  const c = searchParams.get('c');
  const circleIds = c ? circleToCircleIds(c) : undefined;

  const cd = searchParams.get('cd');
  const circleDriveGrants = cd ? drivesParamToDriveGrantRequest(cd) : undefined;

  const {
    fetch: { data: appRegistration },
  } = useApp({ appId: appId || undefined });

  const { data: circles } = useCircles().fetch;
  const applicableCircles = circles?.filter((circle) =>
    circleIds?.some((circleId) => stringGuidsEqual(circleId, circle.id))
  );
  const { mutateAsync: updateCircle, error: updateError } = useCircle({}).createOrUpdate;

  const doUpdateCirclePermissions = async () => {
    if (!appRegistration || !appRegistration?.appId) throw new Error('App registration not found');
    if (!applicableCircles) throw new Error('No applicable circles not found');

    await Promise.all(
      applicableCircles.map(async (circle) => {
        const newReducedCircleGrants = [
          ...(circle.driveGrants || []),
          ...(circleDriveGrants || []),
        ].reduce((acc, grant) => {
          const existingGrant = acc.find(
            (g) =>
              stringGuidsEqual(
                g.permissionedDrive.drive.alias,
                grant.permissionedDrive.drive.alias
              ) &&
              stringGuidsEqual(g.permissionedDrive.drive.type, grant.permissionedDrive.drive.type)
          );

          if (existingGrant) {
            // If both have only one permission, take the highest one as they are probably combined bits
            if (
              existingGrant.permissionedDrive.permission.length === 1 &&
              grant.permissionedDrive.permission.length === 1
            ) {
              existingGrant.permissionedDrive.permission = [
                Math.max(
                  existingGrant.permissionedDrive.permission[0],
                  grant.permissionedDrive.permission[0]
                ),
              ];
            } else {
              existingGrant.permissionedDrive.permission = [
                ...new Set([
                  ...existingGrant.permissionedDrive.permission,
                  ...grant.permissionedDrive.permission,
                ]),
              ];
            }
          } else {
            acc.push(grant);
          }

          return acc;
        }, [] as DriveGrant[]);

        return await updateCircle({
          ...circle,
          driveGrants: newReducedCircleGrants,
        });
      })
    );

    doRedirectBack();
  };

  const doRedirectBack = async () => {
    // Redirect
    window.location.href = returnUrl || '/';
  };

  useEffect(() => {
    // Check if the circles already have the permissions:
    if (applicableCircles?.length && circleDriveGrants?.length) {
      const isSomeCircleMissingThePermission = applicableCircles.some((circle) => {
        const isSomeDriveGrantMissing = circleDriveGrants?.some((driveGrant) => {
          const hasPermissions = circle.driveGrants?.some(
            (existinGrant) =>
              stringGuidsEqual(
                existinGrant.permissionedDrive.drive.alias,
                driveGrant.permissionedDrive.drive.alias
              ) &&
              stringGuidsEqual(
                existinGrant.permissionedDrive.drive.type,
                driveGrant.permissionedDrive.drive.type
              ) &&
              (existinGrant.permissionedDrive.permission.every((perm) =>
                driveGrant.permissionedDrive.permission.includes(perm)
              ) ||
                existinGrant.permissionedDrive.permission.reduce((acc, perm) => acc + perm, 0) ===
                  driveGrant.permissionedDrive.permission.reduce((acc, perm) => acc + perm, 0))
          );
          if (!hasPermissions) return true;
        });

        if (isSomeDriveGrantMissing) return true;
      });

      if (!isSomeCircleMissingThePermission) {
        doRedirectBack();
      }
    }
  }, [circles]);

  return (
    <>
      <ErrorNotification error={updateError} />
      <section className="my-20">
        <div className="container mx-auto">
          <div className="max-w-[35rem]">
            <h1 className="mb-5 text-4xl dark:text-white">
              {t('Request from app')}:<small className="block">{appRegistration?.name}</small>
            </h1>

            <p>
              {t('The app')} &quot;{appRegistration?.name}&quot;{' '}
              {t('has requested extra access for your circles')}.
            </p>

            {applicableCircles?.length ? (
              <>
                <p className="mt-5">{t('These circles:')}</p>
                <Section>
                  <>
                    {applicableCircles.map((circleDef) => {
                      if (!circleDef) return null;
                      return <CirclePermissionView circleDef={circleDef} key={circleDef.id} />;
                    })}
                  </>
                </Section>
              </>
            ) : null}

            {circleDriveGrants?.length ? (
              <>
                <p>{t('Will receive the following drive access:')}</p>
                <Section>
                  <div className="flex flex-col gap-4">
                    {circleDriveGrants.map((grant) => (
                      <DrivePermissionRequestView
                        key={`${grant.permissionedDrive.drive.alias}-${grant.permissionedDrive.drive.type}`}
                        driveGrant={grant}
                      />
                    ))}
                  </div>
                </Section>
              </>
            ) : null}

            <div className="flex flex-col items-center gap-2 sm:flex-row-reverse">
              <ActionButton onClick={doUpdateCirclePermissions} type="primary" icon={Arrow}>
                {t('Allow')}
              </ActionButton>

              <ActionButton type="secondary" onClick={doRedirectBack}>
                {t('Cancel')}
              </ActionButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ExtendCirclePermissionsFromApp;

export const circleToCircleIds = (queryParamVal: string | undefined): string[] => {
  return queryParamVal?.split(',') || [];
};
