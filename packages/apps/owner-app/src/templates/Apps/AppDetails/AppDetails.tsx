import { Link, useNavigate, useParams } from 'react-router-dom';
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
import {
  Grid,
  Refresh,
  Trash,
  Times,
  Pencil,
  HardDrive,
  Arrow,
  Circles as CirclesIcon,
} from '@homebase-id/common-app/icons';
import { DriveGrant } from '@homebase-id/js-lib/network';
import {
  CircleMemberIdentities,
  Fact,
  OWNERSHIP_HINTS,
  formatTimestamp,
} from '../../../components/Apps/AppOverviewParts';
import { DriveView } from '../../../components/PermissionViews/DrivePermissionView/DrivePermissionView';

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

  // Ownership, the same way the overview computes it: a circle or drive names its owning app, and
  // that is a different relationship from the grants below. An app can own a circle it does not
  // authorize, and hold a grant on a drive it does not own.
  const ownedCircles = (circles ?? []).filter((circle) =>
    stringGuidsEqual(decodedAppKey, circle.appId)
  );

  const ownedDrives = (drives ?? []).filter((drive) =>
    stringGuidsEqual(decodedAppKey, drive.appId ?? undefined)
  );

  const authorizedCircleDefs = (app?.authorizedCircles ?? [])
    .map((circleId) => (circles ?? []).find((circle) => stringGuidsEqual(circle.id, circleId)))
    .filter((circle): circle is NonNullable<typeof circle> => !!circle);

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

      <Section title={t('Details')}>
        <div className="flex flex-col gap-3">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
            <Fact label={t('App id')}>
              <span className="break-all font-mono text-slate-400">{app.appId}</span>
            </Fact>
            <Fact label={t('Slug')}>
              {app.appSlug ? (
                <span className="break-all font-mono">{app.appSlug}</span>
              ) : (
                <span className="text-slate-400">{t('None')}</span>
              )}
            </Fact>
            <Fact label={t('CORS host')}>
              {app.corsHostName || <span className="text-slate-400">{t('None')}</span>}
            </Fact>
            <Fact label={t('Revoked')}>
              {app.isRevoked || app.grant?.isRevoked ? t('Yes') : t('No')}
            </Fact>
            <Fact label={t('Peer access (ICR key)')} hint={OWNERSHIP_HINTS.icrKey}>
              {app.grant?.hasIcrKey === undefined
                ? t('Unknown')
                : app.grant.hasIcrKey
                  ? t('Yes')
                  : t('No')}
            </Fact>
            {app.created ? (
              <Fact label={t('First used')}>{formatTimestamp(app.created)}</Fact>
            ) : null}
            {app.modified ? (
              <Fact label={t('Last updated')}>{formatTimestamp(app.modified)}</Fact>
            ) : null}
          </dl>
        </div>
      </Section>

      {/* Ownership, not access. An app owns the drives and circles it brought with it; the grants
          below are what it (and your connections) may reach -- a different question, and usually a
          different set. Side by side on a wide screen, stacked on a narrow one, the same way the
          permission sections below do it. */}
      <SectionTitle
        title={
          <>
            {t('What this app brought with it:')}
            <small className="block text-sm text-slate-400">
              {t('The drives and circles this app owns, whoever may reach them')}
            </small>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-flow-col sm:grid-cols-2">
        {/* Owning and reaching are separate: System, Community and Photo each own a drive they
            hold no grant on. Worth saying out loud, since the two lists look alike. The line goes
            in the title so it sits above the section's rule, like the headings above. */}
        <Section
          title={
            <>
              {`${t('Drives it owns')} (${ownedDrives.length})`}
              <small className="block max-w-prose text-sm font-normal text-slate-400">
                {t(
                  'Drives this app created and names. Owning one does not by itself let the app read or write it -- that comes from the grants below.'
                )}
              </small>
            </>
          }
        >
          {ownedDrives.length ? (
            <div className="-my-4">
              {ownedDrives.map((drive) => (
                <DriveView
                  drive={drive}
                  className="my-4"
                  key={`${drive.targetDriveInfo.alias}-${drive.targetDriveInfo.type}`}
                />
              ))}
            </div>
          ) : (
            <p className="text-slate-400">{t('No drives owned by this app')}</p>
          )}
        </Section>

        <Section title={`${t('Circles it owns')} (${ownedCircles.length})`}>
          {/* Names and a way through, nothing more. The circle's own page is where its fields
              live, and repeating them here made two places to read and keep in step. */}
          {ownedCircles.length ? (
            <div className="-my-4">
              {ownedCircles.map((circle) => (
                <div key={circle.id} className="my-4 flex flex-row">
                  <Link
                    to={`/owner/circles/${encodeURIComponent(circle.id ?? '')}`}
                    className="flex flex-row hover:text-slate-700 hover:underline dark:hover:text-slate-400"
                  >
                    <CirclesIcon className="mb-auto mr-3 mt-1 h-6 w-6 flex-shrink-0" />
                    <div className="mr-2 flex flex-col">
                      <p className="my-auto">{circle.name}</p>
                    </div>
                    <Arrow className="my-auto ml-auto h-5 w-5" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">{t('No circles owned by this app')}</p>
          )}
        </Section>
      </div>

      <SectionTitle
        title={
          <>
            {t('The app itself:')}
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
          title={
            <>
              {t('Drives')}
              <small className="block max-w-prose text-sm font-normal text-slate-400">
                {t('What this app may read and write, including drives other apps own.')}
              </small>
            </>
          }
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
            {t('Access your connections get')}
            <small className="block text-sm text-slate-400">
              {t(
                'Pick which of your circles this app should work with. Everyone in those circles gets the access shown below -- the drives and permissions listed -- so they can use this app with you. Take a circle off this list and its members lose that access.'
              )}
            </small>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-flow-col sm:grid-cols-3">
        <Section
          title={t('Circles this app works with')}
          actions={
            <ActionButton type="mute" onClick={() => setCircleEditState('circle')} icon={Pencil} />
          }
        >
          {authorizedCircleDefs.length ? (
            <div className="flex flex-col gap-4">
              <ul className="-my-4">
                {authorizedCircleDefs.map((circleDef) => (
                  <CirclePermissionView circleDef={circleDef} key={circleDef.id} className="my-4" />
                ))}
              </ul>

              {/* Who the grant above actually lands on. Editing circle access without seeing the
                  identities behind it is the part of this page that was guesswork. Its own button
                  opens the list, so it needs no section around it. */}
              <CircleMemberIdentities
                appName={app.name}
                circles={authorizedCircleDefs}
                grants={app.circleMemberPermissionSetGrantRequest.drives ?? []}
                drives={drives}
              />
            </div>
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
