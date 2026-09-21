import type { CardPhoto } from '../useCardData';
import { DriveImage } from './DriveImage';

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
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      <img src={image.src} alt={alt} className="h-full w-full object-cover" />
    </div>
  ) : (
    <DriveImage image={image} alt={alt} className={className} />
  );
