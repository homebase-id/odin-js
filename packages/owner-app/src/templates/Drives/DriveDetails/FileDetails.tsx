import { useParams } from 'react-router-dom';
import { t } from '@homebase-id/common-app';
import { File } from '@homebase-id/common-app/icons';
import { useDrive } from '../../../hooks/drives/useDrive';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import { PageMeta } from '../../../components/ui/PageMeta/PageMeta';
import { useFileQuery } from '../../../hooks/files/useFiles';

const DriveDetails = () => {
  const { driveKey, fileQuery } = useParams();
  const splittedDriveKey = driveKey ? driveKey.split('_') : undefined;

  const targetDrive = splittedDriveKey
    ? { alias: splittedDriveKey[0], type: splittedDriveKey[1] }
    : undefined;
  const {
    fetch: { data: driveDef, isLoading: driveDefLoading },
  } = useDrive({
    targetDrive,
  });

  const { data: file, isLoading: fileLoading } = useFileQuery({
    targetDrive,
    id: fileQuery,
  });

  if (driveDefLoading || fileLoading) return <LoadingDetailPage />;

  if (!driveDef) return <>{t('No matching drive found')}</>;
  if (!file) return <>{t('No matching file found')}</>;

  return (
    <>
      <PageMeta
        icon={File}
        title={`File on ${driveDef.name}`}
        breadCrumbs={[
          { href: '/owner/drives', title: 'My Drives' },
          {
            href: `/owner/drives/${driveDef.targetDriveInfo.alias}_${driveDef.targetDriveInfo.type}`,
            title: driveDef.name ?? '',
          },
          { title: fileQuery ?? '' },
        ]}
      />

      <pre className="max-w-[calc(100vw-1rem)] overflow-auto sm:max-w-[calc(100vw-32rem)]">
        {JSON.stringify(file, null, 2)}
      </pre>
    </>
  );
};

export default DriveDetails;
