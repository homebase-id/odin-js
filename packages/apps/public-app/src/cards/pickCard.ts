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
  const cards = (files ?? []).map(toCard);
  const lowest = (list: PickedCard[]) =>
    list.reduce<PickedCard | null>(
      (best, card) => (!best || card.priority < best.priority ? card : best),
      null
    );
  return (
    lowest(cards.filter((card) => card.kind === 'circle')) ??
    lowest(cards.filter((card) => card.kind === 'public'))
  );
};
