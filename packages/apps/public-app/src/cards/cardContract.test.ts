import { describe, expect, it } from 'vitest';
import { BuiltInAttributes } from '@homebase-id/js-lib/profile';
import { applyOverrides } from './overrides';
import { resolveRequestDesign } from './resolveDesign';
import { pickCard } from './pickCard';
import { CARD_PRESETS, presetFromParam } from './presets';
import saveCircleRaw from './__fixtures__/save-circle-card.json?raw';
import savePublicRaw from './__fixtures__/save-public-card.json?raw';
import renderPayloadRaw from './__fixtures__/render-payload.json?raw';
import storedSetRaw from './__fixtures__/stored-card-set.json?raw';

/*
 * The fixtures are written by chat-kmp (CardContractGoldenTest) and are byte-identical copies of the ones
 * checked in beside the chat-kmp and odin-core tests.
 */

type Json = Record<string, any>;
const savePublic: Json = JSON.parse(savePublicRaw);
const saveCircle: Json = JSON.parse(saveCircleRaw);
const renderPayload: Json = JSON.parse(renderPayloadRaw);
const storedSet: Json[] = JSON.parse(storedSetRaw);

// AppData in CardApp.tsx (not exported)
const APP_DATA_KEYS = [
  'odinId',
  'firstName',
  'surName',
  'displayName',
  'headline',
  'bio',
  'photo',
  'header',
  'links',
  'socials',
  'posts',
];

describe('type id', () => {
  it('matches the shared contract guid', () => {
    expect(BuiltInAttributes.ProfileCard).toBe('9832dc5dd4ba12dd60acb853e7588f49');
    expect(savePublic.type).toBe(BuiltInAttributes.ProfileCard);
    expect(saveCircle.type).toBe(BuiltInAttributes.ProfileCard);
  });
});

describe('render payload chat-kmp sends', () => {
  it('names a design the page knows and only data fields the page reads', () => {
    expect(presetFromParam(renderPayload.design)).toBe('board');
    expect(renderPayload.data.odinId).toBeTruthy();
    for (const key of Object.keys(renderPayload.data)) expect(APP_DATA_KEYS).toContain(key);
    expect(Object.keys(renderPayload).sort()).toEqual(['data', 'design']);
  });
});

describe('render request validation on the exact chat-kmp payload', () => {
  it('resolves to the board preset untouched, as the payload carries no overrides', () => {
    expect(resolveRequestDesign(renderPayload)).toEqual(CARD_PRESETS.board);
  });

  it('keeps every stored override when the same request also carries them', () => {
    const design = resolveRequestDesign({ ...renderPayload, overrides: savePublic.data.overrides });
    expect(design.palette).toEqual(savePublic.data.overrides.palette);
    expect(design.blocks).toEqual(savePublic.data.overrides.blocks);
    expect(design.socials).toBe('handles');
  });
});

describe('overrides chat-kmp stores, applied by the page', () => {
  const overrides = savePublic.data.overrides;
  const design = applyOverrides(CARD_PRESETS[savePublic.data.design as 'board'], overrides);

  it('drops no field', () => {
    expect(design.palette).toEqual(overrides.palette);
    expect(design.type).toEqual(overrides.type);
    expect(design.portraits).toEqual([
      {
        source: 'photo',
        shape: 'square',
        ring: 2,
        shadow: 'soft',
        tilt: 5,
        tape: true,
        mono: true,
      },
    ]);
    expect(design.blocks).toEqual(overrides.blocks);
    expect(design.socials).toBe(overrides.socials);
  });

  it('keeps every key of the stored overrides object', () => {
    expect(Object.keys(overrides).sort()).toEqual([
      'blocks',
      'palette',
      'portraits',
      'socials',
      'type',
    ]);
  });

  it('applies the circle card overrides the same way', () => {
    const circle = applyOverrides(CARD_PRESETS.dossier, saveCircle.data.overrides);
    expect(circle.palette).toEqual(saveCircle.data.overrides.palette);
    expect(circle.socials).toBe('handles');
  });
});

describe('stored set chat-kmp writes, read by the card picker', () => {
  const attribute = (entry: Json) => ({
    fileMetadata: { appData: { content: { priority: entry.priority, data: entry.data } } },
    serverMetadata: { accessControlList: { circleIdList: entry.circleIds } },
  });

  it('has a public card plus two circle cards', () => {
    expect(storedSet.map((e) => e.visibility)).toEqual(['anonymous', 'connected', 'connected']);
    expect(storedSet[0].priority).toBe(1000);
    expect(storedSet[0].data.label).toBeUndefined();
  });

  it('picks the lowest-priority circle card with design, overrides and label', () => {
    const picked = pickCard(storedSet.map(attribute));
    expect(picked).toEqual({
      kind: 'circle',
      design: 'dossier',
      label: 'Friends',
      overrides: undefined,
      priority: 2,
    });
  });

  it('does not depend on the order the server returns', () => {
    expect(pickCard([...storedSet].reverse().map(attribute))?.label).toBe('Friends');
  });

  it('falls back to the public card, with its overrides, when the viewer sees no circle card', () => {
    const picked = pickCard([attribute(storedSet[0])]);
    expect(picked).toMatchObject({ kind: 'public', design: 'board', priority: 1000 });
    expect(picked?.label).toBeUndefined();
    expect(picked?.overrides).toEqual(storedSet[0].data.overrides);
  });

  it('reads the label even when the circle ACL is hidden from the viewer', () => {
    const hidden = { ...attribute(storedSet[2]), serverMetadata: undefined };
    expect(pickCard([attribute(storedSet[0]), hidden])).toMatchObject({
      kind: 'circle',
      label: 'Friends',
    });
  });
});
