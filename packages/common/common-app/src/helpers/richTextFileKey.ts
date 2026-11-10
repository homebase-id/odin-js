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
