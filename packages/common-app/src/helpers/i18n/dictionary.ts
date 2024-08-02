import { TransferStatus } from '@youfoundation/js-lib/core';

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
  ['uploading', 'Uploading'],
  ['encrypting blogs', 'Encrypting'],

  // PermssionTypes
  ['readandwrite', 'Read & Write'],
  ['reactandcomment', 'React & Comment'],
  ['full', 'Full'],
  ['comment', 'Comment'],
  ['editor', 'Edit'],
  ['full', 'Full'],
  ['readconnectionrequests', 'Read Connection Requests'],
  ['none', 'None'],
  ['react', 'React'],
  ['readandwritereactionsandcomments', 'React/Comment'],
  ['readcirclemembers', 'Read Circle Members'],
  ['readconnections', 'Read Connections'],
  ['reader', 'Read'],
  ['readmyfollowers', 'Read My Followers'],
  ['managefeed', 'Manage Feed'],
  ['readwhoifollow', 'Read Who I Follow'],
  ['receivedatafromotheridentitiesonmybehalf', 'Receive data from other identities on my behalf'],
  ['senddatatootheridentitiesonmybehalf', 'Send data to other identities on my behalf'],
  ['writer', 'Write'],
  ['writereactionsandcomments', 'Write Reactions and Comments'],
  ['sendpushnotifications', 'Send Push Notifications'],
  ['publishstaticcontent', 'Publish Static Content'],
  ['managefeed', 'Manage feed'],

  // Transfer Statusses:
  [
    TransferStatus.RecipientIdentityReturnedAccessDenied.toLowerCase(),
    'Recipient identity returned access denied',
  ],
  [TransferStatus.RecipientServerNotResponding.toLowerCase(), 'Recipient server not responding'],
  [
    TransferStatus.RecipientIdentityReturnedServerError.toLowerCase(),
    'Recipient identity returned server error',
  ],
  [
    TransferStatus.RecipientIdentityReturnedBadRequest.toLowerCase(),
    'Recipient identity returned bad request',
  ],
] as const;

const internalDict: Map<string, string> = new Map(enLocale);

const t = (key: string | undefined, ...args: (string | number)[]) => {
  if (!key) return '';
  const localizedKey = internalDict.get(key.toLowerCase()) ?? key;

  return localizedKey.replaceAll(/{(\d+)}/g, (match, number) => {
    return typeof args[number] !== 'undefined' ? args[number].toString() : match;
  });
};

export { t };
