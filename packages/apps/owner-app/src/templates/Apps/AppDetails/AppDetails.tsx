import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../../hooks/apps/useApp';
import DrivePermissionView from '../../../components/PermissionViews/DrivePermissionView/DrivePermissionView';
import PermissionView from '../../../components/PermissionViews/PermissionView/PermissionView';
import Section, { SectionTitle } from '../../../components/ui/Sections/Section';
import { AppClientRegistration } from '../../../provider/app/AppManagementProviderTypes';
import { useState } from 'react';
import { useAppClients } from '../../../hooks/apps/useAppClients';
import { useDrives } from '../../../hooks/drives/useDrives';
import { drivesEqual, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { PageMeta } from '@homebase-id/common-app';
import CirclePermissionSelectorDialog from '../../../components/Apps/CirclePermissionSelectorDialog/CirclePermissionSelectorDialog';
import PermissionSelectorDialog from '../../../components/Apps/PermissionSelectorDialog/PermissionSelectorDialog';
import DrivePermissionSelectorDialog from '../../../components/Drives/DrivePermissionSelectorDialog/DrivePermissionSelectorDialog';
import {
  useCircles,
  t,
  ErrorNotification,
  ActionButton,
  Alert,
  CirclePermissionView,
} from '@homebase-id/common-app';
import { Grid, Refresh, Trash, Times, Pencil, HardDrive } from '@homebase-id/common-app/icons';
import { DriveGrant } from '@homebase-id/js-lib/network';

const AppDetails = () => {
  const { appKey } = useParams();
  const decodedAppKey = appKey ? decodeURIComponent(appKey) : undefined;
  const navigate = useNavigate();
  const {
    fetch: { data: app, isLoading: appLoading },
    revokeApp: { mutate: revokeApp, status: revokeAppStatus, error: revokeAppError },
    allowApp: { mutate: allowApp, status: allowAppStatus, error: allowAppError },
    removeApp: { mutateAsync: removeApp, status: removeAppStatus, error: removeAppError },
    updateAuthorizedCircles: {
      mutate: updateCircles,
      status: updateCirclesState,
      error: updateCirclesError,
    },
    updatePermissions: {
      mutate: updatePermissions,
      status: updatePermissionsState,
      error: updatePermissionsError,
    },
  } = useApp({ appId: decodedAppKey });

  const {
    fetch: { data: appClients },
  } = useAppClients({ appId: decodedAppKey });

  const { data: circles } = useCircles().fetch;
  const { data: drives } = useDrives().fetch;

  const [circleEditState, setCircleEditState] = useState<
    'circle' | 'permission' | 'drives' | undefined
  >();
  const [isPermissionEditOpen, setIsPermissionEditOpen] = useState(false);
  const [isDrivesEditOpen, setIsDrivesEditOpen] = useState(false);

  const permissionKeys = app?.grant.permissionSet?.keys?.reduce((acc: number[], key: number) => {
    if (!acc.includes(key)) acc.push(key);
    else console.warn('Duplicate permission key', key);
    return acc;
  }, []);

  const driveGrants = app?.grant.driveGrants?.reduce((acc: DriveGrant[], grant) => {
    if (
      !acc.some((drive) =>
        drivesEqual(drive.permissionedDrive.drive, grant.permissionedDrive.drive)
      )
    )
      acc.push(grant);
    else console.warn('Duplicate drive grant', grant);
    return acc;
  }, [] as DriveGrant[]);

  if (appLoading) <>Loading</>;
  if (!app || !decodedAppKey) return <>{t('No matching app found')}</>;

  return (
    <>
      <ErrorNotification error={allowAppError || revokeAppError || removeAppError} />
      <PageMeta
        icon={Grid}
        browserTitle={app.name}
        title={
          <span>
            {app.name}
            {app.corsHostName ? <small className="block text-sm">{app.corsHostName}</small> : null}
          </span>
        }
        breadCrumbs={[
          { href: '/owner/third-parties/apps', title: 'My apps' },
          { title: app.name ?? '' },
        ]}
        actions={
          <>
            {app.isRevoked ? (
              <>
                <ActionButton
                  type="primary"
                  className="my-auto"
                  onClick={() => allowApp({ appId: decodedAppKey })}
                  state={allowAppStatus}
                  icon={Refresh}
                  confirmOptions={{
                    type: 'info',
                    title: t('Restore App'),
                    buttonText: t('Restore'),
                    body: `${t('Are you sure you want to restore')} ${app.name} ${t(
                      'and allow access to your identity'
                    )}`,
                  }}
                >
                  {t('Restore app')}
                </ActionButton>
                <ActionButton
                  type="remove"
                  className="my-auto"
                  onClick={async () => {
                    await removeApp({ appId: decodedAppKey });
                    navigate('/owner/third-parties/apps');
                  }}
                  state={removeAppStatus}
                  icon={Trash}
                  confirmOptions={{
                    type: 'critical',
                    title: t('Remove App'),
                    buttonText: t('Remove'),
                    body: `${t('Are you sure you want to remove')} ${app.name}? ${t(
                      'It will no longer have access to your identity. The linked drives and data will remain.'
                    )}`,
                    trickQuestion: {
                      question: `${t('Fill in the name of the app')} (${app.name}) ${t(
                        'to confirm:'
                      )}`,
                      answer: app.name,
                    },
                  }}
                >
                  {t('Remove app')}
                </ActionButton>
              </>
            ) : (
              <ActionButton
                type="remove"
                className="my-auto"
                onClick={() => revokeApp({ appId: decodedAppKey })}
                state={revokeAppStatus}
                icon={Times}
                confirmOptions={{
                  type: 'warning',
                  title: t('Revoke App'),
                  buttonText: t('Revoke'),
                  body: `${t('Are you sure you want to revoke')} ${app.name} ${t(
                    'from all access to your identity'
                  )}`,
                }}
              >
                {t('Revoke app')}
              </ActionButton>
            )}
          </>
        }
      />

      {app.isRevoked && (
        <Alert type="critical" title={t('App is revoked')} className="mb-5">
          {t('This app is revoked, it no longer has the access provided')}
        </Alert>
      )}

      {appClients ? (
        <Section title={t('Devices')}>
          <div className="grid grid-flow-row gap-4">
            {appClients?.length ? (
              appClients.map((appClient, index) => (
                <ClientView
                  appId={app.appId}
                  appClient={appClient}
                  key={`${appClient.accessRegistrationId}_${index}`}
                />
              ))
            ) : (
              <p className="text-slate-400">{t('No devices currently logged in')}</p>
            )}
          </div>
        </Section>
      ) : null}

      <SectionTitle
        title={
          <>
            {t('App permissions:')}
            <small className="block text-sm text-slate-400">
              {t('This describes what the app is allowed to access')}
            </small>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-flow-col sm:grid-cols-2">
        <Section
          title={t('Permissions')}
          actions={
            <ActionButton type="mute" onClick={() => setIsPermissionEditOpen(true)} icon={Pencil} />
          }
        >
          {permissionKeys?.length ? (
            <div className="-my-4">
              {permissionKeys.map((permissionLevel) => {
                return (
                  <PermissionView
                    key={`${permissionLevel}`}
                    permission={permissionLevel}
                    className="my-4"
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-row">
              <p className="my-auto text-slate-400">
                {t("This app doesn't have any special permissions")}
              </p>
            </div>
          )}
        </Section>

        <Section
          title={t('Drives')}
          actions={
            <ActionButton type="mute" onClick={() => setIsDrivesEditOpen(true)} icon={Pencil} />
          }
        >
          {driveGrants?.length ? (
            <div className="-my-4">
              {driveGrants.map((grant) => {
                return (
                  <DrivePermissionView
                    key={`${grant?.permissionedDrive?.drive?.alias}-${grant?.permissionedDrive?.drive?.type}`}
                    driveGrant={grant}
                    className="my-4"
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-row">
              <p className="my-auto text-slate-400">{t("This app doesn't have any access")}</p>
            </div>
          )}
        </Section>
      </div>

      <SectionTitle
        title={
          <>
            {t('Circles')}
            <small className="block text-sm text-slate-400">
              {t(
                'This describes what the identities within these circles have unrestricted access to'
              )}
            </small>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-flow-col sm:grid-cols-3">
        <Section
          title={t('Enabled circles for this app')}
          actions={
            <ActionButton type="mute" onClick={() => setCircleEditState('circle')} icon={Pencil} />
          }
        >
          {app.authorizedCircles?.length ? (
            <ul className="-my-4">
              {app.authorizedCircles.map((circleId) => {
                const circleDef = circles?.find(
                  (circle) => circle.id && stringGuidsEqual(circle.id, circleId)
                );
                if (!circleId || !circleDef) return null;
                return (
                  <CirclePermissionView circleDef={circleDef} key={circleId} className="my-4" />
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-row">
              <p className="my-auto text-slate-400">{t("This app doesn't have any access")}</p>
            </div>
          )}
        </Section>
        <Section
          title={t('Drives')}
          actions={
            <ActionButton type="mute" onClick={() => setCircleEditState('drives')} icon={Pencil} />
          }
        >
          {app.circleMemberPermissionSetGrantRequest.drives?.length ? (
            <div className="-my-4">
              {app.circleMemberPermissionSetGrantRequest.drives.map((grant) => {
                return (
                  <DrivePermissionView
                    key={`${grant?.permissionedDrive?.drive?.alias}-${grant?.permissionedDrive?.drive?.type}`}
                    driveGrant={grant}
                    className="my-4"
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-row">
              <p className="my-auto text-slate-400">
                {t("This app doesn't have any drive access for circles")}
              </p>
            </div>
          )}
        </Section>
        <Section
          title={t('Permissions')}
          actions={
            <ActionButton
              type="mute"
              onClick={() => setCircleEditState('permission')}
              icon={Pencil}
            />
          }
        >
          {app.circleMemberPermissionSetGrantRequest.permissionSet?.keys?.length ? (
            <div className="-my-4">
              {app.circleMemberPermissionSetGrantRequest.permissionSet.keys.map(
                (permissionLevel) => {
                  return (
                    <PermissionView
                      key={`${permissionLevel}`}
                      permission={permissionLevel}
                      className="my-4"
                    />
                  );
                }
              )}
            </div>
          ) : (
            <div className="flex flex-row">
              <p className="my-auto text-slate-400">
                {t("This app doesn't have any special access for circles")}
              </p>
            </div>
          )}
        </Section>
      </div>

      <CirclePermissionSelectorDialog
        title={`${t('Edit circles within')} "${app.name}"`}
        circleIds={app.authorizedCircles}
        defaultValue={app.circleMemberPermissionSetGrantRequest}
        drives={
          drives?.filter((drive) =>
            app.grant.driveGrants.some(
              (grant) =>
                stringGuidsEqual(
                  grant.permissionedDrive.drive.alias,
                  drive.targetDriveInfo.alias
                ) &&
                stringGuidsEqual(grant.permissionedDrive.drive.type, drive.targetDriveInfo.type)
            )
          ) ?? []
        }
        error={updateCirclesError}
        confirmState={updateCirclesState}
        isOpen={!!circleEditState}
        hideCircleSelector={circleEditState !== 'circle'}
        hidePermissionSelector={circleEditState !== 'permission'}
        hideDriveSelector={circleEditState !== 'drives'}
        onCancel={() => setCircleEditState(undefined)}
        onConfirm={async (newCircleIds, permissionGrant) => {
          await updateCircles({
            appId: app.appId,
            circleIds: newCircleIds,
            circleMemberPermissionGrant: permissionGrant,
          });
          setCircleEditState(undefined);
        }}
      />
      <PermissionSelectorDialog
        title={`${t('Edit permissions')} "${app.name}"`}
        defaultValue={app.grant.permissionSet}
        error={updatePermissionsError}
        confirmState={updatePermissionsState}
        isOpen={isPermissionEditOpen}
        onCancel={() => setIsPermissionEditOpen(false)}
        onConfirm={async (newPermissionSet) => {
          await updatePermissions({
            appId: app.appId,
            permissionSet: newPermissionSet,
            drives: app.grant.driveGrants,
          });
          setIsPermissionEditOpen(false);
        }}
      />
      <DrivePermissionSelectorDialog
        title={`${t('Edit drive access by')} "${app.name}"`}
        defaultValue={app.grant.driveGrants}
        allowOwnerOnlyDrives={true}
        error={updatePermissionsError}
        confirmState={updatePermissionsState}
        isOpen={isDrivesEditOpen}
        onCancel={() => setIsDrivesEditOpen(false)}
        onConfirm={async (newDriveGrants) => {
          await updatePermissions({
            appId: app.appId,
            permissionSet: app.grant.permissionSet,
            drives: newDriveGrants,
          });
          setIsDrivesEditOpen(false);
        }}
      />
    </>
  );
};

const ClientView = ({
  appId,
  appClient,
  className,
}: {
  appId: string;
  appClient: AppClientRegistration;
  className?: string;
}) => {
  const {
    revokeClient: {
      mutateAsync: revokeClient,
      status: revokeClientStatus,
      reset: resetRevokeClient,
    },
    allowClient: { mutateAsync: allowClient, status: allowClientStatus, reset: resetAllowClient },
    removeClient: {
      mutateAsync: removeClient,
      status: removeClientStatus,
      reset: resetRemoveClient,
    },
  } = useAppClients({});

  return (
    <div
      className={`flex flex-row items-center ${
        appClient.isRevoked ? 'hover:opactiy-90 opacity-50' : ''
      } ${className ?? ''}`}
    >
      <HardDrive className="mb-auto mr-3 mt-1 h-6 w-6" />
      <div className="mr-2 flex flex-col">
        {appClient.friendlyName}
        <small className="block text-sm">
          <span className="capitalize">{appClient.accessRegistrationClientType}</span> |{' '}
          {t('Created')}: {new Date(appClient.created).toLocaleDateString()}
        </small>
      </div>
      {!appClient.isRevoked ? (
        <ActionButton
          icon={Times}
          type="secondary"
          size="square"
          className="ml-2"
          onClick={async () => {
            resetAllowClient();
            resetRemoveClient();

            await revokeClient({ appId, registrationId: appClient.accessRegistrationId });
          }}
          state={revokeClientStatus}
        />
      ) : (
        <>
          <ActionButton
            icon={Refresh}
            type="primary"
            size="square"
            className="ml-2"
            onClick={async () => {
              resetRevokeClient();
              resetRemoveClient();

              await allowClient({ appId, registrationId: appClient.accessRegistrationId });
            }}
            state={allowClientStatus}
          />
          <ActionButton
            icon={Trash}
            type="remove"
            size="square"
            className="ml-2"
            onClick={async () => {
              resetRevokeClient();
              resetAllowClient();

              await removeClient({ appId, registrationId: appClient.accessRegistrationId });
            }}
            confirmOptions={{
              type: 'warning',
              title: `${t('Remove Client')} "${appClient.friendlyName}"`,
              body: t(
                'Are you sure you want to remove this client? If you ever want to undo this, you will have to register the client again.'
              ),
              buttonText: t('Remove'),
            }}
            state={removeClientStatus}
          />
        </>
      )}
    </div>
  );
};

export default AppDetails;
