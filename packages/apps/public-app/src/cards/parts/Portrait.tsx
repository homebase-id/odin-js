import { Image } from '@homebase-id/common-app';
import type { CardData, CardImage } from '../useCardData';
import type { Portrait } from '../CardDesign';

const SHAPES: Record<Portrait['shape'], string> = {
  circle: 'rounded-full',
  square: 'rounded-none',
  rounded: 'rounded-2xl',
  ellipse: 'rounded-[50%]',
};
const SHADOWS = {
  hard: 'shadow-[6px_6px_0_rgba(0,0,0,0.3)]',
  soft: 'shadow-[0_10px_24px_-10px_rgba(0,0,0,0.35)]',
};

// eslint-disable-next-line react-refresh/only-export-components
export const portraitImage = (portrait: Portrait, data: CardData) =>
  portrait.source === 'photo' ? data.photo : data.header;

export const CardPortrait = ({
  portrait,
  image,
  alt,
  className,
}: {
  portrait: Portrait;
  image: CardImage | undefined;
  alt: string;
  className?: string;
}) => {
  if (!image) return null;
  return (
    <div
      className={`relative ${className ?? ''}`}
      style={portrait.tilt ? { transform: `rotate(${portrait.tilt}deg)` } : undefined}
    >
      {portrait.tape ? (
        <span
          aria-hidden
          className="absolute -top-2 left-1/2 z-10 h-5 w-16 -translate-x-1/2 -rotate-3"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--card-muted) 35%, var(--card-surface))',
            opacity: 0.85,
          }}
        />
      ) : null}
      <div
        className={`h-full w-full overflow-hidden ${SHAPES[portrait.shape]} ${
          portrait.shadow ? SHADOWS[portrait.shadow] : ''
        } ${portrait.mono ? 'grayscale' : ''}`}
        style={portrait.ring ? { border: `${portrait.ring}px solid var(--card-surface)` } : undefined}
      >
        <Image {...image} fileId={image.fileId} fileKey={image.fileKey} alt={alt} className="h-full w-full" fit="cover" />
      </div>
    </div>
  );
};
