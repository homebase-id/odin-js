import { GetTargetDriveFromProfileId, BuiltInProfiles } from '@homebase-id/js-lib/profile';
import { Image } from '../../../media/Image';
import { t } from '../../../helpers/i18n/dictionary';
import { Person } from '../../../ui/Icons/Person';
import { useSiteData } from '../../../hooks/siteData/useSiteData';
import { ApiType, DotYouClient } from '@homebase-id/js-lib/core';

interface ImageProps {
  className?: string;
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'custom';
}

interface ConnectionImageProps extends ImageProps {
  odinId?: string;
  excludeLink?: boolean;
}

export const AuthorImage = ({ odinId, ...props }: ConnectionImageProps) => {
  const ownerHost = window.location.hostname;

  if (odinId && ownerHost !== odinId) {
    const host = new DotYouClient({ identity: odinId, api: ApiType.Guest }).getRoot();
    if (props.excludeLink) {
      return <ConnectionImage {...props} odinId={odinId} />;
    }
    return (
      <a href={host}>
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
  const host = new DotYouClient({ identity: odinId, api: ApiType.Guest }).getRoot();
  return (
    <>
      {odinId ? (
        <img
          src={`${host}/pub/image`}
          className={`${
            size === 'xxs'
              ? 'h-[1.5rem] w-[1.5rem]'
              : size === 'xs'
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
