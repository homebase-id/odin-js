import type { CSSProperties } from 'react';
import type { CardData } from './useCardData';

export type FontId =
  | 'montserrat'
  | 'montserrat-alt'
  | 'newsreader'
  | 'caveat'
  | 'archivo-black'
  | 'space-mono';

// The Arabic faces only cover Arabic (unicode-range), so they sit behind the face they stand in for:
// a plain sans for the sans, a pen-written ruqaa for the hand, a squared kufi for the mono
export const FONT_STACKS: Record<FontId, string> = {
  montserrat:
    "'Montserrat', 'IBM Plex Sans Arabic', 'Avenir Next', 'Segoe UI', system-ui, sans-serif",
  'montserrat-alt':
    "'Montserrat Alternates', 'IBM Plex Sans Arabic', 'Avenir Next', 'Segoe UI', system-ui, sans-serif",
  newsreader: "'Newsreader', 'Iowan Old Style', Georgia, serif",
  caveat: "'Caveat', 'Aref Ruqaa', 'Bradley Hand', 'Segoe Script', cursive",
  'archivo-black': "'Archivo Black', 'Helvetica Neue', Impact, system-ui, sans-serif",
  'space-mono': "'Space Mono', 'Reem Kufi', ui-monospace, 'SF Mono', Menlo, monospace",
};

export type LayoutId = 'poster' | 'board' | 'collage' | 'dossier';
export const BLOCK_KINDS = ['chat', 'links', 'moments', 'posts'] as const;
export const PRESENTATIONS = ['bare', 'boxed', 'row', 'button'] as const;
export const SOCIALS = ['glyphs', 'bar', 'wordmark', 'handles'] as const;
export const SHAPES = ['circle', 'square', 'rounded', 'ellipse'] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];
export type Presentation = (typeof PRESENTATIONS)[number];
export type SocialsVariant = (typeof SOCIALS)[number];

export type Portrait = {
  source: 'photo' | 'header';
  shape: (typeof SHAPES)[number];
  ring?: number;
  shadow?: 'soft' | 'hard';
  tilt?: number;
  tape?: boolean;
  mono?: boolean;
};

export type CardDesign = {
  version: 1;
  layout: LayoutId;
  palette: {
    ground: string;
    ink: string;
    muted: string;
    accent: string;
    surface: string;
    surfaceInk: string;
  };
  ground: { photo: boolean; scrim?: number; art?: 'circles' | 'speckle' };
  type: {
    display: FontId;
    displayCase: 'none' | 'upper' | 'italic-2nd-line';
    text: FontId;
    label: FontId;
  };
  portraits: Portrait[];
  blocks: { kind: BlockKind; presentation: Presentation }[];
  socials: SocialsVariant;
};

export type LayoutProps = { design: CardDesign; data: CardData };

export const cardVars = ({ palette, type }: CardDesign) =>
  ({
    '--card-ground': palette.ground,
    '--card-ink': palette.ink,
    '--card-muted': palette.muted,
    '--card-accent': palette.accent,
    '--card-surface': palette.surface,
    '--card-surface-ink': palette.surfaceInk,
    '--card-display': FONT_STACKS[type.display],
    '--card-text': FONT_STACKS[type.text],
    '--card-label': FONT_STACKS[type.label],
    backgroundColor: palette.ground,
    color: palette.ink,
    fontFamily: FONT_STACKS[type.text],
  }) as CSSProperties;

// The one keyboard focus ring every card link and button draws
export const CARD_FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--card-accent)]';
