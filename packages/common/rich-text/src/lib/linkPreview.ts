/** True only for a single http(s) URL token (whitespace around it is ignored). */
export function isPreviewableUrl(text: string): boolean {
  const token = text.trim();
  if (!token || /\s/.test(token)) return false;
  try {
    const { protocol } = new URL(token);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
