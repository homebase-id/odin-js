import type { ReactNode } from 'react';
import type { BackgroundId, CardDesign } from '../CardDesign';

const W = 100;
const H = 160;

// Mirrored in chat-kmp CardBackgrounds.kt.
const CONFETTI: [number, number][] = [
  [0.15, 0.1],
  [0.7, 0.18],
  [0.4, 0.32],
  [0.85, 0.45],
  [0.2, 0.55],
  [0.6, 0.68],
  [0.3, 0.85],
  [0.8, 0.9],
];
const SPARKLES: [number, number, number][] = [
  [0.2, 0.15, 0.08],
  [0.75, 0.3, 0.12],
  [0.35, 0.55, 0.06],
  [0.8, 0.7, 0.09],
  [0.15, 0.85, 0.1],
];

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
  rings: (
    <g fill="none" stroke="currentColor" strokeWidth={W * 0.03}>
      {[1, 2, 3, 4].map((k) => (
        <circle key={k} cx={W * 0.15} cy={H * 0.85} r={W * 0.25 * k} />
      ))}
    </g>
  ),
  grid: (
    <g stroke="currentColor" strokeWidth={W * 0.015}>
      {[1, 2, 3, 4].map((i) => (
        <line key={`v${i}`} x1={(W * i) / 5} y1={0} x2={(W * i) / 5} y2={H} />
      ))}
      {[1, 2, 3, 4, 5, 6, 7].map((j) => (
        <line key={`h${j}`} x1={0} y1={(H * j) / 8} x2={W} y2={(H * j) / 8} />
      ))}
    </g>
  ),
  checker: (
    <>
      {[0, 1, 2, 3, 4].flatMap((c) =>
        [0, 1, 2, 3, 4, 5, 6, 7]
          .filter((r) => (c + r) % 2 === 0)
          .map((r) => (
            <rect
              key={`${c}-${r}`}
              x={(c * W) / 5}
              y={(r * H) / 8}
              width={W / 5}
              height={H / 8}
              fill="currentColor"
            />
          ))
      )}
    </>
  ),
  zigzag: (
    <g fill="none" stroke="currentColor" strokeWidth={H * 0.025}>
      {[0, 1, 2, 3, 4].map((k) => {
        const y = H * (0.15 + k * 0.18);
        const points = [0, 1, 2, 3, 4]
          .map((i) => `${(W * i) / 4},${i % 2 === 0 ? y : y + H * 0.06}`)
          .join(' ');
        return <polyline key={k} points={points} />;
      })}
    </g>
  ),
  confetti: (
    <>
      {CONFETTI.map(([cx, cy]) => {
        const t = W * 0.07;
        const x = W * cx;
        const y = H * cy;
        return (
          <path
            key={`${cx}-${cy}`}
            fill="currentColor"
            d={`M${x} ${y - t}L${x + t} ${y + t}L${x - t} ${y + t}Z`}
          />
        );
      })}
    </>
  ),
  contours: (
    <g fill="none" stroke="currentColor" strokeWidth={W * 0.02}>
      {[1, 2, 3, 4].map((k) => (
        <ellipse key={`a${k}`} cx={W * 0.7} cy={H * 0.35} rx={W * 0.15 * k} ry={H * 0.08 * k} />
      ))}
      {[1, 2, 3].map((k) => (
        <ellipse key={`b${k}`} cx={W * 0.2} cy={H * 0.8} rx={W * 0.15 * k} ry={H * 0.08 * k} />
      ))}
    </g>
  ),
  halftone: (
    <>
      {[0, 1, 2, 3, 4, 5].flatMap((c) =>
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((r) => (
          <circle
            key={`${c}-${r}`}
            cx={W * (0.08 + c * 0.168)}
            cy={H * (0.05 + r * 0.1)}
            r={W * (0.01 + r * 0.007)}
            fill="currentColor"
          />
        ))
      )}
    </>
  ),
  sparkles: (
    <>
      {SPARKLES.map(([cx, cy, size]) => {
        const x = W * cx;
        const y = H * cy;
        const t = W * size;
        return (
          <path
            key={`${cx}-${cy}`}
            fill="currentColor"
            d={`M${x} ${y - t}Q${x} ${y} ${x + t} ${y}Q${x} ${y} ${x} ${y + t}Q${x} ${y} ${x - t} ${y}Q${x} ${y} ${x} ${y - t}Z`}
          />
        );
      })}
    </>
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
