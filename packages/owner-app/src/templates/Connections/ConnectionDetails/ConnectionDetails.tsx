import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { t } from '../../../helpers/i18n/dictionary';
import useCircles from '../../../hooks/circles/useCircles';
import useConnection from '../../../hooks/connections/useConnection';
import useContact from '../../../hooks/contacts/useContact';
import useFocusedEditing from '../../../hooks/focusedEditing/useFocusedEditing';
import Alert from '../../../components/ui/Alerts/Alert/Alert';
import ErrorNotification from '../../../components/ui/Alerts/ErrorNotification/ErrorNotification';
import ActionButton from '../../../components/ui/Buttons/ActionButton';
import DomainHighlighter from '../../../components/ui/DomainHighlighter/DomainHighlighter';
import ContactInfo from '../../../components/Connection/ContactInfo/ContactInfo';
import CircleMembershipDialog from '../../../components/Dialog/CircleMembershipDialog/CircleMembershipDialog';
import IncomingConnectionDialog from '../../../components/Dialog/ConnectionDialogs/IncomingConnectionDialog';
import Persons from '../../../components/ui/Icons/Persons/Persons';
import PageMeta from '../../../components/ui/Layout/PageMeta/PageMeta';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import LoadingParagraph from '../../../components/ui/Loaders/LoadingParagraph/LoadingParagraph';
import CirclePermissionView from '../../../components/PermissionViews/CirclePermissionView/CirclePermissionView';
import DrivePermissionView from '../../../components/PermissionViews/DrivePermissionView/DrivePermissionView';
import Section from '../../../components/ui/Sections/Section';
import ActionGroup from '../../../components/ui/Buttons/ActionGroup';
import House from '../../../components/ui/Icons/House/House';
import Block from '../../../components/ui/Icons/Block/Block';
import Trash from '../../../components/ui/Icons/Trash/Trash';
import AppMembershipView from '../../../components/PermissionViews/AppPermissionView/AppPermissionView';
import useApps from '../../../hooks/apps/useApps';
import { AccessGrant, ConnectionInfo, DriveGrant, stringGuidsEqual } from '@youfoundation/js-lib';

