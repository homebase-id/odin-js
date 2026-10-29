import { useSearchParams } from 'react-router-dom';
import {
  ActionButton,
  CirclePermissionView,
  ErrorNotification,
  getDriveAdoptions,
  mergeStates,
  t,
  useCircles,
} from '@homebase-id/common-app';
import { isAxiosError } from 'axios';
import { Arrow, Chevron } from '@homebase-id/common-app/icons';
import Section from '../../components/ui/Sections/Section';
import DrivePermissionRequestView from '../../components/PermissionViews/DrivePermissionRequestView/DrivePermissionRequestView';
import { useApp, ZkPasswordNeededError } from '../../hooks/apps/useApp';
import { ZkPasswordField } from './ZkPasswordField';
import { useDrives } from '../../hooks/drives/useDrives';
import { useDrive } from '../../hooks/drives/useDrive';
import { useState } from 'react';
import {
  circleToCircleIds,
  drivesParamToDriveGrantRequest,
  drivesParamProblems,
  permissionParamToPermissionSet,
} from './util';
import PermissionView from '../../components/PermissionViews/PermissionView/PermissionView';
import { drivesEqual, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { InvalidAppRequest } from './InvalidAppRequest';

export const ExtendAppPermissions = () => {
  // Read the queryString
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<unknown | undefined>();
  const [adoptionError, setAdoptionError] = useState<unknown | undefined>();

  const appId = searchParams.get('appId');
  const returnUrl = searchParams.get('return');

  const p = searchParams.get('p');
  const permissionSet = p ? permissionParamToPermissionSet(p) : undefined;
  const d = searchParams.get('d');
  // Empty array when the param is absent, undefined when it is malformed -- a grant missing its
  // drive type slug, say. See drivesParamToDriveGrantRequest.
  const driveGrants = drivesParamToDriveGrantRequest(d || undefined);

  const c = searchParams.get('c');
  const circleIds = c ? circleToCircleIds(c) : undefined;

  const cp = searchParams.get('cp');
  const circlePermissionSet = cp ? permissionParamToPermissionSet(cp) : undefined;
  const cd = searchParams.get('cd');
  const circleDriveGrants = drivesParamToDriveGrantRequest(cd || undefined);

  const isBadRequest = !driveGrants || !circleDriveGrants;

  const {
    fetch: { data: appRegistration },
    extendPermissions: { mutateAsync: extendPermission, status: extendPermissionStatus },
    updateAuthorizedCircles: { mutateAsync: updateCircles, status: updateCirclesState },
    applyDriveChanges: { mutateAsync: applyDriveChanges, status: applyDriveChangesStatus },
  } = useApp({ appId: appId || undefined });

  const { data: circles } = useCircles().fetch;
  const {
    setOwningApp: { mutateAsync: setOwningApp },
  } = useDrive();

  const [password, setPassword] = useState<string>();
  // A drive the app asked for private needs the password when this session holds no zero-knowledge key
  const needsPassword = error instanceof ZkPasswordNeededError;

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
        password,
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

      if (driveGrants) await applyDriveChanges(driveGrants);

      // Last, and kept apart: a refused hand-over (its slug already taken, say) leaves the access
      // granted above in place, and the owner reads why before going back.
      for (const { drive, driveSlug, driveTypeSlug } of adoptions) {
        try {
          await setOwningApp({
            targetDrive: drive.targetDriveInfo,
            appId: appRegistration.appId,
            driveSlug,
            driveTypeSlug,
          });
        } catch (adoptError) {
          setAdoptionError(adoptError);
          return;
        }
      }

      doRedirectBack();
    } catch (error) {
      setError(error);
    }
  };

  const doRedirectBack = () => {
    window.location.href = returnUrl || '/';
  };

  const doCancel = async () => {
    const url = new URL(returnUrl || '/', window.location.origin);
    url.searchParams.set('status', 'canceled');
    window.location.href = url.toString();
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

  // Requested drives that no app owns yet: approving hands them to this app, at the address it asks for.
  const adoptions = getDriveAdoptions(appRegistration?.appId, driveGrants ?? [], existingDrives);

  // Checked after the hooks so the hook order never changes; the app built this URL, so a malformed
  // one is its bug, but dropping a drive from the prompt would grant less than was asked for.
  if (isBadRequest)
    return (
      <InvalidAppRequest
        appName={appRegistration?.name}
        problems={[
          ...drivesParamProblems(d || undefined, 'd'),
          ...drivesParamProblems(cd || undefined, 'cd'),
        ]}
        returnUrl={returnUrl}
      />
    );

  return (
    <>
      <ErrorNotification error={needsPassword ? undefined : error} />
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

            {adoptions.map(({ drive, driveSlug }) => (
              <p
                key={`${drive.targetDriveInfo.alias}-${drive.targetDriveInfo.type}`}
                className="my-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950"
              >
                {t('{0} will own the drive "{1}"', appRegistration?.name ?? '', drive.name)}
                {appRegistration?.appSlug ? (
                  <>
                    {' '}
                    ({t('address')}{' '}
                    <span className="font-mono">
                      /apps/{appRegistration.appSlug}/drives/{driveSlug}
                    </span>
                    )
                  </>
                ) : null}
                . {t("This can't be undone from here.")}
              </p>
            ))}

            {adoptionError ? (
              <p className="my-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm dark:border-red-800 dark:bg-red-950">
                {t('The drive could not be handed to the app')}:{' '}
                {(isAxiosError(adoptionError) && adoptionError.response?.data?.title) ||
                  t('Something went wrong, please try again later')}
                . {t('The rest of the request was approved.')}
              </p>
            ) : null}

            {needsPassword ? <ZkPasswordField onChange={setPassword} /> : null}

            <div className="flex flex-col items-center gap-2 sm:flex-row-reverse">
              {adoptionError ? (
                <ActionButton onClick={doRedirectBack} type="primary" icon={Arrow}>
                  {t('Continue')}
                </ActionButton>
              ) : (
                <>
                  <ActionButton
                    onClick={doUpdateApp}
                    type="primary"
                    state={mergeStates(
                      mergeStates(extendPermissionStatus, updateCirclesState),
                      applyDriveChangesStatus
                    )}
                    icon={Arrow}
                  >
                    {t('Allow')}
                  </ActionButton>

                  <ActionButton type="secondary" onClick={() => doCancel()}>
                    {t('Cancel')}
                  </ActionButton>
                </>
              )}
            </div>

            <details className="mt-6 group my-6 rounded-lg border bg-white dark:border-slate-800 dark:bg-black">
              <summary className="flex cursor-pointer list-none flex-row items-center px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                <span className="mr-auto">{t('Show details')}</span>
                <Chevron className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>

              <div className="border-t px-4 py-4 dark:border-slate-800">
                <p>
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
                          showRequestedChanges={true}
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
                    <p>
                      {t('Requests circles that can interact to have the following access within')}
                    </p>
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
                    <p>
                      {t('Requests circles that can interact to have the following drive access')}
                    </p>
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
              </div>
            </details>
          </div>
        </div>
      </section>
    </>
  );
};
