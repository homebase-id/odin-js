import type { ReactNode } from 'react';
import type { BackgroundId, CardDesign } from '../CardDesign';

const W = 100;
const H = 160;

const SHAPES: Partial<Record<BackgroundId, ReactNode>> = {
  circles: (
    <>
      <circle cx={W * 0.85} cy={H * 0.15} r={W * 0.34} fill="currentColor" />
      <circle cx={W * 0.1} cy={H * 0.9} r={W * 0.22} fill="currentColor" />
      <circle
        cx={W * 0.85}
        cy={H * 0.15}
        r={W * 0.45}
        fill="none"
        stroke="currentColor"
        strokeWidth={W * 0.03}
      />
    </>
  ),
  waves: (
    <g fill="none" stroke="currentColor" strokeWidth={H * 0.045}>
      {[0, 1, 2].map((row) => {
        const y = H * (0.3 + row * 0.22);
        const d = H * 0.12;
        return (
          <path
            key={row}
            d={`M0 ${y}C${W * 0.25} ${y - d} ${W * 0.25} ${y - d} ${W * 0.5} ${y}C${W * 0.75} ${y + d} ${W * 0.75} ${y + d} ${W} ${y}`}
          />
        );
      })}
    </g>
  ),
  dots: (
    <>
      {[0, 1, 2, 3, 4].flatMap((c) =>
        [0, 1, 2, 3, 4].map((r) => (
          <circle
            key={`${c}-${r}`}
            cx={W * (0.12 + c * 0.19)}
            cy={H * (0.12 + r * 0.19)}
            r={W * 0.04}
            fill="currentColor"
          />
        ))
      )}
    </>
  ),
  blobs: (
    <>
      <path
        fill="currentColor"
        d={`M${W * 0.55} ${H * 0.05}C${W * 1.05} 0 ${W} ${H * 0.55} ${W * 0.7} ${H * 0.55}C${W * 0.4} ${H * 0.55} ${W * 0.2} ${H * 0.15} ${W * 0.55} ${H * 0.05}Z`}
      />
      <circle cx={W * 0.2} cy={H * 0.82} r={W * 0.2} fill="currentColor" />
    </>
  ),
  lines: (
    <g stroke="currentColor" strokeWidth={H * 0.04}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const x = W * (i * 0.25 - 0.2);
        return <line key={i} x1={x} y1={H} x2={x + W * 0.6} y2={0} />;
      })}
    </g>
  ),
};

export const CardBackground = ({ design }: { design: CardDesign }) => {
  const shapes = design.background ? SHAPES[design.background] : undefined;
  if (!shapes) return null;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full text-[color:var(--card-ink)] opacity-[0.22]"
    >
      {shapes}
    </svg>
  );
};
