import type { LayoutId } from './CardDesign';
import type { CardOverrides } from './overrides';

export type AudienceTemplate = { design: LayoutId; overrides: CardOverrides };

/*
 * The design a card starts from before its owner stores one. The app (chat-kmp CardDesignSpec.kt) shows the same
 * table and writes it to the server on a circle card's first edit; the circle table is pinned by __fixtures__/design-specs.json.
 */
export const PUBLIC_TEMPLATE: AudienceTemplate = {
  design: 'board',
  overrides: {
    palette: {
      ground: '#1E5B45',
      ink: '#FFFFFF',
      muted: '#BFD6CC',
      surface: '#FFFFFF',
      surfaceInk: '#173B2E',
    },
  },
};
