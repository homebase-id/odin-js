import { Image } from '@homebase-id/common-app';
import type { CardPhoto } from '../useCardData';

// Same wrapper + cover <img> that Image draws, so `className` means the same thing for both kinds
export const CardImg = ({
  image,
  alt,
  className,
}: {
  image: CardPhoto;
  alt: string;
  className?: string;
}) =>
  'src' in image ? (
    <div
      className={`${className?.includes('absolute') ? '' : 'relative'} overflow-hidden ${className ?? ''}`}
    >
      <img src={image.src} alt={alt} className="h-full w-full object-cover" />
    </div>
  ) : (
    <Image
      {...image}
      fileId={image.fileId}
      fileKey={image.fileKey}
      alt={alt}
      className={className}
      fit="cover"
    />
  );
