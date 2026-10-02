import { useParams } from 'react-router-dom';
import { getOwnerAppPath, getOwnerDrivePath, JsonViewer, t } from '@homebase-id/common-app';
import { useOwnerAppName } from '../../../hooks/apps/useOwnerAppName';
import { File } from '@homebase-id/common-app/icons';
import { useDrive } from '../../../hooks/drives/useDrive';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import { PageMeta } from '@homebase-id/common-app';
import { useFileQuery } from '../../../hooks/files/useFiles';
import { SystemFileType } from '@homebase-id/js-lib/core';

const FileDetails = () => {
  const { driveKey, systemFileType, fileKey } = useParams();
  const splittedDriveKey = driveKey ? driveKey.split('_') : undefined;

  const targetDrive = splittedDriveKey
    ? { alias: splittedDriveKey[0], type: splittedDriveKey[1] }
    : undefined;
  const {
    fetch: { data: driveDef, isLoading: driveDefLoading },
  } = useDrive({
    targetDrive,
  });
  const appName = useOwnerAppName(driveDef?.appId ?? undefined);

  const { data: file, isLoading: fileLoading } = useFileQuery({
    targetDrive,
    id: fileKey,
    systemFileType: systemFileType as SystemFileType,
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
          { href: '/owner/apps', title: 'My apps' },
          { href: getOwnerAppPath(driveDef.appId), title: appName ?? '' },
          {
            href: getOwnerDrivePath(driveDef.appId, driveDef.targetDriveInfo),
            title: driveDef.name ?? '',
          },
          { title: fileKey ?? '' },
        ]}
      />
      {/* Content JSON Viewer */}
      {file?.fileMetadata?.appData?.content && (
        <div className="mx-auto mb-6 w-full max-w-4xl px-2">
          <JsonViewer
            data={file.fileMetadata.appData.content}
            wrapLines={true}
            title="Text"
            className="w-full"
          />
        </div>
      )}

      {/* Full File JSON Viewer */}
      <div className="mx-auto w-full max-w-4xl overflow-auto px-2">
        <JsonViewer data={file} />
      </div>
    </>
  );
};

export default FileDetails;
