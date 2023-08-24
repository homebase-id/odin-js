import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ActionGroupOptionProps, Check, Pencil, Times, t } from '@youfoundation/common-app';
import { useCircles } from '@youfoundation/common-app';
import useConnection from '../../../hooks/connections/useConnection';
import useContact from '../../../hooks/contacts/useContact';
import useFocusedEditing from '../../../hooks/focusedEditing/useFocusedEditing';
import { Alert } from '@youfoundation/common-app';
import { ErrorNotification } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { DomainHighlighter } from '@youfoundation/common-app';
import ContactInfo from '../../../components/Connection/ContactInfo/ContactInfo';
import { CircleMembershipDialog } from '../../../components/Dialog/CircleMembershipDialog/CircleMembershipDialog';
import IncomingConnectionDialog from '../../../components/Dialog/ConnectionDialogs/IncomingConnectionDialog';
import { Persons } from '@youfoundation/common-app';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import { LoadingBlock } from '@youfoundation/common-app';
import { CirclePermissionView } from '@youfoundation/common-app';
import DrivePermissionView from '../../../components/PermissionViews/DrivePermissionView/DrivePermissionView';
import Section from '../../../components/ui/Sections/Section';
import { ActionGroup } from '@youfoundation/common-app';
import { House } from '@youfoundation/common-app';
import { Block } from '@youfoundation/common-app';
import { Trash } from '@youfoundation/common-app';
import AppMembershipView from '../../../components/PermissionViews/AppPermissionView/AppPermissionView';
import useApps from '../../../hooks/apps/useApps';
import { AccessGrant, ConnectionInfo, DriveGrant } from '@youfoundation/js-lib/network';
import { PageMeta } from '../../../components/ui/PageMeta/PageMeta';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import OutgoingConnectionDialog from '../../../components/Dialog/ConnectionDialogs/OutgoingConnectionDialog';

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
    block: { mutate: block, error: blockError },
    unblock: { mutate: unblock, status: unblockStatus, error: unblockError },
  } = useConnection({ odinId: odinId });

  const checkReturnTo = useFocusedEditing();
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isEditPermissionActive, setIsEditPermissionActive] = useState(false);
  const [isSentConnectionOpen, setIsSentConnectionOpen] = useState(false);

  // Contact data:
  const { data: contactData } = useContact({ odinId: odinId }).fetch;

  if (connectionInfoLoading) return <LoadingDetailPage />;
  if ((!connectionInfo && !contactData) || !odinId) return <>{t('No matching connection found')}</>;

  const mainAction =
    connectionInfo?.status === 'connected' ? (
      <>
        <ActionButton
          type="primary"
          onClick={() => {
            setIsEditPermissionActive(true);
          }}
          icon={Pencil}
        >
          {t('Edit Access')}
        </ActionButton>
      </>
    ) : connectionInfo?.status === 'sent' ? (
      <>
        <ActionButton
          type="remove"
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
    ) : connectionInfo?.status === 'blocked' ? (
      <ActionButton
        type="remove"
        onClick={() => unblock(odinId)}
        state={unblockStatus}
        confirmOptions={{
          type: 'info',
          title: `${t('Unblock')} ${odinId}`,
          buttonText: t('Unblock'),
          body: `${t('Are you sure you want to unblock')} ${odinId}`,
        }}
      >
        {t('Unblock')}
      </ActionButton>
    ) : connectionInfo?.status !== 'pending' ? (
      <>
        <ActionButton type="primary" onClick={() => setIsSentConnectionOpen(true)}>
          {t('Connect')}
        </ActionButton>
      </>
    ) : null;

  const actionGroupOptions: ActionGroupOptionProps[] = [
    {
      icon: House,
      label: t('Open homepage'),
      href: `https://${odinId}`,
    },
  ];

  if (connectionInfo?.status === 'connected') {
    actionGroupOptions.push({
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
    });
  }

  if (connectionInfo?.status !== 'blocked' && connectionInfo?.status) {
    actionGroupOptions.push({
      icon: Block,
      label: t('Block'),
      onClick: () => block(odinId),
      confirmOptions: {
        title: `${t('Block')} ${odinId}`,
        buttonText: t('Block'),
        body: `${t('Are you sure you want to block')} ${odinId}`,
      },
    });
  }

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
              <small className="block text-sm">{`(${connectionInfo?.status || 'none'})`}</small>
            </span>
          </>
        }
        actions={
          <>
            {mainAction}
            <ActionGroup options={actionGroupOptions} type="secondary" size="square" />
          </>
        }
        breadCrumbs={[{ href: '/owner/connections', title: 'Contacts' }, { title: odinId }]}
        browserTitle={
          connectionInfo?.status === 'connected' && contactData?.name
            ? contactData.name.displayName ??
              `${contactData.name.givenName} ${contactData.name.surname}`
            : odinId
        }
      />
      {connectionInfo?.status === 'blocked' ? (
        <>
          <Alert type="critical">{t('This person is currently blocked')}</Alert>
        </>
      ) : null}

      {connectionInfo?.status === 'pending' ? (
        <>
          <Alert type="info" className="bg-background">
            <div className="flex flex-grow flex-col gap-2 sm:flex-row">
              <div className="mr-1">
                <p>
                  &quot;<DomainHighlighter>{connectionInfo?.senderOdinId}</DomainHighlighter>&quot;{' '}
                  {t('sent you a connection request')}:
                </p>
                <p className="text-sm text-gray-600">{connectionInfo?.message}</p>
              </div>
              <div className="my-auto ml-auto grid grid-flow-col gap-2">
                <ActionButton
                  type="primary"
                  onClick={() => {
                    setIsAcceptDialogOpen(true);
                  }}
                  icon={Check}
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
                  icon={Times}
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

      {connectionInfo?.status === 'connected' ? (
        <>
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

      <OutgoingConnectionDialog
        title={t('Send connection request')}
        isOpen={isSentConnectionOpen}
        targetOdinId={odinId}
        onConfirm={() => setIsSentConnectionOpen(false)}
        onCancel={() => setIsSentConnectionOpen(false)}
      />
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
          actions={<ActionButton onClick={openEditCircleMembership} type="mute" icon={Pencil} />}
        >
          {circlesLoading ? (
            <>
              <LoadingBlock className="mb-4 h-4 max-w-xs" />
              <LoadingBlock className="mb-4 h-4 max-w-xs" />
              <LoadingBlock className="mb-4 h-4 max-w-xs" />
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
