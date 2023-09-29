import { t } from '@youfoundation/common-app';
import {
  AppPermissionLevels,
  CirclePermissionType,
  DrivePermissionType,
} from '@youfoundation/js-lib/network';

export const drivePermissionLevels = [
  { name: t('None'), value: DrivePermissionType.None },
  { name: t('Reader'), value: DrivePermissionType.Reader },
  { name: t('Writer'), value: DrivePermissionType.Writer },
  { name: t('Editor'), value: DrivePermissionType.Editor },
  { name: t('Commenter'), value: DrivePermissionType.Commenter }, // WriteReactionsAndComments
  { name: t('Full'), value: DrivePermissionType.Full }, // Commeter + Editor
];

export const circlePermissionLevels = [
  { name: t('None'), value: CirclePermissionType.None },
  { name: t('Read Connections'), value: CirclePermissionType.ReadConnections },
  { name: t('Read Circle Members'), value: CirclePermissionType.ReadCircleMembers },
];

export const appPermissionLevels = [
  { name: t('None'), value: AppPermissionLevels.None },
  { name: t('Read Connections'), value: AppPermissionLevels.ReadConnections },
  { name: t('Manage Connection Requests'), value: AppPermissionLevels.ManageConnectionRequests },
  { name: t('Read Circle Members'), value: AppPermissionLevels.ReadCircleMembers },
  { name: t('Read Who I Follow'), value: AppPermissionLevels.ReadWhoIFollow },
  { name: t('Read My Followers'), value: AppPermissionLevels.ReadMyFollowers },
  {
    name: t('Send data to other identities on my behalf'),
    value: AppPermissionLevels.SendDataToOtherIdentitiesOnMyBehalf,
  },
  {
    name: t('Receive data from other identities on my behalf'),
    value: AppPermissionLevels.ReceiveDataFromOtherIdentitiesOnMyBehalf,
  },
];
