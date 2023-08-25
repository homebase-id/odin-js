import { useNavigate, useParams } from 'react-router-dom';
import { PageMeta } from '../../../components/ui/PageMeta/PageMeta';
import {
  ActionButton,
  ActionGroup,
  ActionGroupOptionProps,
  Alert,
  Block,
  CirclePermissionView,
  ErrorNotification,
  Globe,
  HardDrive,
  House,
  LoadingBlock,
  Pencil,
  Refresh,
  SubtleMessage,
  Times,
  Trash,
  t,
  useCircles,
} from '@youfoundation/common-app';
import useDomain from '../../../hooks/connections/useDomain';
import { useState } from 'react';
import Section from '../../../components/ui/Sections/Section';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import DrivePermissionView from '../../../components/PermissionViews/DrivePermissionView/DrivePermissionView';
import { CircleDomainMembershipDialog } from '../../../components/Dialog/CircleMembershipDialog/CircleMembershipDialog';
import { CircleGrant, DriveGrant } from '@youfoundation/js-lib/network';
import useDomainClients from '../../../hooks/connections/useDomainClients';
import { DomainClient } from '../../../provider/network/domainNetwork/DomainProvider';

const DomainDetails = () => {
  const { domain } = useParams();
  const navigate = useNavigate();
  const {
    fetch: { data: domainInfo, isLoading: domainInfoLoading },
    disconnect: { mutate: disconnect, error: disconnectError },

    revokeDomain: { mutate: revokeDomain, error: revokeDomainError },
    restoreDomain: {
      mutate: restoreDomain,
      error: restoreDomainError,
      status: restoreDomainStatus,
    },
  } = useDomain({ domain: domain });

  const [isEditPermissionActive, setIsEditPermissionActive] = useState(false);

  if (!domain) return null;

  const actionGroupOptions: ActionGroupOptionProps[] = [
    {
      icon: House,
      label: t('Open homepage'),
      href: `https://${domain}`,
    },
  ];

  if (domainInfoLoading) return <LoadingDetailPage />;

  if (domainInfo?.isRevoked) {
    actionGroupOptions.push({
      icon: Trash,
      label: t('Remove'),
      onClick: () => {
        disconnect({ domain: domain });

        navigate('/owner/third-parties');
      },
      confirmOptions: {
        title: `${t('Remove')} ${domain}`,
        buttonText: t('Remove'),
        body: `${t('Are you sure you want to remove')} ${domain} ${t(
          'from your domains. They will lose all existing access.'
        )}`,
      },
    });

    actionGroupOptions.push({
      icon: Refresh,
      label: t('Restore'),
      onClick: () => {
        restoreDomain({ domain: domain });
      },
      confirmOptions: {
        title: `${t('Restore')} ${domain}`,
        buttonText: t('Restore'),
        body: `${t('Are you sure you want to restore')} ${domain} ${t(
          'to your domains. They will regain access.'
        )}`,
      },
    });
  } else {
    actionGroupOptions.push({
      icon: Block,
      label: t('Revoke'),
      onClick: () => {
        revokeDomain({ domain: domain });
      },
      confirmOptions: {
        title: `${t('Revoke')} ${domain}`,
        buttonText: t('Revoke'),
        body: `${t('Are you sure you want to revoke')} ${domain} ${t(
          'from your domains. They will lose all existing access.'
        )}`,
      },
    });
  }

  return (
    <>
      <ErrorNotification error={disconnectError || revokeDomainError || restoreDomainError} />
      <PageMeta
        icon={Globe}
        title={
          <>
            <span className="flex flex-col">
              <span className="block">{`${domain}`}</span>
            </span>
          </>
        }
        actions={
          <>
            {domainInfo?.isRevoked ? (
              <ActionButton
                type="primary"
                onClick={() => restoreDomain({ domain })}
                state={restoreDomainStatus}
                icon={Refresh}
              >
                {t('Restore Domain')}
              </ActionButton>
            ) : (
              <ActionButton
                type="primary"
                onClick={() => setIsEditPermissionActive(true)}
                icon={Pencil}
              >
                {t('Edit Access')}
              </ActionButton>
            )}
            <ActionGroup options={actionGroupOptions} type="secondary" size="square" />
          </>
        }
        breadCrumbs={[{ href: '/owner/third-parties', title: 'Third-Parties' }, { title: domain }]}
        browserTitle={domain}
      />

      {domainInfo?.isRevoked && (
        <Alert type="critical" title={t('Domain is revoked')} className="mb-5">
          {t('This domain is revoked, it no longer has the access provided')}
        </Alert>
      )}

      <DomainPermissionViewer
        circleGrants={domainInfo?.circleGrants || []}
        openEditCircleMembership={() => setIsEditPermissionActive(true)}
      />

      <CircleDomainMembershipDialog
        title={`${t('Edit Circle Membership for')} ${domain}`}
        isOpen={isEditPermissionActive}
        domain={domain}
        currentCircleGrants={domainInfo?.circleGrants || []}
        onCancel={() => {
          setIsEditPermissionActive(false);
        }}
        onConfirm={() => {
          setIsEditPermissionActive(false);
        }}
      />

      <DomainClients domain={domain} />
    </>
  );
};

