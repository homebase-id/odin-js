const enLocale = [
  ['login', 'Login'],
  ['logout', 'Logout'],
  ['signup', 'Signup'],
  ['all', 'All'],
  ['learn more', 'Learn more'],
  ['load more', 'Load more'],
  ['blog', 'Blog'],
  ['me', 'Me'],
  ['loading', 'Loading'],
  ['related blogs', 'Related blogs'],
  ['masonrylayout', 'Masonry'],
  ['largecards', 'Grid'],
  ['classicblog', 'List'],
] as const;

const internalDict: Map<string, string> = new Map(enLocale);

const t = (key: string) => {
  return internalDict.get(key.toLowerCase()) ?? key;
};

export { t };
