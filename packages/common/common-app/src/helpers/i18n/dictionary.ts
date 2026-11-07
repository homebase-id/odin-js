import { TransferStatus } from '@homebase-id/js-lib/core';

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
  ['reactandwrite', 'React & Write'],
  ['reactandcomment', 'React & Comment'],
  ['full', 'Full'],
  ['comment', 'Comment'],
  ['editor', 'Edit'],
  ['full', 'Full'],
  ['readconnectionrequests', 'Read Connection Requests'],
  ['none', 'None'],
  ['react', 'React'],
  ['readandwritereactionsandcomments', 'React/Comment'],
  ['readwriteandreact', 'Read, Write & React'],
  ['readcirclemembers', 'Read Circle Members'],
  ['readconnections', 'Read Connections'],
  ['introduceme', 'Introduce Me'],
  ['reader', 'Read'],
  ['readmyfollowers', 'Read My Followers'],
  ['managefeed', 'Manage Feed'],
  ['readwhoifollow', 'Read Who I Follow'],
  ['managecontacts', 'Manage Contacts'],
  ['receivedatafromotheridentitiesonmybehalf', 'Receive data from other identities on my behalf'],
  ['senddatatootheridentitiesonmybehalf', 'Send data to other identities on my behalf'],
  ['writer', 'Write'],
  ['writereactionsandcomments', 'Write Reactions and Comments'],
  ['sendpushnotifications', 'Send Push Notifications'],
  ['publishstaticcontent', 'Publish Static Content'],
  ['managefeed', 'Manage feed'],
  ['sendintroductions', 'Send introductions'],

  // Transfer Statusses:
  [
    TransferStatus.RecipientIdentityReturnedAccessDenied,
    'Recipient identity returned access denied',
  ],
  [TransferStatus.RecipientServerNotResponding, 'Recipient server not responding'],
  [TransferStatus.RecipientIdentityReturnedServerError, 'Recipient identity returned server error'],
  [TransferStatus.SendingServerTooManyAttempts, "Too many failed attempts, won't try again"],
  [TransferStatus.RecipientIdentityReturnedBadRequest, 'Recipient identity returned bad request'],
  [
    TransferStatus.RecipientIdentityReturnedVersionTagMismatch,
    "Recipient's copy of the file has changed",
  ],
  [
    TransferStatus.RecipientIdentityReturnedInvalidKeyHeader,
    "Recipient refused the file's encryption key",
  ],
  [TransferStatus.RecipientIdentityOutOfStorage, 'Recipient is out of storage; will retry'],
  [TransferStatus.SourceFileDoesNotAllowDistribution, 'File does not allow distribution'],
  [TransferStatus.UnknownServerError, 'Unknown server error'],
] as const;

const internalDict = new Map<string, string>(enLocale);

const t = (key: string | undefined, ...args: (string | number)[]) => {
  if (!key) return '';
  const localizedKey = internalDict.get(key.toLowerCase()) ?? key;

  return localizedKey.replaceAll(/{(\d+)}/g, (match, number) => {
    return typeof args[number] !== 'undefined' ? args[number].toString() : match;
  });
};

export { t };
