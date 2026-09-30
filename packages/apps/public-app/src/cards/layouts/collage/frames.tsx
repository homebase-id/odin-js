import type { CSSProperties } from 'react';
import type { LayoutProps, Portrait } from '../../CardDesign';
import { ownerName, type CardData, type CardPhoto } from '../../useCardData';
import { CardPortrait, portraitImage } from '../../parts/Portrait';
import { AudienceChip } from '../../parts/AudienceChip';

type Frame = { portrait: Portrait; image: CardPhoto | undefined; alt: string };

// The collage has two slots: a print (first portrait) and a cut-out (second).
// Only the owner's photo is named; the header image is scenery.
// eslint-disable-next-line react-refresh/only-export-components
export const collageFrames = ({ design, data }: LayoutProps): [Frame?, Frame?] => {
  const name = ownerName(data);
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
export const firstNameOnly = (data: CardData): CardData => ({ ...data, surName: undefined });

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

// A torn strip of the same tape, written on by hand in the role line's weight
export const AudienceTape = ({
  audience,
  className,
}: {
  audience: CardData['audience'];
  className: string;
}) => (
  <div style={TAPE_STYLE} className={`w-fit -rotate-2 leading-[1.3] empty:hidden ${className}`}>
    {/* The glyph box is one line tall. The end pad is inside the text's clip: the hand's last stroke
        overhangs its letter. Two lines are evened out, so the strip is not left half bare.
        The Arabic hand is wider than the Latin one */}
    <AudienceChip
      audience={audience}
      className="max-w-full gap-1.5 pe-1.5 ps-2.5 font-[family-name:var(--card-label)] font-medium text-[color:var(--card-ink)]"
      glyphClassName="h-[1.3em] w-[0.72em] [&_svg]:stroke-[2.5]"
      textClassName="pe-1 ![text-wrap:balance]"
      joinedClassName="text-[0.74em] leading-[calc(1.3/0.74)]"
    />
  </div>
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
