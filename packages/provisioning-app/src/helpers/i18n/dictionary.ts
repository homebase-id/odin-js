const enLocale = [
  ['incorrectValue', 'Incorrect value found'],
  ['domainOrRecordNotFound', 'Record not found'],
] as const;

const internalDict: Map<string, string> = new Map(enLocale);

const t = (key: string) => {
  return internalDict.get(key) ?? key;
};

export { t };
