import { useIntersection, Person } from '@youfoundation/common-app';
import { useState, useRef } from 'react';

const IdentityImage = ({
  odinId,
  className,
  size,
}: {
  odinId: string;
  size?: 'xs' | 'sm' | 'md' | 'custom';
  className?: string;
}) => {
  const [isInView, setIsInView] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useIntersection(wrapperRef, () => {
    setIsInView(true);
  });

  return (
    <div ref={wrapperRef} className="contents">
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
        />
      ) : (
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
      )}
    </div>
  );
};

export default IdentityImage;
