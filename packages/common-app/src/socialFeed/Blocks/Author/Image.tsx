import { GetTargetDriveFromProfileId, BuiltInProfiles } from '@youfoundation/js-lib/profile';
import { useState, useRef } from 'react';
import { Image, useIntersection } from '@youfoundation/common-app';
import { useSiteData } from '@youfoundation/common-app';

import { Person } from '@youfoundation/common-app';

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
          src={`https://api.${odinId}/pub/image`}
          className={`${
            size === 'xs'
              ? 'h-[2rem] w-[2rem]'
              : size === 'sm'
              ? 'h-[3rem] w-[3rem]'
              : size === 'md'
              ? 'h-[5rem] w-[5rem]'
              : ''
          } rounded-full ${className ?? ''}`}
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
