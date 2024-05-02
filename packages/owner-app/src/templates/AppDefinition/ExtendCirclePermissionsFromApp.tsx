import { useSearchParams } from 'react-router-dom';
import {
  ActionButton,
  Arrow,
  CirclePermissionView,
  ErrorNotification,
  t,
  useCircle,
  useCircles,
} from '@youfoundation/common-app';
import Section from '../../components/ui/Sections/Section';
import DrivePermissionRequestView from '../../components/PermissionViews/DrivePermissionRequestView/DrivePermissionRequestView';
import { useApp } from '../../hooks/apps/useApp';
import { drivesParamToDriveGrantRequest } from './RegisterApp';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { DriveGrant } from '@youfoundation/js-lib/network';
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
        let newCircleGrants: DriveGrant[] = circle.driveGrants || [];

        circleDriveGrants?.forEach(async (newGrant) => {
          const existinGrant = circle.driveGrants?.find(
            (grant) =>
              stringGuidsEqual(
                grant.permissionedDrive.drive.alias,
                newGrant.permissionedDrive.drive.alias
              ) &&
              stringGuidsEqual(
                grant.permissionedDrive.drive.type,
                newGrant.permissionedDrive.drive.type
              )
          );

          if (!existinGrant) {
            newCircleGrants.push(newGrant);
          } else {
            newCircleGrants = newCircleGrants.map((grant) =>
              grant === existinGrant
                ? {
                    permissionedDrive: {
                      drive: newGrant.permissionedDrive.drive,
                      permission: [
                        // ...existinGrant.permissionedDrive.permission,
                        ...newGrant.permissionedDrive.permission,
                      ],
                    },
                  }
                : grant
            );
          }
        });

        return await updateCircle({
          ...circle,
          driveGrants: newCircleGrants,
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
            {/* <p className="mt-2">
              {t('By allowing this, the circles listed below')} &quot;{appRegistration?.name}&quot;{' '}
              {t('will receive the following extra access on your identity')}:
            </p> */}

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
              <ActionButton
                onClick={doUpdateCirclePermissions}
                type="primary"
                // state={mergeStates(extendPermissionStatus, extendPermissionStatus)}
                icon={Arrow}
              >
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
