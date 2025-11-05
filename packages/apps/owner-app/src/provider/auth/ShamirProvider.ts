import {DotYouClient} from '@homebase-id/js-lib/core';
import {t} from "@homebase-id/common-app";

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

export interface ConfigureShardsRequest {
  players: ShamiraPlayer[];
  minMatchingShards: number;
}

export interface DealerShardEnvelopeRedacted {
  shardId: string; //guid
  player: ShamiraPlayer;
}

export interface ShardVerificationResult {
  isValid: boolean
  remoteServerError: boolean
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

export interface ApproveShardRequest {
  odinId: string;
  shardId: string;
}

export interface RejectShardRequest {
  odinId: string;
  shardId: string;
}


export interface ShardApprovalRequest {
  shardId: string;
  dealer: string;
  created: number
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

export const configureShards = async (dotYouClient: DotYouClient, request: ConfigureShardsRequest) => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient
    .post(`${root}/configure-shards`, request)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.warn(error);
      
      // getOdinErrorDetails(error).
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

export const approveShardRequest = async (
  dotYouClient: DotYouClient,
  payload: ApproveShardRequest
) => {
  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient
    .post(`${root}/approve-shard-request`, payload)
    .then(() => true)
    .catch((error) => {
      console.warn(error);
      return false;
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
