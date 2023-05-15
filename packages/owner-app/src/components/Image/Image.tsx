import { TargetDrive } from '@youfoundation/js-lib';
import { useRef, useState } from 'react';
import useImage from '../../hooks/media/useImage';
import { useIntersection } from '@youfoundation/common-app';

interface ImageProps {
  targetDrive: TargetDrive;
  fileId: string | undefined;
  className?: string;
  alt?: string;
  title?: string;
}

const Image = ({ targetDrive, fileId, className, alt, title }: ImageProps) => {
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const { data: imageUrl } = useImage(isInView ? fileId : undefined, targetDrive).fetch;

  useIntersection(imgRef, () => {
    setIsInView(true);
  });

  // const discardUrls = () => {
  //   if (imageUrl) {
  //     window.URL.revokeObjectURL(imageUrl);
  //   }
  // };

  return (
    <img
      src={imageUrl}
      alt={isInView && imageUrl ? alt : ' '}
      className={`${className} ${
        (!isInView || !imageUrl) && 'h-full w-full animate-pulse bg-slate-100'
      }`}
      title={title}
      ref={imgRef}
      // onLoad={discardUrls}
    />
  );
};

export default Image;
