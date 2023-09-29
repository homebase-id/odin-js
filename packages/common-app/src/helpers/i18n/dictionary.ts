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
  ['verticalposts', 'Social Vertical Posts'],
  ['horizontalposts', 'Social Horizontal Posts'],
  ['related blogs', 'Related blogs'],

  // PermssionTypes
  ['comment', 'Comment'],
  ['editor', 'Edit'],
  ['full', 'Full'],
  ['manageconnectionrequests', 'Manage Connection Requests'],
  ['none', 'None'],
  ['react', 'React'],
  ['readandwritereactionsandcomments', 'React/Comment'],
  ['readcirclemembers', 'Read Circle Members'],
  ['readconnections', 'Read Connections'],
  ['reader', 'Read'],
  ['readmyfollowers', 'Read My Followers'],
  ['readwhoifollow', 'Read Who I Follow'],
  ['receivedatafromotheridentitiesonmybehalf', 'Receive data from other identities on my behalf'],
  ['senddatatootheridentitiesonmybehalf', 'Send data to other identities on my behalf'],
  ['writer', 'Write'],
  ['writereactionsandcomments', 'Write Reactions and Comments'],
] as const;

const internalDict: Map<string, string> = new Map(enLocale);

const t = (key: string) => {
  return internalDict.get(key.toLowerCase()) ?? key;
};

export { t };
