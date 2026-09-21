import { Image } from '@homebase-id/common-app';
import type { CardImage } from '../useCardData';

export const DriveImage = ({
  image,
  alt,
  className,
}: {
  image: CardImage;
  alt: string;
  className?: string;
}) => (
  <Image
    {...image}
    fileId={image.fileId}
    fileKey={image.fileKey}
    alt={alt}
    className={className}
    fit="cover"
  />
);
