import { useSearchParams } from 'react-router-dom';
import { ActionButton, ErrorNotification, t } from '@homebase-id/common-app';
import { Arrow } from '@homebase-id/common-app/icons';
import Section from '../../components/ui/Sections/Section';
import DrivePermissionRequestView from '../../components/PermissionViews/DrivePermissionRequestView/DrivePermissionRequestView';
import { useApp } from '../../hooks/apps/useApp';
import { useDrive } from '../../hooks/drives/useDrive';
import { drivesParamToDriveGrantRequest } from './util';

const UpdateDriveDetailsFromApp = () => {
  // Read the queryString
  const [searchParams] = useSearchParams();

  const appId = searchParams.get('appId');
  const returnUrl = searchParams.get('return');

  const d = searchParams.get('d');
  // Empty array when the param is absent, undefined when it is malformed -- a grant missing its
  // drive type slug, say. See drivesParamToDriveGrantRequest.
  const driveGrants = drivesParamToDriveGrantRequest(d || undefined);

  const {
    fetch: { data: appRegistration },
  } = useApp({ appId: appId || undefined });

  const {
    mutateAsync: setAttributes,
    status: setAttributesStatus,
    error: setAttributesError,
  } = useDrive().editAttributes;

  const doUpdateDriveDetails = async () => {
    if (!appRegistration || !appRegistration?.appId) throw new Error('App registration not found');
    if (!driveGrants) throw new Error('No drive grants found');

    try {
      await Promise.all(
        driveGrants.map(async (grant) => {
          if (!grant.driveMeta?.attributes) return;

          return await setAttributes({
            targetDrive: grant.permissionedDrive.drive,
            newAttributes: grant.driveMeta?.attributes,
          });
        })
      );
    } catch (error) {
      console.error('Error updating drive attributes', error);
    }

    doRedirectBack();
  };

  const doRedirectBack = async () => {
    // Redirect
    window.location.href = returnUrl || '/';
  };

  // Checked after the hooks so the hook order never changes; the app built this URL, so a malformed
  // one is its bug, but dropping a drive from the prompt would change less than was asked for.
  if (!driveGrants) return <div>Bad request</div>;

  return (
    <>
      <ErrorNotification error={setAttributesError} />
      <section className="my-20">
        <div className="container mx-auto">
          <div className="max-w-[35rem]">
            <h1 className="mb-5 text-4xl dark:text-white">
              {t('Request from app')}:<small className="block">{appRegistration?.name}</small>
            </h1>

            <p>
              {t('The app')} &quot;{appRegistration?.name}&quot;{' '}
              {t('has requested extra settings on your drives')}.
            </p>

            {driveGrants?.length ? (
              <>
                <Section>
                  <div className="flex flex-col gap-4">
                    {driveGrants.map((grant) => (
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
                onClick={doUpdateDriveDetails}
                state={setAttributesStatus}
                type="primary"
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

export default UpdateDriveDetailsFromApp;
