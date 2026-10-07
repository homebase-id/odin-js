export interface PreviewFile {
  name: string;
  contentType: string;
  bytes: Uint8Array;
  /** Object URL over the same bytes; owned and revoked by the open screen. */
  url: string;
}

/** Builds an element with textContent only - preview code never assigns innerHTML. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export const notice = (text: string): HTMLElement => h('p', 'preview-note', text);

export const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const swapWithNotice = (node: HTMLElement, text: string) => {
  node.replaceWith(notice(text));
};
