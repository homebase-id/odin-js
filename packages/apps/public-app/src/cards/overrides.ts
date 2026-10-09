import {
  BLOCK_KINDS,
  FONT_STACKS,
  PRESENTATIONS,
  SHAPES,
  SOCIALS,
  type BlockKind,
  type CardDesign,
  type FontId,
  type Portrait,
  type Presentation,
  type SocialsVariant,
} from './CardDesign';

/*
 * CardOverrides: the `overrides` object of a profile_card attribute, and of a RenderRequest in app mode.
 * Every key is optional; anything invalid is dropped and the preset's value stays. Unknown keys are ignored.
 *   palette   { ground, ink, muted, accent, surface, surfaceInk }  each "#rrggbb"
 *   type      { display, text, label } each a FONT_STACKS key; displayCase "none"|"upper"|"italic-2nd-line"
 *   portraits [{ source "photo"|"header", shape "circle"|"square"|"rounded"|"ellipse", ring 0..12,
 *               shadow "soft"|"hard", tilt -15..15, tape bool, mono bool }]  (max 2; replaces the preset's list)
 *   blocks    [{ kind "links"|"moments"|"posts", presentation "bare"|"boxed"|"row"|"button" }]
 *             existing kinds only, first mention wins; listed order is the order, unlisted kinds are hidden
 *   socials   "glyphs"|"bar"|"wordmark"|"handles"
 */
export type CardOverrides = {
  palette?: Partial<CardDesign['palette']>;
  type?: Partial<CardDesign['type']>;
  portraits?: Partial<Portrait>[];
  blocks?: { kind: BlockKind; presentation?: Presentation }[];
  socials?: SocialsVariant;
};

const DISPLAY_CASES = ['none', 'upper', 'italic-2nd-line'] as const;
const SOURCES = ['photo', 'header'] as const;
const SHADOWS = ['soft', 'hard'] as const;
const MAX_PORTRAITS = 2;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const oneOf = <T extends string>(list: readonly T[], value: unknown): T | undefined =>
  typeof value === 'string' && (list as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
const colour = (value: unknown) =>
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : undefined;
const font = (value: unknown): FontId | undefined =>
  typeof value === 'string' && Object.hasOwn(FONT_STACKS, value) ? (value as FontId) : undefined;
const inRange = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    ? value
    : undefined;
const flag = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

const defined = <T extends object>(value: T): Partial<T> =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;

const portrait = (raw: unknown, base: Portrait | undefined): Portrait | undefined => {
  if (!isRecord(raw)) return undefined;
  const source = oneOf(SOURCES, raw.source) ?? base?.source;
  const shape = oneOf(SHAPES, raw.shape) ?? base?.shape;
  if (!source || !shape) return undefined;
  return {
    ...base,
    ...defined({
      ring: inRange(raw.ring, 0, 12),
      shadow: oneOf(SHADOWS, raw.shadow),
      tilt: inRange(raw.tilt, -15, 15),
      tape: flag(raw.tape),
      mono: flag(raw.mono),
    }),
    source,
    shape,
  };
};

export const applyOverrides = (preset: CardDesign, overrides: unknown): CardDesign => {
  if (!isRecord(overrides)) return preset;
  const design: CardDesign = { ...preset };

  if (isRecord(overrides.palette)) {
    const p = overrides.palette;
    design.palette = {
      ...preset.palette,
      ...defined({
        ground: colour(p.ground),
        ink: colour(p.ink),
        muted: colour(p.muted),
        accent: colour(p.accent),
        surface: colour(p.surface),
        surfaceInk: colour(p.surfaceInk),
      }),
    };
  }

  if (isRecord(overrides.type)) {
    const t = overrides.type;
    design.type = {
      ...preset.type,
      ...defined({
        display: font(t.display),
        text: font(t.text),
        label: font(t.label),
        displayCase: oneOf(DISPLAY_CASES, t.displayCase),
      }),
    };
  }

  if (Array.isArray(overrides.portraits)) {
    const list = overrides.portraits
      .slice(0, MAX_PORTRAITS)
      .map((raw, index) => portrait(raw, preset.portraits[index]))
      .filter((p): p is Portrait => !!p);
    if (list.length) design.portraits = list;
  }

  if (Array.isArray(overrides.blocks)) {
    const seen = new Set<BlockKind>();
    const list: CardDesign['blocks'] = [];
    for (const raw of overrides.blocks) {
      if (!isRecord(raw)) continue;
      const kind = oneOf(BLOCK_KINDS, raw.kind);
      if (!kind || seen.has(kind)) continue;
      const existing = preset.blocks.find((block) => block.kind === kind);
      if (!existing) continue;
      seen.add(kind);
      list.push({
        kind,
        presentation: oneOf(PRESENTATIONS, raw.presentation) ?? existing.presentation,
      });
    }
    if (list.length) design.blocks = list;
  }

  const socials = oneOf(SOCIALS, overrides.socials);
  if (socials) design.socials = socials;

  return design;
};
