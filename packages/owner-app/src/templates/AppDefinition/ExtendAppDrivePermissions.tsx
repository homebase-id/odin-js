import { useSearchParams } from 'react-router-dom';
import { ActionButton, Arrow, t } from '@youfoundation/common-app';
import Section from '../../components/ui/Sections/Section';
import DrivePermissionRequestView from '../../components/PermissionViews/DrivePermissionRequestView/DrivePermissionRequestView';
import { useApp } from '../../hooks/apps/useApp';
import { useDrives } from '../../hooks/drives/useDrives';
import { useEffect } from 'react';
import { drivesParamToDriveGrantRequest } from './RegisterApp';

const ExtendAppDrivePermissions = () => {
  // Read the queryString
  const [searchParams] = useSearchParams();

  const appId = searchParams.get('appId');
  const returnUrl = searchParams.get('return');

  const d = searchParams.get('d');
  const driveGrants = d ? drivesParamToDriveGrantRequest(d) : undefined;

  const {
    fetch: { data: appRegistration },
    extendPermissions: { mutate: extendPermission, status: extendPermissionStatus },
  } = useApp({ appId: appId || undefined });

  const doUpdateApp = async () => {
    if (!appRegistration || !appRegistration?.appId) throw new Error('App registration not found');

    extendPermission({
      ...appRegistration,
      appId: appRegistration.appId,
      permissionSet: appRegistration?.grant.permissionSet || { keys: [] },
      drives: [...(appRegistration?.grant?.driveGrants || []), ...(driveGrants || [])],
    });
  };

  useEffect(() => {
    if (extendPermissionStatus === 'success') window.location.href = returnUrl || '/';
  }, [extendPermissionStatus]);

  const doCancel = async () => {
    // Redirect
    window.location.href = returnUrl || '/';
  };

  const { data: existingDrives } = useDrives().fetch;
  const existingDriveGrants = driveGrants?.filter(
    (grant) =>
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

            <div className="flex flex-col items-center gap-2 sm:flex-row-reverse">
              <ActionButton
                onClick={doUpdateApp}
                type="primary"
                state={extendPermissionStatus}
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

export default ExtendAppDrivePermissions;
