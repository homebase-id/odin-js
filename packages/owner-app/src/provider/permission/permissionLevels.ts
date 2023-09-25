import { t } from '@youfoundation/common-app';

export const drivePermissionLevels = [
  { name: t('None'), value: 0 },
  { name: t('Reader'), value: 1 },
  { name: t('Writer'), value: 2 },
  { name: t('Editor'), value: 3 },
  { name: t('Commenter'), value: 4 }, // WriteReactionsAndComments
  { name: t('Full'), value: 7 }, // Commeter + Editor
];

export const circlePermissionLevels = [
  { name: t('None'), value: 0 },
  { name: t('Read Connections'), value: 10 },
  { name: t('Read Circle Members'), value: 50 },
];

export const appPermissionLevels = [
  { name: t('None'), value: 0 },
  { name: t('Read Connections'), value: 10 },
  { name: t('Manage Connection Requests'), value: 30 },
  { name: t('Read Circle Members'), value: 50 },
  { name: t('Read Who I Follow'), value: 80 },
  { name: t('Read My Followers'), value: 130 },
  { name: t('Send data to other identities on my behalf'), value: 210 },
  { name: t('Receive data from other identities on my behalf'), value: 305 },
];
