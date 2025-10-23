import { useSearchParams } from 'react-router-dom';
import {
  ActionButton,
  CirclePermissionView,
  ErrorNotification,
  mergeStates,
  t,
  useCircles,
} from '@homebase-id/common-app';
import { Arrow } from '@homebase-id/common-app/icons';
import Section from '../../components/ui/Sections/Section';
import DrivePermissionRequestView from '../../components/PermissionViews/DrivePermissionRequestView/DrivePermissionRequestView';
import { useApp } from '../../hooks/apps/useApp';
import { useDrives } from '../../hooks/drives/useDrives';
import { useState } from 'react';
import {
  circleToCircleIds,
  drivesParamToDriveGrantRequest,
  permissionParamToPermissionSet,
} from './util';
import PermissionView from '../../components/PermissionViews/PermissionView/PermissionView';
import { drivesEqual, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useDrive } from '../../hooks/drives/useDrive';

export const ExtendAppPermissions = () => {
  // Read the queryString
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<unknown | undefined>();

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
    extendPermissions: { mutateAsync: extendPermission, status: extendPermissionStatus },
    updateAuthorizedCircles: { mutateAsync: updateCircles, status: updateCirclesState },
  } = useApp({ appId: appId || undefined });

  const { data: circles } = useCircles().fetch;

  const { mutateAsync: setAttributes, status: setAttributesStatus } = useDrive().editAttributes;

  const doUpdateApp = async () => {
    try {
      if (!appRegistration || !appRegistration?.appId)
        throw new Error('App registration not found');

      // start with permissions so new drives are created before extending circles
      await extendPermission({
        ...appRegistration,
        appId: appRegistration.appId,
        permissionSet: {
          keys: [
            ...(appRegistration?.grant.permissionSet?.keys || []),
            ...(permissionSet?.keys || []),
          ],
        },
        drives: [
          ...(appRegistration?.grant?.driveGrants.filter(
            (existingGrant) =>
              !driveGrants?.some((grant) =>
                drivesEqual(grant.permissionedDrive.drive, existingGrant.permissionedDrive.drive)
              )
          ) || []),
          ...(driveGrants || []),
        ],
      });

      if (circleIds?.length || circlePermissionSet?.keys?.length || circleDriveGrants?.length)
        await updateCircles({
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
                ...(appRegistration.circleMemberPermissionSetGrantRequest?.permissionSet?.keys ||
                  []),
                ...(circlePermissionSet?.keys || []),
              ],
            },
          },
          circleIds: [...(appRegistration?.authorizedCircles || []), ...(circleIds || [])],
        });

      if (driveGrants) {
        await Promise.all(
          driveGrants.map(async (grant) => {
            if (!grant.driveMeta?.attributes) return;

            return await setAttributes({
              targetDrive: grant.permissionedDrive.drive,
              newAttributes: grant.driveMeta?.attributes,
            });
          })
        );
      }

      window.location.href = returnUrl || '/';
    } catch (error) {
      setError(error);
    }
  };

  const doCancel = async () => {
    // Redirect
    window.location.href = returnUrl || '/';
  };

  const { data: existingDrives } = useDrives().fetch;
  const extensionGrantsOnExistingDrives = driveGrants?.filter((grant) =>
    existingDrives?.some((drive) =>
      drivesEqual(drive.targetDriveInfo, grant.permissionedDrive.drive)
    )
  );

  const newDrives = driveGrants?.filter(
    (grant) =>
      !existingDrives?.some((drive) =>
        drivesEqual(drive.targetDriveInfo, grant.permissionedDrive.drive)
      )
  );

  return (
    <>
      <ErrorNotification error={error} />
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

            {permissionSet?.keys.length ? (
              <Section>
                <div className="flex flex-col gap-4">
                  {permissionSet.keys.map((permissionLevel) => (
                    <PermissionView key={`${permissionLevel}`} permission={permissionLevel} />
                  ))}
                </div>
              </Section>
            ) : null}

            {extensionGrantsOnExistingDrives?.length ? (
              <Section>
                <div className="flex flex-col gap-4">
                  {extensionGrantsOnExistingDrives.map((grant) => (
                    <DrivePermissionRequestView
                      key={`${grant.permissionedDrive.drive.alias}-${grant.permissionedDrive.drive.type}`}
                      driveGrant={grant}
                      existingGrant={appRegistration?.grant?.driveGrants?.find(
                        (existing) =>
                          stringGuidsEqual(
                            existing.permissionedDrive.drive.alias,
                            grant.permissionedDrive.drive.alias
                          ) &&
                          stringGuidsEqual(
                            existing.permissionedDrive.drive.type,
                            grant.permissionedDrive.drive.type
                          )
                      )}
                    />
                  ))}
                </div>
              </Section>
            ) : null}

            {newDrives?.length ? (
              <>
                <Section>
                  <div className="flex flex-col gap-4">
                    {newDrives.map((grant) => (
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
                  <div className="flex flex-col gap-4">
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
                        existingGrant={appRegistration?.circleMemberPermissionSetGrantRequest?.drives?.find(
                          (existing) =>
                            stringGuidsEqual(
                              existing.permissionedDrive.drive.alias,
                              grant.permissionedDrive.drive.alias
                            ) &&
                            stringGuidsEqual(
                              existing.permissionedDrive.drive.type,
                              grant.permissionedDrive.drive.type
                            )
                        )}
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
                state={mergeStates(
                  mergeStates(extendPermissionStatus, updateCirclesState),
                  setAttributesStatus
                )}
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
