import { HomePageTheme } from '@homebase-id/js-lib/public';
import type { CardDesign, LayoutId } from './CardDesign';

export const CARD_PRESETS: Record<LayoutId, CardDesign> = {
  poster: {
    version: 1,
    layout: 'poster',
    palette: {
      ground: '#14120F',
      ink: '#F4F0EA',
      muted: 'rgba(244,240,234,0.7)',
      accent: '#F4F0EA',
      surface: 'rgba(244,240,234,0.28)',
      surfaceInk: '#F4F0EA',
    },
    ground: { photo: true, scrim: 0.85 },
    type: { display: 'newsreader', displayCase: 'italic-2nd-line', text: 'newsreader', label: 'space-mono' },
    portraits: [],
    blocks: [
      { kind: 'chat', presentation: 'bare' },
      { kind: 'moments', presentation: 'bare' },
      { kind: 'links', presentation: 'bare' },
      { kind: 'posts', presentation: 'bare' },
    ],
    socials: 'glyphs',
  },
  board: {
    version: 1,
    layout: 'board',
    palette: {
      ground: '#1F4E8C',
      ink: '#FFFFFF',
      muted: 'rgba(255,255,255,0.72)',
      accent: '#4FD1C5',
      surface: '#FFFFFF',
      surfaceInk: '#16304F',
    },
    ground: { photo: false, art: 'circles' },
    type: { display: 'montserrat-alt', displayCase: 'none', text: 'montserrat', label: 'montserrat' },
    portraits: [{ source: 'photo', shape: 'circle', ring: 4, shadow: 'hard' }],
    blocks: [
      { kind: 'links', presentation: 'boxed' },
      { kind: 'moments', presentation: 'boxed' },
      { kind: 'chat', presentation: 'boxed' },
      { kind: 'posts', presentation: 'boxed' },
    ],
    socials: 'bar',
  },
  collage: {
    version: 1,
    layout: 'collage',
    palette: {
      ground: '#F3EADB',
      ink: '#3A2E22',
      muted: '#76614F',
      accent: '#B4553A',
      surface: '#FFFFFF',
      surfaceInk: '#3A2E22',
    },
    ground: { photo: false, art: 'speckle' },
    type: { display: 'caveat', displayCase: 'none', text: 'montserrat', label: 'caveat' },
    portraits: [
      { source: 'photo', shape: 'square', tilt: -4, tape: true, shadow: 'soft' },
      { source: 'header', shape: 'ellipse', tilt: 3, shadow: 'soft' },
    ],
    blocks: [
      { kind: 'chat', presentation: 'button' },
      { kind: 'links', presentation: 'boxed' },
      { kind: 'moments', presentation: 'boxed' },
      { kind: 'posts', presentation: 'boxed' },
    ],
    socials: 'wordmark',
  },
  dossier: {
    version: 1,
    layout: 'dossier',
    palette: {
      ground: '#0E1013',
      ink: '#E9ECF1',
      muted: '#8A94A4',
      accent: '#7FD4E8',
      surface: '#22262E',
      surfaceInk: '#E9ECF1',
    },
    ground: { photo: false },
    type: { display: 'archivo-black', displayCase: 'upper', text: 'space-mono', label: 'space-mono' },
    portraits: [{ source: 'photo', shape: 'square', mono: true }],
    blocks: [
      { kind: 'chat', presentation: 'row' },
      { kind: 'moments', presentation: 'row' },
      { kind: 'links', presentation: 'row' },
      { kind: 'posts', presentation: 'row' },
    ],
    socials: 'handles',
  },
};

const THEME_TO_LAYOUT: Record<string, LayoutId> = {
  [HomePageTheme.Poster]: 'poster',
  [HomePageTheme.Board]: 'board',
  [HomePageTheme.Collage]: 'collage',
  [HomePageTheme.Dossier]: 'dossier',
};

export const cardPresetForTheme = (themeId: unknown): LayoutId | undefined =>
  THEME_TO_LAYOUT[String(themeId)];

// Object.hasOwn, not `in`: `'toString' in CARD_PRESETS` is true
export const presetFromParam = (value: string | null): LayoutId | undefined =>
  value && Object.hasOwn(CARD_PRESETS, value) ? (value as LayoutId) : undefined;
