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

/** Header slots a renderer may fill: extra meta text, and controls that sit above the body. */
export interface PreviewSlots {
  meta: HTMLElement;
  tools: HTMLElement;
}

export const notice = (text: string): HTMLElement => {
  const p = h('p', 'preview-note', text);
  p.setAttribute('dir', 'auto');
  return p;
};

export const metaPart = (text: string, className = 'preview-meta-part'): HTMLElement => {
  // bdi keeps "38.1 KB" in order on a right-to-left page; the separator stays outside it
  const part = h('span', className);
  part.appendChild(h('bdi', undefined, text));
  return part;
};

export const toolButton = (text: string, label?: string): HTMLButtonElement => {
  const button = h('button', 'preview-tool', text);
  button.type = 'button';
  if (label) button.setAttribute('aria-label', label);
  return button;
};

export const blockContextMenu = (node: HTMLElement) => node.addEventListener('contextmenu', (e) => e.preventDefault());

/** The "could not show it" state: the file is fine, this browser is not. */
export const fallback = ({ title, body }: { title: string; body: string }): HTMLElement => {
  const box = h('div', 'preview-fallback');
  box.setAttribute('role', 'status');
  const head = h('p', 'preview-fallback-title', title);
  head.setAttribute('dir', 'auto');
  box.appendChild(head);
  box.appendChild(notice(body));
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

export const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1) : '';
};

/** Upper-cased extension for a badge, or '' when there is none or it is too long to be one. */
export const extensionTag = (name: string, maxLength: number): string => {
  const ext = extensionOf(name);
  return ext.length > 0 && ext.length <= maxLength ? ext.toUpperCase() : '';
};
