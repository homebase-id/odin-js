import type { LayoutId } from './CardDesign';
import type { CardOverrides } from './overrides';

export type AudienceTemplate = { design: LayoutId; overrides: CardOverrides };

/*
 * The design a card starts from before its owner stores one. The app (chat-kmp CardDesignSpec.kt) shows the same
 * table and writes it to the server on a circle card's first edit; the circle table is pinned by __fixtures__/design-specs.json.
 */
export const PUBLIC_TEMPLATE: AudienceTemplate = {
  design: 'links',
  overrides: {
    palette: {
      ground: '#DDF0E6',
      ink: '#12301F',
      muted: '#4A6B58',
      surface: '#FFFFFF',
      surfaceInk: '#12301F',
    },
  },
};
