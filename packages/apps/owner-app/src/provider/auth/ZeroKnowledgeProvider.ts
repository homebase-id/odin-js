import { DotYouClient, getDrivesByType } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import {
  LoginKeys,
  ZkConvertDriveRequest,
  ZkKeysRequest,
  ZkStatus,
  makeZkDriveKeys,
  makeZkKeys,
  openZkMasterKey,
  zkOpen,
} from '@homebase-id/js-lib/auth';
import { SHARD_RECOVERY_DRIVE } from '../app/wellKnownDrives';

// The owner's zero-knowledge keys (odin-core docs/zero-knowledge-keys-plan.md). The browser makes
// and opens every key; the identity server only stores the locked copies. The password is needed
// only at login and at a password change.

const getZkStatus = async (dotYouClient: DotYouClient): Promise<ZkStatus> =>
  dotYouClient
    .createAxiosClient()
    .get<ZkStatus>('/security/zk')
    .then((response) => response.data);

const saveZkKeys = async (dotYouClient: DotYouClient, request: ZkKeysRequest) =>
  dotYouClient.createAxiosClient().post('/security/zk/keys', request);

const convertShardRecoveryDrive = async (
  dotYouClient: DotYouClient,
  request: ZkConvertDriveRequest
) => dotYouClient.createAxiosClient().post('/security/zk/convert-shard-recovery-drive', request);

// Converted, and with a key the current master key opens. After a reset with the recovery key the
// master key is new, so the drive is converted again.
const shardRecoveryDriveOpens = async (dotYouClient: DotYouClient, masterKey: Uint8Array) => {
  const drives = await getDrivesByType(dotYouClient, SHARD_RECOVERY_DRIVE.type, 1, 10);
  const lockedKey = drives.results.find((drive) =>
    stringGuidsEqual(drive.targetDriveInfo.alias, SHARD_RECOVERY_DRIVE.alias)
  )?.zkMasterKeyEncryptedStorageKey;
  if (!lockedKey) return false;

  try {
    await zkOpen(lockedKey, masterKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Runs after every owner login, while the browser still has the password: makes the keys the first
 * time, and converts the Shard Recovery drive when it needs it. Nobody sees any of it.
 */
export const ensureZeroKnowledgeKeys = async (
  dotYouClient: DotYouClient,
  password: string,
  loginKeys: LoginKeys
) => {
  const status = await getZkStatus(dotYouClient);

  let masterKey: Uint8Array;
  if (!status.zkSaltKek64) {
    const keys = await makeZkKeys(password, loginKeys);
    await saveZkKeys(dotYouClient, keys.request);
    masterKey = keys.masterKey;
  } else {
    masterKey = await openZkMasterKey(password, status);
  }

  if (!(await shardRecoveryDriveOpens(dotYouClient, masterKey))) {
    const { request } = await makeZkDriveKeys(SHARD_RECOVERY_DRIVE.alias, masterKey);
    await convertShardRecoveryDrive(dotYouClient, request);
  }
};

/**
 * For a password change: the keys re-locked with the new password, with the new login keys.
 * Undefined while the browser has not made them yet; the next login does.
 */
export const relockZkKeysForNewPassword = async (
  dotYouClient: DotYouClient,
  oldPassword: string,
  newPassword: string,
  newLoginKeys: LoginKeys
): Promise<ZkKeysRequest | undefined> => {
  const status = await getZkStatus(dotYouClient);
  if (!status.zkSaltKek64) return undefined;

  const masterKey = await openZkMasterKey(oldPassword, status);
  return (await makeZkKeys(newPassword, newLoginKeys, masterKey)).request;
};
