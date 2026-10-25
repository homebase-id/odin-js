import {
  DotYouClient,
  getFileHeaderBytesByUniqueId,
  getKnownOdinErrorMessages,
  isDeposit,
} from '@homebase-id/js-lib/core';
import {
  FriendToDealTo,
  dealToFriends,
  openWriteOnlyPrivateKey,
  releaseGatedShard,
} from '@homebase-id/js-lib/auth';
import {t} from "@homebase-id/common-app";
import {ShardTrustLevel} from "./SecurityHealthProvider";
import {getShardRecoveryDrive, postDeal, requireZkMasterKey} from "./ZeroKnowledgeProvider";
import {SHARD_RECOVERY_DRIVE} from "../app/wellKnownDrives";

export const SHAMIR_DEALER_SHARD_CONFIG_FILE_TYPE = 44532;
export const SHAMIR_PLAYER_ENCRYPTED_SHARD_FILE_TYPE = 74829;
export const SHAMIR_PLAYER_COLLECTED_SHARD_REQUEST_FILE_TYPE = 84099;

export const playerTypeText = (type: PlayerType) => {
  switch (type) {
    case PlayerType.Delegate:
      return t('Approval First');

    case PlayerType.Automatic:
      return t('Release Automatically');

    case PlayerType.Manual:
      return t('Connect off Homebase');
  }
}

export type ShamirConfigurationType = 'manual' | 'auto';


export interface ShamiraPlayer {
  odinId: OdinId;
  type: PlayerType;
}

/** Who gets a shard and how many must come back; the browser deals it (`configureShards`). */
export interface ShamirDealPlan {
  players: ShamiraPlayer[];
  minMatchingShards: number;
}

export interface DealerShardEnvelopeRedacted {
  shardId: string; //guid
  player: ShamiraPlayer;
}


export interface RemotePlayerReadinessResult
{
  isValid: boolean
  trustLevel: ShardTrustLevel
  /** Whether their Shard Recovery drive is zero knowledge, so they can hold a shard that needs their approval */
  isZeroKnowledge?: boolean
}

export interface ShardVerificationResult {
  isValid: boolean
  remoteServerError: boolean
  // false when a delegate is no longer connected, so cannot deliver its shard (odin-core #1885)
  isConnected: boolean
}

export interface VerifyRemotePlayerReadinessRequest {
  odinId: string;
}

export interface VerifyRemotePlayerShardRequest {
  odinId: string;
  shardId: string;
}

export interface DealerShardConfig {
  minMatchingShards: number;
  envelopes: DealerShardEnvelopeRedacted[];
  updated: number;
  usesAutomaticRecovery: boolean;
}

export interface RejectShardRequest {
  odinId: string;
  shardId: string;
}


export interface ShardApprovalRequest {
  shardId: string;
  dealer: string;
  created: number
  /** The recovering browser's throwaway public key: approving seals the shard to it */
  recoveryPublicKeyJwk?: string | null
}

// Assuming OdinId is just a GUID, we'll use string
export type OdinId = string;

export enum PlayerType {
  /**
   * The dealer can request the copy of the (encrypted) shard from a (machine) player
   */
  Automatic = "automatic",

  /**
   * The (human) player must click OK to release a shard to the dealer.
   */
  Delegate = "delegate",

  /**
   * The (human) player must give the information out-of-band, Not yet implemented
   */
  Manual = "manual"
}

const root = "/security/recovery";

/** A gated friend's Shard Recovery write-only public key; their shard is sealed to it. */
const getGatedFriendPublicKey = async (dotYouClient: DotYouClient, odinId: string) => {
  const key = await dotYouClient
    .createAxiosClient()
    .get<{ publicKeyJwk: string; isZeroKnowledge: boolean }>(
      `${dotYouClient.getRoot()}/api/v2/peer/${encodeURIComponent(odinId)}/apps/recovery/drives/shard-recovery/public-key`
    )
    .then((response) => response.data);

  // Until they log in once more, their server holds the private key and could release the shard itself
  if (!key.isZeroKnowledge) {
    throw new Error(t(`${odinId} has to log in to Homebase once more before they can hold a shard that needs their approval`));
  }
  return key.publicKeyJwk;
};

/**
 * Deals the shards in this browser: the secret they rebuild never reaches the server
 * (odin-core docs/zero-knowledge-recovery-plan.md, "Building the friends pair"). Throws with a
 * message to show.
 */
