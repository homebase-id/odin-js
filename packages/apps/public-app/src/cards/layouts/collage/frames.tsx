import type { CSSProperties } from 'react';
import { portraitZoom, type LayoutProps, type Portrait } from '../../CardDesign';
import { ownerName, type CardData, type CardPhoto } from '../../useCardData';
import { CardPortrait, portraitImage } from '../../parts/Portrait';

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

// Slot widths are percentages of the row, which zoom does not scale, so size scales the width itself
const scaled = (portrait: Portrait, pct: number) =>
  Math.round(pct * portraitZoom(portrait.size) * 100) / 100;
const slotWidth = (portrait: Portrait, pct: number) => `${scaled(portrait, pct)}%`;

const frameStyle = (portrait: Portrait, pct: number): CSSProperties => {
  const style: CSSProperties = { width: slotWidth(portrait, pct) };
  if (portrait.tilt) style.transform = `rotate(${portrait.tilt}deg)`;
  return Object.keys(style).length ? style : undefined;
};

// A polaroid: the frame carries the tilt, tape and shadow; the picture sits square inside it
export const Print = ({
  portrait,
  image,
  alt,
  width,
  className,
  tapeClassName,
}: Frame & { width: number; className: string; tapeClassName: string }) => {
  if (!image) return null;
  return (
    <div
      className={`relative bg-[var(--card-surface)] ${portrait.shadow ? FRAME_SHADOWS[portrait.shadow] : ''} ${className}`}
      style={frameStyle(portrait, width)}
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
  width,
  rightAlign,
  className,
}: Frame & { ring: number; width: number; rightAlign?: boolean; className: string }) => (
  <CardPortrait
    portrait={{ ...portrait, size: undefined, ring: portrait.ring ?? ring }}
    style={{
      width: slotWidth(portrait, width),
      ...(rightAlign ? { marginLeft: `${100 - scaled(portrait, width)}%` } : null),
    }}
    image={image}
    alt={alt}
    className={`${portrait.shape === 'ellipse' ? 'aspect-[88/112]' : 'aspect-square'} ${className}`}
  />
);