const ConnectionDetails = () => {
  const { odinId } = useParams();
  const navigate = useNavigate();

  // Connection data:
  const {
    fetch: { data: connectionInfo, isLoading: connectionInfoLoading },
    disconnect: { mutate: disconnect, error: disconnectError },
    ignoreRequest: { mutateAsync: ignoreRequest, status: ignoreRequestStatus, error: ignoreError },
    revokeConnectionRequest: {
      mutate: revokeRequest,
      status: revokeRequestStatus,
      error: revokeError,
    },
    block: { mutate: block, status: blockStatus, error: blockError },
    unblock: { mutate: unblock, status: unblockStatus, error: unblockError },
  } = useConnection({ odinId: odinId });

  const checkReturnTo = useFocusedEditing();
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isEditPermissionActive, setIsEditPermissionActive] = useState(false);

  // Contact data:
  const { data: contactData } = useContact({ odinId: odinId }).fetch;

  if (connectionInfoLoading) {
    return <LoadingDetailPage />;
  }

  if (!connectionInfo && !contactData) {
    return <>{t('No matching connection found')}</>;
  }

  const actions =
    connectionInfo.status === 'connected' ? (
      <>
        <ActionButton
          type="primary"
          onClick={() => {
            setIsEditPermissionActive(true);
          }}
          icon="edit"
        >
          {t('Edit Access')}
        </ActionButton>
        <ActionGroup
          type="secondary"
          size="square"
          options={[
            {
              icon: House,
              label: t('Open homepage'),
              href: `https://${odinId}/home`,
            },
            {
              icon: Trash,
              label: t('Remove'),
              onClick: () => disconnect({ connectionOdinId: odinId }),
              confirmOptions: {
                title: `${t('Remove')} ${odinId}`,
                buttonText: t('Remove'),
                body: `${t('Are you sure you want to remove')} ${odinId} ${t(
                  'from your connections. They will lose all existing access.'
                )}`,
              },
            },
            {
              icon: Block,
              label: t('Block'),
              onClick: () => block(odinId),
              confirmOptions: {
                title: `${t('Block')} ${odinId}`,
                buttonText: t('Block'),
                body: `${t('Are you sure you want to block')} ${odinId}`,
              },
            },
          ]}
        />
      </>
    ) : connectionInfo.status === 'sent' ? (
      <>
        <ActionButton
          type="secondary"
          onClick={() => {
            revokeRequest(
              { targetOdinId: connectionInfo.senderOdinId },
              { onSuccess: () => navigate('/owner/connections') }
            );
          }}
          state={revokeRequestStatus}
        >
          {t('Revoke')}
        </ActionButton>
      </>
    ) : (
      <></>
    );

  const activeConnection = connectionInfo as ConnectionInfo;

  return (
    <>
      <ErrorNotification error={disconnectError} />
      <ErrorNotification error={revokeError} />
      <ErrorNotification error={blockError} />
      <ErrorNotification error={unblockError} />
      <ErrorNotification error={ignoreError} />
      <PageMeta
        icon={Persons}
        title={
          <>
            <span className="flex flex-col">
              <span className="block">
                {`${
                  contactData?.name
                    ? contactData.name.displayName ??
                      `${contactData.name.givenName} ${contactData.name.surname}`
                    : odinId
                }`}
              </span>
              <small className="block text-sm">{`(${connectionInfo.status || 'none'})`}</small>
            </span>
          </>
        }
        actions={
          <>
            {connectionInfo.status === 'blocked' ? (
              <ActionButton
                type="remove"
                onClick={() => unblock(odinId)}
                state={unblockStatus}
                confirmOptions={{
                  title: `${t('Unblock')} ${odinId}`,
                  buttonText: t('Unblock'),
                  body: `${t('Are you sure you want to unblock')} ${odinId}`,
                }}
              >
                {t('Unblock')}
              </ActionButton>
            ) : connectionInfo.status !== 'connected' ? (
              <ActionButton
                type="remove"
                onClick={() => block(odinId)}
                state={blockStatus}
                confirmOptions={{
                  title: `${t('Block')} ${odinId}`,
                  buttonText: t('Block'),
                  body: `${t('Are you sure you want to block')} ${odinId}`,
                }}
              >
                {t('Block')}
              </ActionButton>
            ) : null}
            {actions}
          </>
        }
        breadCrumbs={[{ href: '/owner/connections', title: 'Contacts' }, { title: odinId }]}
      />
      {connectionInfo.status === 'blocked' ? (
        <>
          <Alert type="critical">{t('This person is currently blocked')}</Alert>
        </>
      ) : null}

      {connectionInfo.status === 'pending' ? (
        <>
          <Alert type="info">
            <div className="flex flex-grow flex-col sm:flex-row">
              <div className="mr-1">
                &quot;<DomainHighlighter>{connectionInfo.senderOdinId}</DomainHighlighter>&quot;{' '}
                {t('sent you a connection request')}
                <p className="mt-2 text-sm text-gray-600">{connectionInfo.message}</p>
              </div>
              <div className="my-auto ml-auto grid grid-flow-col gap-2">
                <ActionButton
                  type="primary"
                  onClick={() => {
                    setIsAcceptDialogOpen(true);
                  }}
                  icon="check"
                >
                  {t('View request')}...
                </ActionButton>
                <ActionButton
                  type="secondary"
                  onClick={async () => {
                    await ignoreRequest(
                      { senderOdinId: connectionInfo.senderOdinId },
                      { onSuccess: () => navigate('/owner/connections') }
                    );
                    checkReturnTo('Ignored');
                  }}
                  state={ignoreRequestStatus}
                  icon="times"
                >
                  {t('Ignore request')}
                </ActionButton>
              </div>
            </div>
          </Alert>
          <IncomingConnectionDialog
            isOpen={isAcceptDialogOpen}
            senderOdinId={connectionInfo.senderOdinId}
            confirmText={t('Connect')}
            onConfirm={() => {
              setIsAcceptDialogOpen(false);
            }}
            onCancel={() => {
              setIsAcceptDialogOpen(false);
            }}
            pendingConnection={connectionInfo}
          />
        </>
      ) : null}

      {contactData && <ContactInfo odinId={odinId} />}

      {connectionInfo.status === 'connected' ? (
        <>
          {/* <Section
            isOpaqueBg={true}
            title={`${t('Posts of')} ${contactData?.name?.givenName} ${contactData?.name?.surname}`}
          >
            <SocialFeed odinId={odinId} />
          </Section> */}
          <ConnectionPermissionViewer
            accessGrant={activeConnection.accessGrant}
            openEditCircleMembership={() => setIsEditPermissionActive(true)}
          />
          <CircleMembershipDialog
            title={`${t('Edit Circle Membership for')} ${odinId}`}
            isOpen={isEditPermissionActive}
            odinId={odinId}
            currentCircleGrants={activeConnection.accessGrant.circleGrants}
            onCancel={() => {
              setIsEditPermissionActive(false);
            }}
            onConfirm={() => {
              setIsEditPermissionActive(false);
            }}
          />
          <section>
            <p className="text-sm">
              {t('Connected since')}: {new Date(activeConnection.created).toLocaleDateString()}
            </p>
          </section>
        </>
      ) : null}
    </>
  );
};

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

  const uniqueDrivesWithHighestPermission = grantedDrives?.reduce((prevValue, grantedDrive) => {
    const existingGrantIndex = prevValue.findIndex(
      (driveGrant) =>
        driveGrant.permissionedDrive.drive.alias === grantedDrive.permissionedDrive.drive.alias &&
        driveGrant.permissionedDrive.drive.type === grantedDrive.permissionedDrive.drive.type
    );

    if (existingGrantIndex !== -1) {
      prevValue[existingGrantIndex].permissionedDrive.permission = Math.max(
        prevValue[existingGrantIndex].permissionedDrive.permission,
        grantedDrive.permissionedDrive.permission
      );
      return prevValue;
    } else {
      return [...prevValue, grantedDrive];
    }
  }, [] as DriveGrant[]);

  const driveGrantsWithPermissionTree = uniqueDrivesWithHighestPermission?.map((drive) => {
    const viaCircles = grantedCircles?.filter((circle) =>
      circle.driveGrants?.some(
        (driveGrant) =>
          driveGrant.permissionedDrive.drive.alias === drive.permissionedDrive.drive.alias &&
          driveGrant.permissionedDrive.drive.type === drive.permissionedDrive.drive.type
      )
    );

    const viaApps = grantedApps?.filter((app) =>
      app.circleMemberPermissionSetGrantRequest.drives?.some(
        (driveGrant) =>
          driveGrant.permissionedDrive.drive.alias === drive.permissionedDrive.drive.alias &&
          driveGrant.permissionedDrive.drive.type === drive.permissionedDrive.drive.type
      )
    );

    const circleNames = viaCircles?.map((circle) => circle.name) ?? [];
    const appNames = viaApps?.map((app) => app.name) ?? [];

    return { driveGrant: drive, permissionTree: [...circleNames, ...appNames].join(', ') };
  });

  return (
    <div className={className}>
      {grantedCircles?.length || circlesLoading ? (
        <Section
          title={t('Member of the following circles')}
          actions={<ActionButton onClick={openEditCircleMembership} type="mute" icon="edit" />}
        >
          {circlesLoading ? (
            <>
              <LoadingParagraph className="mb-4 h-4 max-w-xs" />
              <LoadingParagraph className="mb-4 h-4 max-w-xs" />
              <LoadingParagraph className="mb-4 h-4 max-w-xs" />
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

export default ConnectionDetails;
