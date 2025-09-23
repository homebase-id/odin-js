import {
  Label, SubtleMessage,
  t,
} from '@homebase-id/common-app';
import {ConfigureShardsRequest} from "../../../provider/auth/ShamirProvider";
import {ConfigureTrustedConnections} from "./ConfigureTrustedConnections";

export const DistributeShardsReview = ({config}: {
  config: ConfigureShardsRequest;
}) => {

  return (
    <>
      <h1>
        {t('Review')}
      </h1>

      {t('Minimum matching Shards')} : {config.minMatchingShards}
      <SubtleMessage>
          {t('Minimum matching shards is the fewest number of your trusted connections that need to help you before your account can be recovered.')}
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
