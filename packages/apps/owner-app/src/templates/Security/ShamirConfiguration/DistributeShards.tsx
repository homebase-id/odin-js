import {
  ConnectionImage, ConnectionName,
  Label, SubtleMessage,
  t,
} from '@homebase-id/common-app';
import {ReactNode} from 'react';
import {ConfigureShardsRequest} from "../../../provider/auth/ShamirProvider";
import {ConfigureTrustedConnections} from "./ConfigureTrustedConnections";

export const DistributeShards = ({config}: {
  config: ConfigureShardsRequest;
}) => {

  return (
    <>
      <Label>
        {t('Review')}
      </Label>

      {t('Minimum matching Shards')} : {config.minMatchingShards}
      <SubtleMessage>
        {t('Minimum matching shards is the minimum number of shards that must be made ' +
          'available in the case you need to recover your account.')}
      </SubtleMessage>
      <br/>
      <br/>
      <br/>

      Trusted Connections
      <br/>
      {config.players?.length ? (
        <ConfigureTrustedConnections
          removePlayer={undefined}
          updatePlayerType={undefined}
          trustedPlayers={config.players}/>
      ) : (
        <div className="flex flex-grow items-center justify-center p-5">
          <p className="text-slate-400">{t('You are missing trusted connections')}</p>
        </div>
      )}
    </>
  );
};
