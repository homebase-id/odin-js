const RTE_FILE_KEY_PREFIX = 'pst_rtei';

/**
 * Next unused inline image payload key (`pst_rtei<N>`): one past the highest index in use.
 * Using `files.length` instead collides once an image is removed and another is added.
 */
export const getNextRteFileKey = (files: { key?: string }[]): string => {
  let max = -1;
  for (const { key } of files) {
    const match = key?.startsWith(RTE_FILE_KEY_PREFIX)
      ? /^\d+$/.exec(key.slice(RTE_FILE_KEY_PREFIX.length))
      : null;
    if (match) max = Math.max(max, Number(match[0]));
  }
  return `${RTE_FILE_KEY_PREFIX}${max + 1}`;
};

/** `files` with `file` added under the next unused inline image key, and that key. */
export const appendRteFile = <T extends { key?: string }>(
  files: T[],
  file: Blob
): { files: (T | { file: Blob; key: string })[]; key: string } => {
  const key = getNextRteFileKey(files);
  return { files: [...files, { file, key }], key };
};

const fileKeysOf = (
  node: { attrs?: Record<string, unknown>; content?: unknown[] },
  keys: Set<string>
) => {
  if (typeof node.attrs?.fileKey === 'string') keys.add(node.attrs.fileKey);
  node.content?.forEach((child) => fileKeysOf(child as typeof node, keys));
  return keys;
};

/**
 * `files` without the inline images added while editing that the document no longer has, so a
 * removed image isn't uploaded. Payloads already on the server and `keep` (the hero image) stay.
 */
export const withoutUnusedRteFiles = <T extends { key?: string }>(
  files: T[],
  doc: { content?: unknown[] },
  keep: (string | undefined)[] = []
): T[] => {
  const used = fileKeysOf(doc, new Set());
  return files.filter(
    (f) =>
      !('file' in f) ||
      !f.key?.startsWith(RTE_FILE_KEY_PREFIX) ||
      used.has(f.key) ||
      keep.includes(f.key)
  );
};
