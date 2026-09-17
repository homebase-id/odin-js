import type { CSSProperties } from 'react';
import type { LayoutProps, Portrait } from '../../CardDesign';
import type { CardData, CardImage } from '../../useCardData';
import { CardPortrait, portraitImage } from '../../parts/Portrait';

export const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--card-accent)]';

type Frame = { portrait: Portrait; image: CardImage | undefined; alt: string };

// The collage has two slots: a print (first portrait) and a cut-out (second).
// Only the owner's photo is named; the header image is scenery.
// eslint-disable-next-line react-refresh/only-export-components
export const collageFrames = ({ design, data }: LayoutProps): [Frame?, Frame?] => {
  const name = [data.firstName, data.surName].filter(Boolean).join(' ') || data.displayName || data.odinId;
  const [print, cutout] = design.portraits.map((portrait) => ({
    portrait,
    image: portraitImage(portrait, data),
    alt: portrait.source === 'photo' ? name : '',
  }));
  return [print?.image ? print : undefined, cutout?.image ? cutout : undefined];
};

// The collage signs with a first name only, as both references do; CardName falls back to the
// display name when there is no first name
// eslint-disable-next-line react-refresh/only-export-components
export const signature = (data: CardData): CardData => ({ ...data, surName: undefined });

const SHADOWS = {
  soft: 'shadow-[0_4px_12px_rgba(0,0,0,0.2)]',
  hard: 'shadow-[6px_6px_0_rgba(0,0,0,0.3)]',
};

const TAPE_STYLE: CSSProperties = {
  backgroundColor: 'color-mix(in srgb, var(--card-muted) 28%, var(--card-ground))',
  opacity: 0.8,
};

// A strip of masking tape; the caller positions and sizes it
export const Tape = ({ className }: { className: string }) => (
  <span aria-hidden className={`pointer-events-none absolute z-10 ${className}`} style={TAPE_STYLE} />
);

const tilt = (deg?: number): CSSProperties | undefined =>
  deg ? { transform: `rotate(${deg}deg)` } : undefined;

// A polaroid: the frame carries the tilt, tape and shadow; the picture sits square inside it
export const Print = ({
  portrait,
  image,
  alt,
  className,
  tapeClassName,
}: Frame & { className: string; tapeClassName: string }) => {
  if (!image) return null;
  return (
    <div
      className={`relative bg-[var(--card-surface)] ${portrait.shadow ? SHADOWS[portrait.shadow] : ''} ${className}`}
      style={tilt(portrait.tilt)}
    >
      {portrait.tape ? <Tape className={tapeClassName} /> : null}
      <CardPortrait
        portrait={{ source: portrait.source, shape: portrait.shape, mono: portrait.mono }}
        image={image}
        alt={alt}
        className="aspect-square w-full"
      />
    </div>
  );
};

// A cut-out: the design's own shape with a white edge
export const Cutout = ({
  portrait,
  image,
  alt,
  ring,
  className,
}: Frame & { ring: number; className: string }) => (
  <CardPortrait
    portrait={{ ...portrait, ring: portrait.ring ?? ring }}
    image={image}
    alt={alt}
    className={`${portrait.shape === 'ellipse' ? 'aspect-[88/112]' : 'aspect-square'} ${className}`}
  />
);
