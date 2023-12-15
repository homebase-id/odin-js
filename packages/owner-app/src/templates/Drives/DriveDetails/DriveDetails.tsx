import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ActionButton, Pencil, t } from '@youfoundation/common-app';
import { useDrive } from '../../../hooks/drives/useDrive';

import { HardDrive } from '@youfoundation/common-app';

import Section from '../../../components/ui/Sections/Section';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import { useExport } from '../../../hooks/drives/useExport';
import AppMembershipView from '../../../components/PermissionViews/AppPermissionView/AppPermissionView';
import { CirclePermissionView } from '@youfoundation/common-app';
import { useApps } from '../../../hooks/apps/useApps';
import { useCircles } from '@youfoundation/common-app';
import DriveCircleAccessDialog from '../../../components/Dialog/DriveCircleAccessDialog/DriveCircleAccessDialog';
import DriveAppAccessDialog from '../../../components/Dialog/DriveAppAccessDialog/DriveAppAccessDialog';
import FileBrowser from '../../../components/FileBrowser/FileBrowser';
import { Download } from '@youfoundation/common-app';
import { PageMeta } from '../../../components/ui/PageMeta/PageMeta';
import { getDrivePermissionFromNumber } from '@youfoundation/js-lib/helpers';

const DriveDetails = () => {
  const { driveKey } = useParams();
  const splittedDriveKey = driveKey ? driveKey.split('_') : undefined;
  const {
    fetch: { data: driveDef, isLoading: driveDefLoading },
  } = useDrive({
    targetDrive: splittedDriveKey
      ? { alias: splittedDriveKey[0], type: splittedDriveKey[1] }
      : undefined,
  });
  const { mutateAsync: exportUnencrypted, status: exportStatus } = useExport().exportUnencrypted;

  const { data: circles } = useCircles().fetch;
  const { data: apps } = useApps().fetchRegistered;

  // const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCircleSelectorOpen, setIsCircleSelectorOpen] = useState(false);
  const [isAppSelectorOpen, setIsAppSelectorOpen] = useState(false);

  if (driveDefLoading) {
    return <LoadingDetailPage />;
  }

  if (!driveDef) {
    return <>No matching drive found</>;
  }

  const targetDriveInfo = driveDef?.targetDriveInfo;

  const circlesWithAGrantOnThis = circles?.filter(
    (circle) =>
      circle.driveGrants?.some(
        (grant) =>
          grant.permissionedDrive.drive.alias === targetDriveInfo.alias &&
          grant.permissionedDrive.drive.type === targetDriveInfo.type
      )
  );

  const appsWithAGrantOnThis = apps?.filter((app) =>
    app.grant.driveGrants.some(
      (grant) =>
        grant.permissionedDrive.drive.alias === targetDriveInfo.alias &&
        grant.permissionedDrive.drive.type === targetDriveInfo.type
    )
  );

  const doDownload = (url: string) => {
    // Dirty hack for easy download
    const link = document.createElement('a');
    link.href = url;
    link.download = url.substring(url.lastIndexOf('/') + 1);
    link.click();
  };

  return (
    <>
      <PageMeta
        icon={HardDrive}
        title={`${driveDef.name}`}
        actions={
          <>
            <ActionButton
              onClick={async () => doDownload(await exportUnencrypted(driveDef))}
              state={exportStatus}
              type="secondary"
              icon={Download}
            >
              {t('Export')}
            </ActionButton>
            {/* <ActionButton
              onClick={async () => setIsImportOpen(true)}
              type="secondary"
              icon={Upload}
            >
              {t('Import')}...
            </ActionButton> */}
          </>
        }
        breadCrumbs={[
          { href: '/owner/drives', title: 'My Drives' },
          { title: driveDef.name ?? '' },
        ]}
      />
      <Section title={t('Metadata')}>
        <p>{driveDef.metadata}</p>
        <ul>
          {driveDef.allowAnonymousReads ? <li>Allow Anonymous Reads</li> : null}
          {driveDef.ownerOnly ? <li>Owner only</li> : null}
          <li>Alias: {driveDef.targetDriveInfo.alias}</li>
          <li>Type: {driveDef.targetDriveInfo.type}</li>
        </ul>
      </Section>

      {circlesWithAGrantOnThis?.length ? (
        <Section
          title={t('Circles with access:')}
          actions={
            <ActionButton type="mute" onClick={() => setIsCircleSelectorOpen(true)} icon={Pencil} />
          }
        >
          <ul className="-my-4">
            {circlesWithAGrantOnThis.map((circle) => {
              const matchingGrant = circle.driveGrants?.find(
                (grant) =>
                  grant.permissionedDrive.drive.alias === targetDriveInfo.alias &&
                  grant.permissionedDrive.drive.type === targetDriveInfo.type
              );
              return (
                <CirclePermissionView
                  circleDef={circle}
                  key={circle.id}
                  permissionDetails={t(
                    getDrivePermissionFromNumber(matchingGrant?.permissionedDrive?.permission)
                  )}
                  className="my-4"
                />
              );
            })}
          </ul>
        </Section>
      ) : null}

      {appsWithAGrantOnThis?.length ? (
        <Section
          title={t('Apps with access:')}
          actions={
            <ActionButton type="mute" onClick={() => setIsAppSelectorOpen(true)} icon={Pencil} />
          }
        >
          <ul className="-my-4">
            {appsWithAGrantOnThis.map((app) => {
              const matchingGrant = app.grant.driveGrants.find(
                (grant) =>
                  grant.permissionedDrive.drive.alias === targetDriveInfo.alias &&
                  grant.permissionedDrive.drive.type === targetDriveInfo.type
              );
              return (
                <AppMembershipView
                  className="my-4"
                  appDef={app}
                  key={app.appId}
                  permissionLevel={t(
                    getDrivePermissionFromNumber(matchingGrant?.permissionedDrive.permission)
                  )}
                />
              );
            })}
          </ul>
        </Section>
      ) : null}

      <FileBrowser targetDrive={targetDriveInfo} systemFileType="Standard" key="Standard" />
      <FileBrowser targetDrive={targetDriveInfo} systemFileType="Comment" key="Comment" />

      {/* <ImportDialog
        title={`${t('Import to')} ${driveDef.name}`}
        isOpen={isImportOpen}
        onConfirm={() => setIsImportOpen(false)}
        onCancel={() => setIsImportOpen(false)}
        targetDrive={driveDef.targetDriveInfo}
      /> */}

      <DriveCircleAccessDialog
        driveDefinition={driveDef}
        isOpen={isCircleSelectorOpen}
        onCancel={() => {
          setIsCircleSelectorOpen(false);
        }}
        onConfirm={() => {
          setIsCircleSelectorOpen(false);
        }}
        title={`${t('Edit access on')} ${driveDef.name}`}
      />

      <DriveAppAccessDialog
        driveDefinition={driveDef}
        isOpen={isAppSelectorOpen}
        onCancel={() => {
          setIsAppSelectorOpen(false);
        }}
        onConfirm={() => {
          setIsAppSelectorOpen(false);
        }}
        title={`${t('Edit access on')} ${driveDef.name}`}
      />
    </>
  );
};

export default DriveDetails;
