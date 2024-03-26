import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import React from 'react';
import { t } from '@youfoundation/common-app';
import { useDrives } from '../../../hooks/drives/useDrives';
import { HardDrive } from '@youfoundation/common-app';
import { LoadingBlock } from '@youfoundation/common-app';
import { SectionTitle } from '../../../components/ui/Sections/Section';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import CardLink from '../../../components/ui/Buttons/CardLink';
import { PageMeta } from '../../../components/ui/PageMeta/PageMeta';
import { ProfileConfig } from '@youfoundation/js-lib/profile';
import { BlogConfig } from '@youfoundation/js-lib/public';
import { ContactConfig } from '@youfoundation/js-lib/network';

const Drives = () => {
  const {
    fetch: { data: drives, isLoading: isDrivesLoading },
  } = useDrives();

  if (isDrivesLoading) <LoadingDetailPage />;

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
        // actions={
        //   <ActionButton onClick={async () => setIsImportOpen(true)} type="secondary">
        //     {t('Import drive')}...
        //   </ActionButton>
        // }
      />
      <section className="-my-4">
        {isDrivesLoading ? (
          <>
            <LoadingBlock className="m-4 h-10" />
            <LoadingBlock className="m-4 h-10" />
            <LoadingBlock className="m-4 h-10" />
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
    </>
  );
};

export default Drives;
