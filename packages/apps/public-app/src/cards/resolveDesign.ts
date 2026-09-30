import type { CardDesign, LayoutId } from './CardDesign';
import { applyOverrides } from './overrides';
import { CARD_PRESETS, presetFromParam } from './presets';

export const resolveEmbedDesign = (sources: {
  param?: string | null;
  card?: { design?: string; overrides?: unknown } | null;
  themeDesign?: string | null;
}): { layout: LayoutId; design: CardDesign } => {
  const paramLayout = presetFromParam(sources.param);
  const cardLayout = paramLayout ? undefined : presetFromParam(sources.card?.design);
  const layout = paramLayout ?? cardLayout ?? presetFromParam(sources.themeDesign) ?? 'board';
  return {
    layout,
    design: applyOverrides(CARD_PRESETS[layout], cardLayout ? sources.card?.overrides : undefined),
  };
};

export const resolveRequestDesign = (request: {
  design?: string;
  overrides?: unknown;
}): { layout: LayoutId; design: CardDesign } => {
  const layout = presetFromParam(request?.design);
  if (!layout) throw new Error(`unknown design "${request?.design}"`);
  return { layout, design: applyOverrides(CARD_PRESETS[layout], request.overrides) };
};
