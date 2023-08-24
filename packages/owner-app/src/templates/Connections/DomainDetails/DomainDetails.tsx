import { useParams } from 'react-router-dom';
import { PageMeta } from '../../../components/ui/PageMeta/PageMeta';
import {
  ActionButton,
  ActionGroup,
  ActionGroupOptionProps,
  CirclePermissionView,
  Globe,
  House,
  LoadingBlock,
  Pencil,
  Trash,
  t,
  useCircles,
} from '@youfoundation/common-app';
import useDomain from '../../../hooks/connections/useDomain';
import { useState } from 'react';
import { CircleGrant, DriveGrant } from '@youfoundation/js-lib/dist';
import Section from '../../../components/ui/Sections/Section';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import DrivePermissionView from '../../../components/PermissionViews/DrivePermissionView/DrivePermissionView';
import { CircleDomainMembershipDialog } from '../../../components/Dialog/CircleMembershipDialog/CircleMembershipDialog';

const DomainDetails = () => {
  const { domain } = useParams();
  const {
    fetch: { data: domainInfo, isLoading: domainInfoLoading },
    disconnect: { mutate: disconnect, error: disconnectError },
  } = useDomain({ domain: domain });

  const [isEditPermissionActive, setIsEditPermissionActive] = useState(false);

  if (!domain) return null;

  console.log({ domainInfo });

  const actionGroupOptions: ActionGroupOptionProps[] = [
    {
      icon: House,
      label: t('Open homepage'),
      href: `https://${domain}`,
    },
    {
      icon: Trash,
      label: t('Remove'),
      onClick: () => disconnect({ domain: domain }),
      confirmOptions: {
        title: `${t('Remove')} ${domain}`,
        buttonText: t('Remove'),
        body: `${t('Are you sure you want to remove')} ${domain} ${t(
          'from your domains. They will lose all existing access.'
        )}`,
      },
    },
  ];

  if (domainInfoLoading) return <LoadingDetailPage />;

  return (
    <>
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
            <ActionButton
              type="primary"
              onClick={() => setIsEditPermissionActive(true)}
              icon={Pencil}
            >
              {t('Edit Access')}
            </ActionButton>
            <ActionGroup options={actionGroupOptions} type="secondary" size="square" />
          </>
        }
        breadCrumbs={[{ href: '/owner/domains', title: 'Domains' }, { title: domain }]}
        browserTitle={domain}
      />

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

export default DomainDetails;
