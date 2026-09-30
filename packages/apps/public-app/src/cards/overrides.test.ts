import { describe, expect, it } from 'vitest';
import { cardVars } from './CardDesign';
import { applyOverrides } from './overrides';
import { CARD_PRESETS } from './presets';
import { pickCard } from './pickCard';

const board = CARD_PRESETS.board;
const collage = CARD_PRESETS.collage;

describe('applyOverrides', () => {
  it('returns the preset unchanged for empty or non-object overrides', () => {
    for (const preset of Object.values(CARD_PRESETS)) {
      expect(applyOverrides(preset, {})).toEqual(preset);
      expect(applyOverrides(preset, undefined)).toEqual(preset);
      expect(applyOverrides(preset, 'x')).toEqual(preset);
      expect(applyOverrides(preset, [])).toEqual(preset);
    }
  });

  it('applies valid overrides', () => {
    const design = applyOverrides(board, {
      palette: { ground: '#112233', accent: '#ABCDEF' },
      type: { display: 'caveat', displayCase: 'upper' },
      portraits: [{ shape: 'square', ring: 2, tilt: 5, mono: true }],
      socials: 'handles',
      blocks: [{ kind: 'posts', presentation: 'row' }, { kind: 'links' }],
      bogus: 1,
    });
    expect(design.palette).toEqual({ ...board.palette, ground: '#112233', accent: '#ABCDEF' });
    expect(design.type).toEqual({ ...board.type, display: 'caveat', displayCase: 'upper' });
    expect(design.portraits).toEqual([
      { source: 'photo', shape: 'square', ring: 2, shadow: 'hard', tilt: 5, mono: true },
    ]);
    expect(design.socials).toBe('handles');
    expect(design.blocks).toEqual([
      { kind: 'posts', presentation: 'row' },
      { kind: 'links', presentation: 'boxed' },
    ]);
    expect(design).not.toHaveProperty('bogus');
    expect(board.palette.ground).toBe('#1F4E8C');
  });

  it('drops each invalid kind and keeps the preset value', () => {
    const design = applyOverrides(board, {
      palette: {
        ground: 'red',
        ink: '#fff',
        muted: 'rgba(0,0,0,0.5)',
        accent: 42,
        surface: '#12345g',
      },
      type: { display: 'comic-sans', text: 3, displayCase: 'shout' },
      portraits: [{ shape: 'star', source: 'x' }, 'nope', { shape: 'square', ring: 99, tilt: 'a' }],
      blocks: [{ kind: 'video' }, { kind: 'chat', presentation: 'neon' }, { kind: 'chat' }, 7],
      socials: 'rainbow',
    });
    expect(design.palette).toEqual(board.palette);
    expect(design.type).toEqual(board.type);
    expect(design.portraits).toEqual([{ ...board.portraits[0], shape: 'circle' }]);
    expect(design.blocks).toEqual([{ kind: 'chat', presentation: 'boxed' }]);
    expect(design.socials).toBe(board.socials);
  });

  it('keeps the preset blocks and portraits when nothing valid remains', () => {
    const design = applyOverrides(board, { blocks: [{ kind: 'x' }], portraits: [1, 2] });
    expect(design.blocks).toEqual(board.blocks);
    expect(design.portraits).toEqual(board.portraits);
  });

  it('cannot invent a portrait past the cap or prototype-poison fonts', () => {
    const design = applyOverrides(collage, {
      portraits: [{}, {}, { shape: 'circle', source: 'photo' }],
      type: { display: 'toString' },
    });
    expect(design.portraits).toHaveLength(2);
    expect(design.type.display).toBe(collage.type.display);
  });

  it('changes what is rendered (css variables) only when overridden', () => {
    expect(cardVars(applyOverrides(board, {}))).toEqual(cardVars(board));
    const changed = cardVars(applyOverrides(board, { palette: { ground: '#000000' } })) as Record<
      string,
      string
    >;
    expect(changed['--card-ground']).toBe('#000000');
    expect(changed.backgroundColor).toBe('#000000');
  });

  it('flows from the attribute through pickCard into the design', () => {
    const file = {
      fileMetadata: {
        appData: {
          content: {
            priority: 1000,
            data: { design: 'board', overrides: { socials: 'bar', palette: { ink: '#000000' } } },
          },
        },
      },
    };
    const picked = pickCard([file]);
    expect(applyOverrides(board, picked?.overrides).palette.ink).toBe('#000000');
  });
});
