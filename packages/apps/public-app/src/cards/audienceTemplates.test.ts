import { describe, expect, it } from 'vitest';
import { PUBLIC_TEMPLATE, type AudienceTemplate } from './audienceTemplates';
import { CARD_PRESETS } from './presets';
import { applyOverrides } from './overrides';
import { resolveEmbedDesign } from './resolveDesign';
import specsRaw from './__fixtures__/design-specs.json?raw';

// design-specs.json is written by chat-kmp (CardDesignMatrixGoldenTest) from its CardDesignSpec.kt templates
const { audienceTemplates } = JSON.parse(specsRaw);
const CIRCLE_TEMPLATES: Record<string, AudienceTemplate> = audienceTemplates.circles;

describe('audience templates', () => {
  it('match the app table', () => {
    expect(PUBLIC_TEMPLATE).toEqual(audienceTemplates.public);
  });

  it('every template applies in full: its design exists and its palette survives', () => {
    for (const template of [PUBLIC_TEMPLATE, ...Object.values(CIRCLE_TEMPLATES)]) {
      const design = applyOverrides(CARD_PRESETS[template.design], template.overrides);
      expect(design.layout).toBe(template.design);
      expect(design.palette).toMatchObject(template.overrides.palette ?? {});
    }
  });

  it('an unstored public card renders the public template, with no write', () => {
    const design = resolveEmbedDesign({});
    expect(design.layout).toBe('links');
    expect(design.palette.ground).toBe('#DDF0E6');
  });

  it('a stored card and the site theme still win over the template', () => {
    expect(resolveEmbedDesign({ themeDesign: 'dossier' })).toEqual(CARD_PRESETS.dossier);
    expect(resolveEmbedDesign({ card: { design: 'poster' } }).layout).toBe('poster');
  });
});
