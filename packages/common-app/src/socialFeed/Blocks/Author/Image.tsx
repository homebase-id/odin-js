import { GetTargetDriveFromProfileId, BuiltInProfiles } from '@youfoundation/js-lib/profile';
import { Image } from '../../../media/Image';
import { t } from '../../../helpers/i18n/dictionary';
import { Person } from '../../../ui/Icons/Person';
import { useSiteData } from '../../../hooks/siteData/useSiteData';

interface ImageProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'custom';
}

interface ConnectionImageProps extends ImageProps {
  odinId?: string;
}

export const AuthorImage = ({ odinId, ...props }: ConnectionImageProps) => {
  const ownerHost = window.location.hostname;

  if (odinId && ownerHost !== odinId) {
    return (
      <a href={`https://${odinId}`}>
        <ConnectionImage {...props} odinId={odinId} />
      </a>
    );
  } else {
    return <OwnerImage {...props} />;
  }
};

export const OwnerImage = ({ className, size }: ImageProps) => {
  const { owner } = useSiteData().data ?? {};
  const targetDrive = GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId);
  return (
    <Image
      fileId={owner?.profileImageFileId}
      fileKey={owner?.profileImageFileKey}
      previewThumbnail={owner?.profileImagePreviewThumbnail}
      lastModified={owner?.profileImageLastModified}
      targetDrive={targetDrive}
      className={`${
        size === 'xs'
          ? 'h-[2rem] w-[2rem]'
          : size === 'sm'
            ? 'h-[3rem] w-[3rem]'
            : size === 'md'
              ? 'h-[5rem] w-[5rem]'
              : ''
      } rounded-full ${className ?? ''}`}
      fit="cover"
      alt={t('You')}
      title={t('You')}
    />
  );
};

export const ConnectionImage = ({ odinId, className, size }: ConnectionImageProps) => {
  return (
    <>
      {odinId ? (
        <img
          src={`https://${odinId}/pub/image`}
          className={`${
            size === 'xs'
              ? 'h-[2rem] w-[2rem]'
              : size === 'sm'
                ? 'h-[3rem] w-[3rem]'
                : size === 'md'
                  ? 'h-[5rem] w-[5rem]'
                  : ''
          } rounded-full ${className ?? ''}`}
          alt={`${odinId}`}
          title={`${odinId}`}
          onError={(e) => {
            console.warn('failed to fetch profile image', e);
          }}
        />
      ) : (
        <div>
          <Person
            className={
              size === 'xs'
                ? 'h-[2rem] w-[2rem]'
                : size === 'sm'
                  ? 'h-[3rem] w-[3rem]'
                  : size === 'md'
                    ? 'h-[5rem] w-[5rem]'
                    : ''
            }
          />
        </div>
      )}
    </>
  );
};