const DomainPermissionViewer = ({
  circleGrants,
  openEditCircleMembership,
}: {
  circleGrants: CircleGrant[];
  openEditCircleMembership?: () => void;
}) => {
  const { data: circles, isLoading: circlesLoading } = useCircles().fetch;

  const grantedCircles = circles?.filter((circle) =>
    circleGrants.some((circleGrant) => circleGrant.circleId === circle.id)
  );

  const grantedDrives = [...(grantedCircles?.flatMap((circle) => circle.driveGrants ?? []) ?? [])];

  const uniqueDriveGrants = grantedDrives?.reduce((prevValue, grantedDrive) => {
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

  return (
    <>
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

      {uniqueDriveGrants?.length ? (
        <Section title={t('Access on the following drives')}>
          <div className="-my-6">
            {uniqueDriveGrants.map((driveGrant) => {
              return (
                <DrivePermissionView
                  key={`${driveGrant.permissionedDrive.drive.alias}-${driveGrant.permissionedDrive.drive.type}`}
                  driveGrant={driveGrant}
                  // permissionTree={driveGrant.permissionTree}
                  className="my-6"
                />
              );
            })}
          </div>
        </Section>
      ) : null}
    </>
  );
};

const dateFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  weekday: 'short',
};

const timeFormat: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: 'numeric',
};

const DomainClients = ({ domain }: { domain: string }) => {
  const {
    fetch: { data: clients, isLoading: clientsLoading },
  } = useDomainClients({ domain: domain });

  return (
    <Section title={t('Devices')}>
      {clientsLoading ? (
        <>
          <LoadingBlock className="mb-4 h-4 max-w-xs" />
          <LoadingBlock className="mb-4 h-4 max-w-xs" />
          <LoadingBlock className="mb-4 h-4 max-w-xs" />
        </>
      ) : clients?.length ? (
        <div className="grid grid-flow-row gap-4">
          {clients?.map((client) => (
            <ClientView domain={domain} client={client} key={client.accessRegistrationId} />
          ))}
        </div>
      ) : (
        <SubtleMessage>{t('No clients currently registered')}</SubtleMessage>
      )}
    </Section>
  );
};

const ClientView = ({
  domain,
  client,
  className,
}: {
  domain: string;
  client: DomainClient;
  className?: string;
}) => {
  const createdDate = new Date(client.created);
  const {
    removeClient: { mutateAsync: removeClient, status: removeClientStatus },
  } = useDomainClients({});

  return (
    <div
      className={`flex flex-row items-center ${
        client.isRevoked ? 'hover:opactiy-90 opacity-50' : ''
      } ${className ?? ''}`}
    >
      <HardDrive className="mb-auto mr-3 mt-1 h-6 w-6" />
      <div className="mr-2 flex flex-col">
        {client.friendlyName}
        <small className="block text-sm">
          <span className="capitalize">{client.accessRegistrationClientType}</span> | {t('Created')}
          : {createdDate.toLocaleDateString(undefined, dateFormat)}{' '}
          {createdDate.toLocaleTimeString(undefined, timeFormat)}
        </small>
      </div>

      <ActionButton
        icon={Times}
        type="secondary"
        size="square"
        className="ml-2"
        onClick={async () => removeClient({ domain, registrationId: client.accessRegistrationId })}
        state={removeClientStatus}
      />
    </div>
  );
};

export default DomainDetails;
