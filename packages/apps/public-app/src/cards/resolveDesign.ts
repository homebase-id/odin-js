import type { CardDesign } from './CardDesign';
import { applyOverrides } from './overrides';
import { CARD_PRESETS, presetFromParam } from './presets';

export const resolveEmbedDesign = (sources: {
  param?: string | null;
  card?: { design?: string; overrides?: unknown } | null;
  themeDesign?: string | null;
}): CardDesign => {
  const paramLayout = presetFromParam(sources.param);
  const cardLayout = paramLayout ? undefined : presetFromParam(sources.card?.design);
  const layout = paramLayout ?? cardLayout ?? presetFromParam(sources.themeDesign) ?? 'board';
  return applyOverrides(CARD_PRESETS[layout], cardLayout ? sources.card?.overrides : undefined);
};

export const resolveRequestDesign = (request: {
  design?: string;
  overrides?: unknown;
}): CardDesign => {
  const layout = presetFromParam(request?.design);
  if (!layout) throw new Error(`unknown design "${request?.design}"`);
  return applyOverrides(CARD_PRESETS[layout], request.overrides);
};
