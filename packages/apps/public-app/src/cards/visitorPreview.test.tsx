import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { CardData } from './useCardData';
import { CARD_PRESETS } from './presets';
import { CardBlocks, VisitorPreviewContext } from './parts/Blocks';

vi.mock('@homebase-id/common-app', () => ({
  HOME_ROOT_PATH: '/home/',
  t: (text: string) => text,
  useDotYouClientContext: () => ({
    isOwner: () => true,
    getLoggedInIdentity: () => 'frodo.dotyou.cloud',
  }),
}));

const data = { odinId: 'frodo.dotyou.cloud', links: [], posts: [] } as unknown as CardData;
const design = { ...CARD_PRESETS.links, blocks: [{ kind: 'chat', presentation: 'row' }] } as never;

const render = (visitorPreview?: boolean) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <VisitorPreviewContext.Provider value={visitorPreview ?? false}>
        <CardBlocks design={design} data={data} />
      </VisitorPreviewContext.Provider>
    </MemoryRouter>
  );

describe('chat block for the owner', () => {
  it('shows in a visitor preview', () => {
    expect(render(true)).toContain('Chat with me');
  });
  it('is hidden without the flag', () => {
    expect(render()).not.toContain('Chat with me');
  });
});
