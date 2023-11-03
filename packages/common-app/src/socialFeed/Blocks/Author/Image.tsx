import { GetTargetDriveFromProfileId, BuiltInProfiles } from '@youfoundation/js-lib/profile';
import { useState, useRef } from 'react';
import { Image, t, useIntersection } from '@youfoundation/common-app';
import { useSiteData } from '@youfoundation/common-app';

import { Person } from '@youfoundation/common-app';
import { DEFAULT_PAYLOAD_KEY } from '@youfoundation/js-lib/core';

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
      fileId={owner?.profileImageId}
      fileKey={DEFAULT_PAYLOAD_KEY}
      previewThumbnail={owner?.profileImagePreviewThumbnail}
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
      alt={t('Your profile picture')}
    />
  );
};

export const ConnectionImage = ({ odinId, className, size }: ConnectionImageProps) => {
  const [isInView, setIsInView] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useIntersection(wrapperRef, () => {
    setIsInView(true);
  });

  return (
    <>
      {odinId && isInView ? (
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
          alt={`${t('The profile picture of')} ${odinId}`}
        />
      ) : (
        <div ref={wrapperRef}>
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
