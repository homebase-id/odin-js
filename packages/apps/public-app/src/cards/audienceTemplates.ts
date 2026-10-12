import type { LayoutId } from './CardDesign';
import type { CardOverrides } from './overrides';

export type AudienceTemplate = { design: LayoutId; overrides: CardOverrides };

const palette = (
  ground: string,
  ink: string,
  muted: string,
  surface: string,
  surfaceInk: string
): CardOverrides => ({ palette: { ground, ink, muted, surface, surfaceInk } });

/*
 * The design a card starts from before its owner stores one. The app (chat-kmp CardDesignSpec.kt) shows the same
 * table and writes it to the server on a circle card's first edit; it is pinned by __fixtures__/design-specs.json.
 */
export const PUBLIC_TEMPLATE: AudienceTemplate = {
  design: 'board',
  overrides: palette('#1E5B45', '#FFFFFF', '#BFD6CC', '#FFFFFF', '#173B2E'),
};

export const CIRCLE_TEMPLATES: Record<string, AudienceTemplate> = {
  cefc4f7cbc8c34762e0f76703e7e174e: {
    design: 'poster',
    overrides: palette('#2A0E14', '#F7E9EC', '#C9AEB4', '#5A3F45', '#F7E9EC'),
  },
  '3d594614f445f6b00014e9b77730b833': {
    design: 'collage',
    overrides: palette('#DDE5D3', '#26331F', '#56664A', '#FFFFFF', '#26331F'),
  },
  '0f9263536b9fc61ada745644735bfd8f': {
    design: 'links',
    overrides: palette('#F1F3F6', '#1B1F24', '#5C6673', '#FFFFFF', '#1B1F24'),
  },
};
