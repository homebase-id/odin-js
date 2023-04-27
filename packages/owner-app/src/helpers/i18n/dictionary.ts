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
  ['section-empty-attributes', "You don't have any attributes in this section"],
  ['no-data-found', 'No data found'],
  ['masonrylayout', 'Masonry'],
  ['largecards', 'Grid'],
  ['classicblog', 'List'],
  ['coverpage', 'Cover Page'],
  ['socialclassic', 'Social Vertical Posts'],
  ['contentproducer', 'Social Horizontal Posts'],
] as const;

const internalDict: Map<string, string> = new Map(enLocale);

const t = (key: string) => {
  return internalDict.get(key.toLowerCase()) ?? key;
};

export { t };
