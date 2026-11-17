import { CardImg } from './CardImg';
import type { LayoutProps } from '../CardDesign';

const CirclesArt = () => (
  <svg
    aria-hidden
    className="absolute inset-0 h-full w-full"
    preserveAspectRatio="xMidYMid slice"
    viewBox="0 0 400 800"
  >
    <g fill="none" stroke="currentColor" strokeOpacity="0.14">
      <circle cx="-20" cy="150" r="130" />
      <circle cx="-20" cy="150" r="90" />
      <circle cx="430" cy="560" r="150" />
      <circle cx="430" cy="560" r="105" />
    </g>
    <g fill="currentColor" fillOpacity="0.08">
      <circle cx="340" cy="90" r="70" />
      <circle cx="60" cy="640" r="80" />
    </g>
  </svg>
);

const SpeckleArt = () => (
  <svg aria-hidden className="absolute inset-0 h-full w-full">
    <defs>
      <pattern id="card-speckle" width="46" height="46" patternUnits="userSpaceOnUse">
        <circle cx="7" cy="9" r="1" fill="currentColor" fillOpacity="0.18" />
        <circle cx="31" cy="27" r="0.8" fill="currentColor" fillOpacity="0.14" />
        <circle cx="18" cy="40" r="0.7" fill="currentColor" fillOpacity="0.12" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#card-speckle)" />
  </svg>
);

export const CardGround = ({ design, data }: LayoutProps) => {
  const { ground } = design;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden text-[color:var(--card-ink)]"
    >
      {ground.photo && data.photo ? (
        <>
          <CardImg image={data.photo} alt="" className="h-full w-full" />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, transparent 25%, color-mix(in srgb, var(--card-ground) ${Math.round(
                (ground.scrim ?? 0.8) * 100
              )}%, transparent) 65%, var(--card-ground))`,
            }}
          />
        </>
      ) : null}
      {ground.art === 'circles' ? <CirclesArt /> : null}
      {ground.art === 'speckle' ? <SpeckleArt /> : null}
    </div>
  );
};
