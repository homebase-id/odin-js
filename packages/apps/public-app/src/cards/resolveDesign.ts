import type { CardDesign } from './CardDesign';
import { PUBLIC_TEMPLATE } from './audienceTemplates';
import { applyOverrides } from './overrides';
import { CARD_PRESETS, presetFromParam } from './presets';

const DEFAULT_LAYOUT = 'board';

export const resolveEmbedDesign = (sources: {
  param?: string | null;
  card?: { design?: string; overrides?: unknown } | null;
  themeDesign?: string | null;
}): CardDesign => {
  const paramLayout = presetFromParam(sources.param);
  const cardLayout = paramLayout ? undefined : presetFromParam(sources.card?.design);
  const layout = paramLayout ?? cardLayout ?? presetFromParam(sources.themeDesign);
  if (!layout) {
    // No param, no stored card and no site theme: the card starts from the public template, as it does in the app
    if (!sources.param && !sources.card)
      return applyOverrides(CARD_PRESETS[PUBLIC_TEMPLATE.design], PUBLIC_TEMPLATE.overrides);
    return CARD_PRESETS[DEFAULT_LAYOUT];
  }
  return applyOverrides(CARD_PRESETS[layout], cardLayout ? sources.card?.overrides : undefined);
};

export const resolveRequestDesign = (request: {
  design?: string;
  overrides?: unknown;
}): CardDesign => {
  const layout = presetFromParam(request?.design);
  if (!layout) return CARD_PRESETS[DEFAULT_LAYOUT];
  return applyOverrides(CARD_PRESETS[layout], request.overrides);
};
