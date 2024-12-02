import { useNavigate, useParams } from 'react-router-dom';
import { PageMeta } from '@homebase-id/common-app';

import { useState } from 'react';
import Section from '../../components/ui/Sections/Section';
import LoadingDetailPage from '../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import DrivePermissionView from '../../components/PermissionViews/DrivePermissionView/DrivePermissionView';
import { CircleGrant } from '@homebase-id/js-lib/network';
import { useDomainClients } from '../../hooks/connections/useDomainClients';
import { DomainClient } from '../../provider/network/domainNetwork/DomainManager';
import { getUniqueDrivesWithHighestPermission } from '@homebase-id/js-lib/helpers';
import { CircleDomainMembershipDialog } from '../../components/Circles/CircleMembershipDialog/CircleMembershipDialog';
import {
  ActionGroupOptionProps,
  t,
  ErrorNotification,
  ActionButton,
  ActionGroup,
  Alert,
  useCircles,
  LoadingBlock,
  CirclePermissionView,
  SubtleMessage,
  useDomain,
} from '@homebase-id/common-app';
import {
  House,
  Trash,
  Refresh,
  Block,
  Globe,
  Pencil,
  HardDrive,
  Times,
} from '@homebase-id/common-app/icons';
import { useManageDomain } from '../../hooks/connections/useManageDomain';

const DomainDetails = () => {
  const { domain } = useParams();
  const navigate = useNavigate();
  const {
    fetch: { data: domainInfo, isLoading: domainInfoLoading },
  } = useDomain({ domain: domain });
  const {
    disconnect: { mutate: disconnect, error: disconnectError },

    revokeDomain: { mutate: revokeDomain, error: revokeDomainError },
    restoreDomain: {
      mutate: restoreDomain,
      error: restoreDomainError,
      status: restoreDomainStatus,
    },
  } = useManageDomain();

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

        navigate('/owner/third-parties/services');
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
            <ActionGroup options={actionGroupOptions} type="mute" size="square" />
          </>
        }
        breadCrumbs={[
          { href: '/owner/third-parties/services', title: 'Third-Parties' },
          { title: domain },
        ]}
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

  const uniqueDriveGrants = getUniqueDrivesWithHighestPermission(grantedDrives);

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
      ) : (
        <Alert type="info" className="bg-background">
          {t('This service has no additional access, apart from your publicly available data')}
        </Alert>
      )}

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
    <Section title={t('Access Tokens')}>
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
          <span className="capitalize">{client.accessRegistrationClientType}</span> |{' '}
          {t('First used')}:{' '}
          {createdDate.toLocaleString(undefined, { ...dateFormat, ...timeFormat })}
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
