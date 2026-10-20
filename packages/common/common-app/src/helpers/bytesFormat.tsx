const units = ['KB', 'MB', 'GB', 'TB', 'PB'];

export const bytesToSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;

  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(2)} ${units[unit]}`;
};
