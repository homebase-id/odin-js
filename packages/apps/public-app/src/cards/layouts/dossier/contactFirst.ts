import type { LayoutProps } from '../../CardDesign';

// CONTACT (the chat row) sits above ELSEWHERE (links, moments) unless the order puts chat after both
export const contactFirst = (design: LayoutProps['design']) => {
  const index = (kind: string) => design.blocks.findIndex((block) => block.kind === kind);
  const elsewhere = [index('links'), index('moments')].filter((i) => i >= 0);
  return !elsewhere.length || index('chat') < Math.min(...elsewhere);
};
