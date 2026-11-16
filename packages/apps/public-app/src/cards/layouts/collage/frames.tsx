import type { CSSProperties } from 'react';
import type { LayoutProps, Portrait, PortraitSize } from '../../CardDesign';
import { ownerName, type CardData, type CardPhoto } from '../../useCardData';
import { CardPortrait, portraitImage } from '../../parts/Portrait';

type Frame = { portrait: Portrait; image: CardPhoto | undefined; alt: string };

// The collage has two slots: a print (first portrait) and a cut-out (second).
// Only the owner's photo is named; the header image is scenery.
// eslint-disable-next-line react-refresh/only-export-components
export const collageFrames = ({ design, data }: LayoutProps): [Frame?, Frame?] => {
  const name = ownerName(data);
  // One size on the print scales the cut-out with it unless the cut-out names its own
  const printSize = design.portraits[0]?.size;
  const [print, cutout] = design.portraits.map((portrait, index) => ({
    portrait:
      index === 1 && !portrait.size && printSize ? { ...portrait, size: printSize } : portrait,
    image: portraitImage(portrait, data),
    alt: portrait.source === 'photo' ? name : '',
  }));
  return [print?.image ? print : undefined, cutout?.image ? cutout : undefined];
};

// The collage signs with a first name only, as both references do; CardName falls back to the
// display name when there is no first name
// eslint-disable-next-line react-refresh/only-export-components
export const firstNameOnly = (data: CardData): CardData => ({ ...data, surName: undefined });

// Print and cut-out widths per size; medium is the width each layout always drew
// eslint-disable-next-line react-refresh/only-export-components
export const PRINT_WIDTHS = {
  card: { small: 'w-[40%]', medium: 'w-[49%]', large: 'w-[56%]' },
  page: { small: 'w-[66%]', medium: 'w-[80%]', large: 'w-[90%]' },
} satisfies Record<'card' | 'page', Record<PortraitSize, string>>;
// eslint-disable-next-line react-refresh/only-export-components
export const CUTOUT_WIDTHS = {
  card: { small: 'w-[30%]', medium: 'w-[38%]', large: 'w-[40%]' },
  page: { small: 'w-[50%]', medium: 'w-[61%]', large: 'w-[68%]' },
} satisfies Record<'card' | 'page', Record<PortraitSize, string>>;
// The page's cut-out overlaps the print from the right, so a narrower one starts further in
// eslint-disable-next-line react-refresh/only-export-components
export const CUTOUT_OFFSETS: Record<PortraitSize, string> = {
  small: 'ml-[50%]',
  medium: 'ml-[39%]',
  large: 'ml-[32%]',
};

const FRAME_SHADOWS = {
  soft: 'shadow-[0_4px_12px_rgba(0,0,0,0.2)]',
  hard: 'shadow-[6px_6px_0_rgba(0,0,0,0.3)]',
};

// See-through, so it takes the tone of whatever it is stuck on
const TAPE_STYLE: CSSProperties = {
  backgroundColor:
    'color-mix(in srgb, color-mix(in srgb, var(--card-muted) 28%, var(--card-ground)) 80%, transparent)',
};

// A strip of masking tape; the caller positions and sizes it
export const Tape = ({ className }: { className: string }) => (
  <span
    aria-hidden
    className={`pointer-events-none absolute z-10 ${className}`}
    style={TAPE_STYLE}
  />
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
      className={`relative bg-[var(--card-surface)] ${portrait.shadow ? FRAME_SHADOWS[portrait.shadow] : ''} ${className}`}
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
