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

/** The "could not show it" state: the file is fine, this browser is not. */
export const fallback = ({ title, body }: { title: string; body: string }): HTMLElement => {
  const box = h('div', 'preview-fallback');
  box.setAttribute('role', 'status');
  box.appendChild(h('p', 'preview-fallback-title', title));
  box.appendChild(h('p', 'preview-note', body));
  return box;
};

/** Keyboard users can only scroll a clipped region if it can take focus. */
export const scrollable = <T extends HTMLElement>(node: T, label: string): T => {
  node.tabIndex = 0;
  node.setAttribute('role', 'region');
  node.setAttribute('aria-label', label);
  return node;
};

export const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const swapWithFallback = (node: HTMLElement, text: { title: string; body: string }) => {
  node.replaceWith(fallback(text));
};
