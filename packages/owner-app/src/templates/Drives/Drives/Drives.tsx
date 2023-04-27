import { BlogConfig, ProfileConfig, stringGuidsEqual } from '@youfoundation/js-lib';
import React, { useState } from 'react';
import { t } from '../../../helpers/i18n/dictionary';
import useDrives from '../../../hooks/drives/useDrives';
import ActionButton from '../../../components/ui/Buttons/ActionButton';
import ImportDialog from '../../../components/Dialog/ImportDialog/ImportDialog';
import HardDrive from '../../../components/ui/Icons/HardDrive/HardDrive';
import PageMeta from '../../../components/ui/Layout/PageMeta/PageMeta';
import LoadingParagraph from '../../../components/ui/Loaders/LoadingParagraph/LoadingParagraph';
import { SectionTitle } from '../../../components/ui/Sections/Section';
import { ContactConfig } from '../../../provider/contact/ContactTypes';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import CardLink from '../../../components/ui/Buttons/CardLink';

const Drives = () => {
  const {
    fetch: { data: drives, isLoading: isDrivesLoading },
  } = useDrives();

  const [isImportOpen, setIsImportOpen] = useState(false);

  if (isDrivesLoading) {
    <LoadingDetailPage />;
  }

  const driveTypeDefinitions = [
    {
      title: t('Profile Drives'),
      type: ProfileConfig.ProfileDriveType,
    },
    {
      title: t('Channel Drives'),
      type: BlogConfig.DriveType,
    },
    {
      title: t('App specific Drives'),
    },
    {
      title: t('System Drives'),
      type: ContactConfig.ContactTargetDrive.type,
    },
  ];

  const appDrives = drives?.filter(
    (drive) =>
      ![
        ProfileConfig.ProfileDriveType,
        BlogConfig.DriveType,
        ContactConfig.ContactTargetDrive.type,
      ].includes(drive.targetDriveInfo.type)
  );

  return (
    <>
      <PageMeta
        icon={HardDrive}
        title={t('My Drives')}
        actions={
          <ActionButton onClick={async () => setIsImportOpen(true)} type="secondary">
            {t('Import drive')}...
          </ActionButton>
        }
      />
      <section className="-my-4">
        {isDrivesLoading ? (
          <>
            <LoadingParagraph className="m-4 h-10" />
            <LoadingParagraph className="m-4 h-10" />
            <LoadingParagraph className="m-4 h-10" />
          </>
        ) : (
          driveTypeDefinitions?.map((type) => (
            <React.Fragment key={type.title}>
              <SectionTitle title={type.title} />
              <div className="grid grid-cols-2 gap-4 py-4 md:grid-cols-3 lg:grid-cols-4">
                {(type.type
                  ? drives?.filter((drive) =>
                      stringGuidsEqual(drive.targetDriveInfo.type, type.type)
                    ) ?? []
                  : appDrives
                )?.map((driveDef) => (
                  <CardLink
                    title={driveDef.name}
                    href={`/owner/drives/${driveDef.targetDriveInfo.alias}_${driveDef.targetDriveInfo.type}`}
                    key={`${driveDef.targetDriveInfo.alias}-${driveDef.targetDriveInfo.type}`}
                  >
                    <h3 className="text-lg">Metadata</h3>
                    <p>{driveDef.metadata}</p>
                    <ul>{driveDef.allowAnonymousReads ? <li>Allow Anonymous Reads</li> : null}</ul>
                  </CardLink>
                ))}
              </div>
            </React.Fragment>
          ))
        )}
      </section>

      <ImportDialog
        title={`${t('Import new Drive')}`}
        isOpen={isImportOpen}
        onConfirm={() => setIsImportOpen(false)}
        onCancel={() => setIsImportOpen(false)}
      />
    </>
  );
};

export default Drives;
