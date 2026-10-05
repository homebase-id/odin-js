export type PickedCard = {
  kind: 'public' | 'circle';
  design?: string;
  label?: string;
  overrides?: unknown;
  priority: number;
};

type CardAttribute = {
  fileMetadata: { appData: { content: { priority?: number; data?: Record<string, unknown> } } };
  serverMetadata?: { accessControlList?: { circleIdList?: string[] | null } };
};

const toCard = (file: CardAttribute): PickedCard => {
  const content = file.fileMetadata.appData.content;
  const data = content.data ?? {};
  const label = typeof data.label === 'string' && data.label ? data.label : undefined;
  const design = typeof data.design === 'string' ? data.design : undefined;
  // a public card carries no label; the ACL may be hidden from the visitor, so the label decides too
  const isCircle = !!file.serverMetadata?.accessControlList?.circleIdList?.length || !!label;
  return {
    kind: isCircle ? 'circle' : 'public',
    design,
    label,
    overrides: data.overrides,
    priority: content.priority ?? 0,
  };
};

// A circle card beats the public card; among circle cards the lowest priority wins
export const pickCard = (files: CardAttribute[] | undefined | null): PickedCard | null => {
  return (files ?? []).map(toCard).reduce<PickedCard | null>((best, card) => {
    if (!best) return card;
    if (card.kind !== best.kind) return card.kind === 'circle' ? card : best;
    return card.priority < best.priority ? card : best;
  }, null);
};
