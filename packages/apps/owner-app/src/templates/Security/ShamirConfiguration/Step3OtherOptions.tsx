import {useState} from "react";
import {Input, Label, SubtleMessage, t} from "@homebase-id/common-app";
import {
  ConfigureShardsRequest,
  PlayerType,
} from "../../../provider/auth/ShamirProvider";
import {ConfigureTrustedConnections} from "./ConfigureTrustedConnections";
import {getRuleForPlayers} from "./ShamirDistributionDialog";

export const Step3OtherOptions = ({
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
  const [localPlayers, setLocalPlayers] = useState(config.players);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rule = getRuleForPlayers(localPlayers.length);
    const minAllowed = rule?.minShards ?? 1;
    const maxAllowed = localPlayers.length;
    const value = Math.min(Math.max(Number(e.target.value), minAllowed), maxAllowed);
    onChange(value);
  };

  const handleUpdateType = (odinId: string, type: PlayerType) => {
    setLocalPlayers(prev => prev.map(p => p.odinId === odinId ? {...p, type} : p));
    updatePlayerType?.(odinId, type);
  };

  const rule = getRuleForPlayers(localPlayers.length);
  const autoCount = localPlayers.filter(p => p.type === PlayerType.Automatic).length;
  const approveCount = localPlayers.filter(p => p.type === PlayerType.Delegate).length;

  return (
    <>
      <div className="flex w-full flex-col gap-2 p-5">
        {t("Configure Shard Release")}
        <div className="flex flex-row items-center gap-3">
          <Label>{t("Minimum matching shards")}</Label>
          <Input
            type="number"
            value={config.minMatchingShards}
            onChange={handleMinChange}
            className="w-16"
            min={rule?.minShards ?? 1}
            max={localPlayers.length}
          />
        </div>

        <SubtleMessage>
          <ul className="list-none space-y-1">
            <li><strong>'Release Automatically'</strong>: Fast but less secure — shard is sent during recovery.</li>
            <li><strong>'Approve First'</strong>: Ultimate security — requires the contact’s online approval.</li>
          </ul>
        </SubtleMessage>

        <div>Current mix: {autoCount} Auto + {approveCount} Approve</div>
      </div>

      <ConfigureTrustedConnections
        removePlayer={removePlayer}
        updatePlayerType={handleUpdateType}
        trustedPlayers={localPlayers}
      />
    </>
  );
};
