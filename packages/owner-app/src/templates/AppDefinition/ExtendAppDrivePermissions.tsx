import { useSearchParams } from 'react-router-dom';
import {
  ActionButton,
  CirclePermissionView,
  ErrorNotification,
  mergeStates,
  t,
  useCircles,
} from '@youfoundation/common-app';
import { Arrow } from '@youfoundation/common-app/icons';
import Section from '../../components/ui/Sections/Section';
import DrivePermissionRequestView from '../../components/PermissionViews/DrivePermissionRequestView/DrivePermissionRequestView';
import { useApp } from '../../hooks/apps/useApp';
import { useDrives } from '../../hooks/drives/useDrives';
import { useEffect } from 'react';
import { drivesParamToDriveGrantRequest, permissionParamToPermissionSet } from './RegisterApp';
import PermissionView from '../../components/PermissionViews/PermissionView/PermissionView';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

const ExtendAppPermissions = () => {
  // Read the queryString
  const [searchParams] = useSearchParams();

  const appId = searchParams.get('appId');
  const returnUrl = searchParams.get('return');

  const p = searchParams.get('p');
  const permissionSet = p ? permissionParamToPermissionSet(p) : undefined;
  const d = searchParams.get('d');
  const driveGrants = d ? drivesParamToDriveGrantRequest(d) : undefined;

  const c = searchParams.get('c');
  const circleIds = c ? circleToCircleIds(c) : undefined;

  const cp = searchParams.get('cp');
  const circlePermissionSet = cp ? permissionParamToPermissionSet(cp) : undefined;
  const cd = searchParams.get('cd');
  const circleDriveGrants = cd ? drivesParamToDriveGrantRequest(cd) : undefined;

  const {
    fetch: { data: appRegistration },
    extendPermissions: {
      mutate: extendPermission,
      status: extendPermissionStatus,
      error: extendPermissionError,
    },
    updateAuthorizedCircles: {
      mutate: updateCircles,
      status: updateCirclesState,
      error: updateCirclesError,
    },
  } = useApp({ appId: appId || undefined });

  const { data: circles } = useCircles().fetch;

  const doUpdateApp = async () => {
    if (!appRegistration || !appRegistration?.appId) throw new Error('App registration not found');

    if (circleIds?.length || circlePermissionSet?.keys?.length || circleDriveGrants?.length)
      updateCircles({
        appId: appRegistration.appId,
        circleMemberPermissionGrant: {
          drives: [
            ...(appRegistration.circleMemberPermissionSetGrantRequest?.drives?.filter(
              (existingGrant) =>
                !circleDriveGrants?.some(
                  (grant) =>
                    stringGuidsEqual(
                      grant.permissionedDrive.drive.alias,
                      existingGrant.permissionedDrive.drive.alias
                    ) &&
                    stringGuidsEqual(
                      grant.permissionedDrive.drive.type,
                      existingGrant.permissionedDrive.drive.type
                    )
                )
            ) || []),
            ...(circleDriveGrants || []),
          ],
          permissionSet: {
            keys: [
              ...(appRegistration.circleMemberPermissionSetGrantRequest?.permissionSet?.keys || []),
              ...(circlePermissionSet?.keys || []),
            ],
          },
        },
        circleIds: [...(appRegistration?.authorizedCircles || []), ...(circleIds || [])],
      });

    extendPermission({
      ...appRegistration,
      appId: appRegistration.appId,
      permissionSet: {
        keys: [
          ...(appRegistration?.grant.permissionSet.keys || []),
          ...(permissionSet?.keys || []),
        ],
      },
      drives: [
        ...(appRegistration?.grant?.driveGrants.filter(
          (existingGrant) =>
            !driveGrants?.some(
              (grant) =>
                stringGuidsEqual(
                  grant.permissionedDrive.drive.alias,
                  existingGrant.permissionedDrive.drive.alias
                ) &&
                stringGuidsEqual(
                  grant.permissionedDrive.drive.type,
                  existingGrant.permissionedDrive.drive.type
                )
            )
        ) || []),
        ...(driveGrants || []),
      ],
    });
  };

  useEffect(() => {
    if (
      extendPermissionStatus === 'success' &&
      (!circleIds?.length || updateCirclesState === 'success')
    )
      window.location.href = returnUrl || '/';
  }, [extendPermissionStatus, updateCirclesState]);

  const doCancel = async () => {
    // Redirect
    window.location.href = returnUrl || '/';
  };

  const { data: existingDrives } = useDrives().fetch;
  const existingDriveGrants = driveGrants?.filter((grant) =>
    existingDrives?.some(
      (drive) =>
        drive.targetDriveInfo.alias === grant.permissionedDrive.drive.alias &&
        drive.targetDriveInfo.type === grant.permissionedDrive.drive.type
    )
  );

  const newDriveGrants = driveGrants?.filter(
    (grant) =>
      !existingDrives?.some(
        (drive) =>
          drive.targetDriveInfo.alias === grant.permissionedDrive.drive.alias &&
          drive.targetDriveInfo.type === grant.permissionedDrive.drive.type
      )
  );

  return (
    <>
      <ErrorNotification error={extendPermissionError || updateCirclesError} />
      <section className="my-20">
        <div className="container mx-auto">
          <div className="max-w-[35rem]">
            <h1 className="mb-5 text-4xl dark:text-white">
              {t('Update existing app')}:<small className="block">{appRegistration?.name}</small>
            </h1>

            <p>
              {t('The app')} &quot;{appRegistration?.name}&quot;{' '}
              {t('has requested extra access on your identity')}.
            </p>
            <p className="mt-2">
              {t('By allowing this, the app')} &quot;{appRegistration?.name}&quot;{' '}
              {t('will receive the following extra access on your identity')}:
            </p>

            <Section>
              {permissionSet?.keys.length ? (
                <div className="flex flex-col gap-4">
                  {permissionSet.keys.map((permissionLevel) => {
                    return (
                      <PermissionView key={`${permissionLevel}`} permission={permissionLevel} />
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-400">{t('No changes to existing permissions')}</p>
              )}
            </Section>

            <Section>
              {existingDriveGrants?.length ? (
                <div className="flex flex-col gap-4">
                  {existingDriveGrants.map((grant) => (
                    <DrivePermissionRequestView
                      key={`${grant.permissionedDrive.drive.alias}-${grant.permissionedDrive.drive.type}`}
                      driveGrant={grant}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">{t('No changes to existing drive access')}</p>
              )}
            </Section>

            {newDriveGrants?.length ? (
              <>
                <p>{t('Requests these new drives')}</p>
                <Section>
                  <div className="flex flex-col gap-4">
                    {newDriveGrants.map((grant) => (
                      <DrivePermissionRequestView
                        key={`${grant.permissionedDrive.drive.alias}-${grant.permissionedDrive.drive.type}`}
                        driveGrant={grant}
                      />
                    ))}
                  </div>
                </Section>
              </>
            ) : null}

            {circleIds?.length ? (
              <>
                <p>
                  {t(
                    'Requests these circles to interact with you via {0}',
                    appRegistration?.name || ''
                  )}
                </p>
                <Section>
                  <>
                    {circleIds.map((circleId) => {
                      const circleDef = circles?.find(
                        (circle) => circle.id && stringGuidsEqual(circle.id, circleId)
                      );
                      if (!circleId || !circleDef) return null;
                      return <CirclePermissionView circleDef={circleDef} key={circleId} />;
                    })}
                  </>
                </Section>
              </>
            ) : null}

            {circlePermissionSet?.keys?.length ? (
              <>
                <p>{t('Requests circles that can interact to have the following access within')}</p>
                <Section>
                  <div className="-my-4">
                    {circlePermissionSet.keys.map((permissionLevel) => (
                      <PermissionView key={`${permissionLevel}`} permission={permissionLevel} />
                    ))}
                  </div>
                </Section>
              </>
            ) : null}

            {circleDriveGrants?.length ? (
              <>
                <p>{t('Requests circles that can interact to have the following drive access')}</p>
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
                onClick={doUpdateApp}
                type="primary"
                state={mergeStates(extendPermissionStatus, extendPermissionStatus)}
                icon={Arrow}
              >
                {t('Allow')}
              </ActionButton>

              <ActionButton type="secondary" onClick={() => doCancel()}>
                {t('Cancel')}
              </ActionButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ExtendAppPermissions;

export const circleToCircleIds = (queryParamVal: string | undefined): string[] => {
  return queryParamVal?.split(',') || [];
};
