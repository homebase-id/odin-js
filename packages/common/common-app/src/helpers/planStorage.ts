// How full a plan is, in words people read without converting units: the share used as a percentage of the plan's
// size ("12% of 500 GB"), and then what is used and free in the plan's own unit ("60 GB used · 440 GB free"), never
// "85.24 MB of 500.00 GB". Keep in step with chat-kmp's PlanStorage.kt.

const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

export interface PlanStorageText {
  /** Whole percent used: 0 when nothing is, 99 until it is actually full, 100 when it is; null for under 1% */
  percent: number | null;
  /** The plan's size: "500 GB", "1 TB", "1.5 TB" */
  size: string;
  /** Used, in the plan's unit: "0.1 GB"; under: true when it is more than nothing but rounds to it */
  used: { amount: string; under: boolean };
  /** Free, in the plan's unit: "499.9 GB"; "0 GB" when it is full */
  free: string;
}

export const planStorageText = (usedBytes: number, quotaBytes: number): PlanStorageText => {
  let unit = 0;
  while (unit < units.length - 1 && quotaBytes >= 1024 ** (unit + 1)) unit++;
  const scale = 1024 ** unit;
  const sizeValue = quotaBytes / scale;
  // Two decimals for a plan under 10 of its unit (1 TB), so 0.29 TB is not 0.3 TB; one otherwise
  const decimals = unit === 0 ? 0 : sizeValue < 10 ? 2 : 1;
  const amount = (bytes: number, places: number) =>
    `${trim((bytes / scale).toFixed(places))} ${units[unit]}`;

  const used = Math.max(0, usedBytes);
  const roundsToNothing = used > 0 && Number((used / scale).toFixed(decimals)) === 0;
  const smallest = 10 ** -decimals * scale;

  return {
    percent: percentUsed(used, quotaBytes),
    size: amount(quotaBytes, 1),
    used: roundsToNothing
      ? { amount: amount(smallest, decimals), under: true }
      : { amount: amount(used, decimals), under: false },
    free: amount(Math.max(0, quotaBytes - used), decimals),
  };
};

const percentUsed = (used: number, quota: number): number | null => {
  if (quota <= 0 || used >= quota) return 100;
  if (used === 0) return 0;
  const percent = (used / quota) * 100;
  return percent < 1 ? null : Math.min(99, Math.round(percent));
};

// "500.0" -> "500", "0.10" -> "0.1"
const trim = (value: string) => (value.includes('.') ? value.replace(/\.?0+$/, '') : value);
