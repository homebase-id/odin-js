import { describe, expect, it } from 'vitest';
import { pickCard } from './pickCard';

const card = (priority: number, data: Record<string, unknown>, circles?: string[]) => ({
  fileMetadata: { appData: { content: { priority, data } } },
  serverMetadata: circles ? { accessControlList: { circleIdList: circles } } : undefined,
});

describe('pickCard', () => {
  it('returns null when there are no cards', () => {
    expect(pickCard([])).toBeNull();
    expect(pickCard(undefined)).toBeNull();
  });

  it('returns the public card when it is the only one', () => {
    expect(pickCard([card(1000, { design: 'poster' })])).toMatchObject({
      kind: 'public',
      design: 'poster',
    });
  });

  it('prefers a circle card over the public card', () => {
    const picked = pickCard([
      card(1000, { design: 'poster' }),
      card(3, { design: 'dossier', label: 'Friends' }, ['c1']),
    ]);
    expect(picked).toMatchObject({ kind: 'circle', design: 'dossier', label: 'Friends' });
  });

  it('treats a card with circles in its ACL and no label as a circle card', () => {
    const picked = pickCard([
      card(1000, { design: 'poster' }),
      card(3, { design: 'dossier' }, ['c1']),
    ]);
    expect(picked).toMatchObject({ kind: 'circle', design: 'dossier' });
  });

  it('picks the lowest priority among circle cards', () => {
    const picked = pickCard([
      card(5, { design: 'board', label: 'Family' }, ['c2']),
      card(1, { design: 'collage', label: 'Friends' }, ['c1']),
    ]);
    expect(picked).toMatchObject({ design: 'collage', label: 'Friends' });
  });

  it('prefers a circle card even when its priority number is higher than the public card', () => {
    const picked = pickCard([
      card(0, { design: 'poster' }),
      card(5, { design: 'dossier', label: 'Friends' }, ['c1']),
    ]);
    expect(picked).toMatchObject({ kind: 'circle', design: 'dossier', label: 'Friends' });
  });

  it('treats a card with a label but no ACL as a circle card', () => {
    const picked = pickCard([card(0, { design: 'poster' }), card(7, { label: 'Team' })]);
    expect(picked).toMatchObject({ kind: 'circle', label: 'Team' });
  });
});
