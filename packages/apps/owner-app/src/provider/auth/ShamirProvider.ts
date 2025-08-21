import { DotYouClient } from '@homebase-id/js-lib/core';

export interface ShamiraPlayer {
  odinId: OdinId;
  type: PlayerType;
}

export interface DealerShardEnvelopeRedacted {
  shardId: string; //guid
  player: ShamiraPlayer;
}

export interface DealerShardConfig {
  envelopes: DealerShardEnvelopeRedacted[];
  created: number; 
}

// Assuming OdinId is just a GUID, we'll use string
export type OdinId = string;

export enum PlayerType {
  /**
   * The dealer can request the copy of the (encrypted) shard from a (machine) player
   */
  Automatic = 1,

  /**
   * The (human) player must click OK to release a shard to the dealer.
   */
  Delegate = 2,

  /**
   * The (human) player must give the information out-of-band, Not yet implemented
   */
  Manual = 3,
}

const root = "/security/recovery";

export const getShamirConfiguration = async (dotYouClient: DotYouClient) => {
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
