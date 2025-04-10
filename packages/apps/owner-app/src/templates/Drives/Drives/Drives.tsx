import {hasDebugFlag, stringGuidsEqual} from '@homebase-id/js-lib/helpers';
import React from 'react';
import { useDrives } from '../../../hooks/drives/useDrives';
import { SectionTitle } from '../../../components/ui/Sections/Section';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import CardLink from '../../../components/ui/Buttons/CardLink';
import { PageMeta } from '@homebase-id/common-app';
import { ProfileConfig } from '@homebase-id/js-lib/profile';
import { BlogConfig } from '@homebase-id/js-lib/public';
import { ContactConfig } from '@homebase-id/js-lib/network';
import { t, LoadingBlock } from '@homebase-id/common-app';
import { HardDrive } from '@homebase-id/common-app/icons';

const Drives = () => {
  const {
    fetch: { data: drives, isLoading: isDrivesLoading },
  } = useDrives();

  const isDebug = hasDebugFlag();
  
  if (isDrivesLoading) <LoadingDetailPage />;

  const driveTypeDefinitions = [
    {
      title: t('Profile Drives'),
      type: [ProfileConfig.ProfileDriveType],
    },
    {
      title: t('Channel Drives'),
      type: [BlogConfig.DriveType, BlogConfig.FeedDrive.type],
    },
    {
      title: t('App specific Drives'),
    },
    {
      title: t('System Drives'),
      type: [ContactConfig.ContactTargetDrive.type, '90f5e74ab7f9efda0ac298373a32ad8c'],
    },
  ];

  const appDrives = drives?.filter((drive) => {
    const flatTypes = driveTypeDefinitions.map((type) => type.type).flat();
    return !flatTypes.includes(drive.targetDriveInfo.type);
  });

  return (
    <>
      <PageMeta icon={HardDrive} title={t('My Drives')} />
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
                  ? (drives?.filter((drive) =>
                      type.type.some((type) => stringGuidsEqual(drive.targetDriveInfo.type, type))
                    ) ?? [])
                  : appDrives
                )?.map((driveDef) => (
                  <CardLink
                    title={driveDef.name}
                    href={`/owner/drives/${driveDef.targetDriveInfo.alias}_${driveDef.targetDriveInfo.type}`}
                    key={`${driveDef.targetDriveInfo.alias}-${driveDef.targetDriveInfo.type}`}
                  >
                    <h3 className="text-lg">Metadata</h3>
                    {isDebug &&
                        <>
                            <p>DriveId</p>
                            <ul>driveDef.DriveId</ul>
                        </>}
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
