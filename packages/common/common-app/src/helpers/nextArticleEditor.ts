export const NEXT_ARTICLE_EDITOR_KEY = 'feed:next-article-editor';

/**
 * Whether the article composer uses the next (Tiptap) editor. Off by default: `?editor=next`
 * turns it on and `?editor=old` off, and the choice is remembered in localStorage.
 */
export const isNextArticleEditor = (
  search: string,
  getStorage: () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = () => window.localStorage
): boolean => {
  const param = new URLSearchParams(search).get('editor');
  try {
    const storage = getStorage();
    if (param === 'next') storage.setItem(NEXT_ARTICLE_EDITOR_KEY, '1');
    else if (param === 'old') storage.removeItem(NEXT_ARTICLE_EDITOR_KEY);
    return storage.getItem(NEXT_ARTICLE_EDITOR_KEY) === '1';
  } catch {
    // No storage (private mode, blocked): only the query param counts
    return param === 'next';
  }
};