export const configureShards = async (dotYouClient: DotYouClient, plan: ShamirDealPlan) => {
  const zkMasterKey = await requireZkMasterKey(dotYouClient, 'set up recovery with friends');
  const friends: FriendToDealTo[] = await Promise.all(
    plan.players.map(async (p) => {
      if (p.type === PlayerType.Delegate) {
        return {odinId: p.odinId, type: 'delegate', publicKeyJwk: await getGatedFriendPublicKey(dotYouClient, p.odinId)};
      }
      if (p.type === PlayerType.Automatic) return {odinId: p.odinId, type: 'automatic'};
      throw new Error(t('Only friends who approve or release automatically can hold a shard'));
    })
  );
  const request = await dealToFriends(friends, plan.minMatchingShards, zkMasterKey);
  await postDeal(dotYouClient, request, t('Failed to distribute the shards'));
}

export const verifyRemotePlayerReadiness = async (dotYouClient: DotYouClient, request: VerifyRemotePlayerReadinessRequest): Promise<RemotePlayerReadinessResult | null> => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient
      .post<RemotePlayerReadinessResult>(`${root}/verify-remote-player-readiness`, request)
      .then((response) => {
        return response.data;
      })
      .catch((error) => {
        console.warn(error);
        return null;
      });
}

export const verifyRemotePlayerShard = async (dotYouClient: DotYouClient, request: VerifyRemotePlayerShardRequest): Promise<ShardVerificationResult | null> => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient
    .post<ShardVerificationResult>(`${root}/verify-remote-player-shard`, request)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.warn(error);
      return null;
    });
}

export const getShamirConfiguration = async (dotYouClient: DotYouClient): Promise<DealerShardConfig | null> => {
  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient
    .get<DealerShardConfig>(`${root}/config`)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.warn(error);
      return null;
    });
};

export const getShardRequestList = async (
  dotYouClient: DotYouClient
): Promise<ShardApprovalRequest[] | null> => {
  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient
    .get<ShardApprovalRequest[]>(`${root}/shard-request-list`)
    .then((response) => response.data)
    .catch((error) => {
      console.warn(error);
      return null;
    });
};

/**
 * Approves a dealer's request: this browser opens the shard (sealed to this identity's Shard
 * Recovery drive) and seals it again to the recovering browser's key. The piece stays locked by the
 * dealer's own key, so nothing here learns it. Throws with a message to show.
 */
export const approveShardRequest = async (dotYouClient: DotYouClient, request: ShardApprovalRequest) => {
  if (!request.recoveryPublicKeyJwk) throw new Error(t('This request is from an older version; ask them to start again'));

  const [zkMasterKey, drive, file] = await Promise.all([
    requireZkMasterKey(dotYouClient, 'approve a recovery'),
    getShardRecoveryDrive(dotYouClient),
    getFileHeaderBytesByUniqueId(dotYouClient, SHARD_RECOVERY_DRIVE, request.shardId, {decrypt: false}),
  ]);
  if (!file || !isDeposit(file) || !drive) {
    throw new Error(t('This shard is from an older setup; ask them to set up recovery again'));
  }

  const writeOnlyPrivateKey = await openWriteOnlyPrivateKey(drive, zkMasterKey);
  const {index, sealedShard} = await releaseGatedShard(
    {content: file.fileMetadata.appData.content, keyHeader: file.sharedSecretEncryptedKeyHeader},
    writeOnlyPrivateKey,
    request.recoveryPublicKeyJwk
  );

  await dotYouClient
    .createAxiosClient()
    .post(`${root}/approve-shard-request`, {odinId: request.dealer, shardId: request.shardId, index, sealedShard})
    .catch((error) => {
      console.warn(error);
      // The shared text is for the recovering owner's link; this is the friend approving
      if (error?.response?.data?.errorCode === 'shardLinkNoLongerValid') {
        throw new Error(t('{0} has ended or started over their recovery; this request is gone', request.dealer));
      }
      throw new Error(getKnownOdinErrorMessages(error) ?? t('The shard could not be released'));
    });
};

export const rejectShardRequest = async (
  dotYouClient: DotYouClient,
  payload: RejectShardRequest
) => {
  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient
    .post(`${root}/reject-shard-request`, payload)
    .then(() => true)
    .catch((error) => {
      console.warn(error);
      return false;
    });
};
