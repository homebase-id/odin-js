import { GetTargetDriveFromProfileId, BuiltInProfiles } from '@homebase-id/js-lib/profile';
import { Image } from '../../../media/Image';
import { t } from '../../../helpers/i18n/dictionary';
import { useSiteData } from '../../../hooks/siteData/useSiteData';
import { ApiType, OdinClient } from '@homebase-id/js-lib/core';
import { ContactImage } from '../../../identity';
import { useIsConnected } from '../../../hooks';
import { FallbackImg } from '../../../ui';

interface ImageProps {
  className?: string;
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'custom';
}

interface ConnectionImageProps extends ImageProps {
  odinId?: string;
  excludeLink?: boolean;
}

const getSizeClassname = (size: ImageProps['size']) => {
  switch (size) {
    case 'xxs':
      return 'h-[1.5rem] w-[1.5rem]';
    case 'xs':
      return 'h-[2rem] w-[2rem]';
    case 'sm':
      return 'h-[3rem] w-[3rem]';
    case 'md':
      return 'h-[5rem] w-[5rem]';
    default:
      return '';
  }
};

export const AuthorImage = ({ odinId, ...props }: ConnectionImageProps) => {
  if (!odinId || odinId === window.location.hostname) return <OwnerImage {...props} />;

  if (props.excludeLink) {
    return <ConnectionImage odinId={odinId} {...props} />;
  }

  const host = new OdinClient({ hostIdentity: odinId, api: ApiType.Guest }).getRoot();
  return (
    <a href={host}>
      <ConnectionImage odinId={odinId} {...props} />
    </a>
  );
};

export const OwnerImage = ({ className, size }: ImageProps) => {
  const { owner } = useSiteData().data ?? {};
  const targetDrive = GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId);

  return owner?.profileImageFileId ? (
    <Image
      fileId={owner?.profileImageFileId}
      fileKey={owner?.profileImageFileKey}
      previewThumbnail={owner?.profileImagePreviewThumbnail}
      lastModified={owner?.profileImageLastModified}
      targetDrive={targetDrive}
      className={`${getSizeClassname(size)} overflow-hidden rounded-full ${className ?? ''}`}
      fit="cover"
      alt={t('You')}
      title={t('You')}
    />
  ) : (
    <FallbackImg
      odinId={window.location.hostname}
      className={`${getSizeClassname(size)} overflow-hidden rounded-full ${className ?? ''}`}
    />
  );
};

export const ConnectionImage = (props: ConnectionImageProps) => {
  const isConnected = useIsConnected(props.odinId || undefined).data;

  return (
    <ContactImage
      {...props}
      odinId={props.odinId}
      className={`${getSizeClassname(props.size)} overflow-hidden rounded-full ${props.className ?? ''}`}
      canSave={!!isConnected}
    />
  );
};
