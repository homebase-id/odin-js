import {Input, Label, SubtleMessage, t} from '@homebase-id/common-app';
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
  removePlayer?: (odinId: string) => void;
  updatePlayerType?: (odinId: string, type: PlayerType) => void;
}) => {
  return (
    <>
        <div className="flex w-full flex-col gap-2 p-5">
            <div className="flex flex-row items-center gap-3">
                <Label>{t("Minimum matching shards")}</Label>
                <Input
                    type="number"
                    value={config.minMatchingShards}
                    onChange={(e) => onChange(Number(e.target.value))}
                    placeholder={t("###")}
                    className="w-12 "
                    min={1}
                />
            </div>

            <SubtleMessage>
                {t('Minimum matching shards is the fewest number of your trusted connections that need to help you before your account can be recovered.')}
            </SubtleMessage>
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

