import {Input, Label, t} from '@homebase-id/common-app';
import {ConfigureShardsRequest, PlayerType} from "../../../provider/auth/ShamirProvider";
import {ConfigureTrustedConnections} from "./ConfigureTrustedConnections";

export const Step2OtherOptions = ({
                                    config,
                                    onChange,
                                    removePlayer,
                                    updatePlayerType,
                                  }: {
  config: ConfigureShardsRequest;
  onChange: (minShards: number) => void;
  removePlayer: (odinId: string) => void;
  updatePlayerType: (odinId: string, type: PlayerType) => void;
}) => {
  return (
    <>
      <div className="flex w-full flex-col gap-2 p-5">
        <Label htmlFor="duration">
          {t('Minimum matching shards')}
        </Label>
        <Input
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
          placeholder={t('Set min shards')}
          value={config.minMatchingShards}
        />
      </div>
      <div>
        <ConfigureTrustedConnections
          removePlayer={removePlayer}
          updatePlayerType={updatePlayerType}
          trustedPlayers={config.players}/>
      </div>
    </>
  );
};

