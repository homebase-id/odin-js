import { describe, expect, it } from 'vitest';
import { CIRCLE_TEMPLATES, PUBLIC_TEMPLATE } from './audienceTemplates';
import { CARD_PRESETS } from './presets';
import { applyOverrides } from './overrides';
import { resolveEmbedDesign } from './resolveDesign';
import specsRaw from './__fixtures__/design-specs.json?raw';

// design-specs.json is written by chat-kmp (CardDesignMatrixGoldenTest) from its CardDesignSpec.kt templates
const { audienceTemplates } = JSON.parse(specsRaw);

describe('audience templates', () => {
  it('match the app table', () => {
    expect(PUBLIC_TEMPLATE).toEqual(audienceTemplates.public);
    expect(CIRCLE_TEMPLATES).toEqual(audienceTemplates.circles);
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
    expect(design.layout).toBe('board');
    expect(design.palette.ground).toBe('#1E5B45');
  });

  it('a stored card and the site theme still win over the template', () => {
    expect(resolveEmbedDesign({ themeDesign: 'dossier' })).toEqual(CARD_PRESETS.dossier);
    expect(resolveEmbedDesign({ card: { design: 'poster' } }).layout).toBe('poster');
  });
});
