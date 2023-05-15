import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { t } from '@youfoundation/common-app';
import useDrive from '../../../hooks/drives/useDrive';
import ActionButton from '../../../components/ui/Buttons/ActionButton';
import { HardDrive } from '@youfoundation/common-app';
import PageMeta from '../../../components/ui/Layout/PageMeta/PageMeta';
import Section from '../../../components/ui/Sections/Section';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import useExport from '../../../hooks/drives/useExport';
import ActionLink from '../../../components/ui/Buttons/ActionLink';
import ImportDialog from '../../../components/Dialog/ImportDialog/ImportDialog';
import AppMembershipView from '../../../components/PermissionViews/AppPermissionView/AppPermissionView';
import { CirclePermissionView } from '@youfoundation/common-app';
import useApps from '../../../hooks/apps/useApps';
import { useCircles } from '@youfoundation/common-app';
import { drivePermissionLevels } from '../../../provider/permission/permissionLevels';
import { getAccessFromPermissionNumber } from '../../DemoData/helpers';
import DriveCircleAccessDialog from '../../../components/Dialog/DriveCircleAccessDialog/DriveCircleAccessDialog';
import DriveAppAccessDialog from '../../../components/Dialog/DriveAppAccessDialog/DriveAppAccessDialog';
import FileBrowser from '../../../components/FileBrowser/FileBrowser';
import { Download } from '@youfoundation/common-app';
import { Upload } from '@youfoundation/common-app';

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

  const [downloadUrl, setDownloadUrl] = useState<string>();

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCircleSelectorOpen, setIsCircleSelectorOpen] = useState(false);
  const [isAppSelectorOpen, setIsAppSelectorOpen] = useState(false);

  if (driveDefLoading) {
    return <LoadingDetailPage />;
  }

  if (!driveDef) {
    return <>No matching drive found</>;
  }

  const targetDriveInfo = driveDef?.targetDriveInfo;

  const circlesWithAGrantOnThis = circles?.filter((circle) =>
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

  return (
    <>
      <PageMeta
        icon={HardDrive}
        title={`${driveDef.name}`}
        actions={
          <>
            {downloadUrl ? (
              <ActionLink
                className="animate-pulse"
                href={downloadUrl}
                download={`${driveDef.name}.json`}
                onClick={() => setDownloadUrl(undefined)}
                type="primary"
              >
                {t('Click to Download')}
              </ActionLink>
            ) : (
              <ActionButton
                onClick={async () => setDownloadUrl(await exportUnencrypted(driveDef))}
                state={exportStatus}
                type="secondary"
                icon={Download}
              >
                {t('Export')}
              </ActionButton>
            )}
            <ActionButton
              onClick={async () => setIsImportOpen(true)}
              type="secondary"
              icon={Upload}
            >
              {t('Import')}...
            </ActionButton>
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
            <ActionButton type="mute" onClick={() => setIsCircleSelectorOpen(true)} icon={'edit'} />
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
                  permissionDetails={
                    getAccessFromPermissionNumber(
                      matchingGrant?.permissionedDrive?.permission || 0,
                      drivePermissionLevels
                    ).name
                  }
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
            <ActionButton type="mute" onClick={() => setIsAppSelectorOpen(true)} icon={'edit'} />
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
                  permissionLevel={
                    getAccessFromPermissionNumber(
                      matchingGrant?.permissionedDrive.permission || 0,
                      drivePermissionLevels
                    ).name
                  }
                />
              );
            })}
          </ul>
        </Section>
      ) : null}

      <FileBrowser targetDrive={targetDriveInfo} />
      <FileBrowser targetDrive={targetDriveInfo} systemFileType={'Comment'} />

      <ImportDialog
        title={`${t('Import to')} ${driveDef.name}`}
        isOpen={isImportOpen}
        onConfirm={() => setIsImportOpen(false)}
        onCancel={() => setIsImportOpen(false)}
        targetDrive={driveDef.targetDriveInfo}
      />

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
