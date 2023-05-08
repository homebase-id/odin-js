import { t } from '@youfoundation/common-app';

export const drivePermissionLevels = [
  { name: t('None'), value: 0 },
  { name: t('Reader'), value: 1 },
  { name: t('Writer'), value: 2 },
  { name: t('Editor'), value: 3 },
  { name: t('Commenter'), value: 4 }, // WriteReactionsAndComments
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
];
