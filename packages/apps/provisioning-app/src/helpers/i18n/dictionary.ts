import { t as commonT } from '@homebase-id/common-app';

const enLocale = [
  ['incorrectValue', 'Incorrect value found'],
  ['domainOrRecordNotFound', 'Record not found'],
] as const;

const internalDict: Map<string, string> = new Map(enLocale);

// Resolve app-local keys first, then hand off to common-app's t for the shared
// dictionary and its {0} interpolation
const t = (key: string, ...args: (string | number)[]) =>
  commonT(internalDict.get(key) ?? key, ...args);

export { t };
