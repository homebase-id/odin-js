import {ConnectionImage, ConnectionName, SubtleMessage, t,} from "@homebase-id/common-app";
import {PlayerType, playerTypeText, ShamiraPlayer} from "../../../provider/auth/ShamirProvider";

export const ConfigureTrustedConnections = ({
                                              removePlayer,
                                              updatePlayerType,
                                              trustedPlayers,
                                              showPlayerType
                                            }: {
  removePlayer?: (odinId: string) => void;
  updatePlayerType?: (odinId: string, mode: PlayerType) => void;
  trustedPlayers: ShamiraPlayer[];
  showPlayerType?: boolean
}) => {

  return (
    <>
      {trustedPlayers?.length ? (
        <div className="flex-grow overflow-auto">
          {trustedPlayers.map((player, index) => (
            <SelectedConnectionItem
              key={player.odinId || index}
              player={player}
              onRemove={() => {
                if (removePlayer) removePlayer(player.odinId)
              }}
              onTypeChange={(type) => {
                if (updatePlayerType) updatePlayerType(player.odinId, type)
              }}
              allowUpdatePlayerType={updatePlayerType !== undefined}
              showPlayerType={showPlayerType}
              allowRemove={removePlayer !== undefined}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-grow items-center justify-center p-5">
          <p className="text-slate-400">
            {t("Select trusted connections from your contacts below")}
          </p>
        </div>
      )}
    </>
  );
};

const SelectedConnectionItem = ({
                                  player,
                                  onRemove,
                                  onTypeChange,
                                  allowUpdatePlayerType,
                                  allowRemove,
                                  showPlayerType
                                }: {
  player: ShamiraPlayer;
  onRemove: () => void;
  onTypeChange: (mode: PlayerType) => void;
  allowUpdatePlayerType?: boolean;
  showPlayerType?: boolean;
  allowRemove?: boolean;
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border p-3 mb-2">
      {/* left side: connection info */}
      <div className="flex items-center gap-3">
        <ConnectionImage
          odinId={player.odinId}
          className="border border-neutral-200 dark:border-neutral-800"
          size="sm"
        />
        <ConnectionName odinId={player.odinId}/>
      </div>

      {/* right side: controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        {allowUpdatePlayerType ? (
          <select
            value={player.type}
            onChange={(e) => onTypeChange(e.target.value as PlayerType)}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:bg-slate-800">
            <option value={PlayerType.Automatic}>{playerTypeText(PlayerType.Automatic)}</option>
            <option value={PlayerType.Delegate}>{playerTypeText(PlayerType.Delegate)}</option>
          </select>
        ) : (
          <>
            {showPlayerType && <SubtleMessage>{playerTypeText(player.type)}</SubtleMessage>}
          </>
        )}

        {allowRemove && <button
            onClick={onRemove}
            className="text-red-600 hover:text-red-800 text-sm sm:text-xs sm:bg-red-500 sm:px-2 sm:py-1 sm:rounded sm:text-white sm:hover:bg-red-600">
          {t("Remove")}
        </button>}
      </div>
    </div>
  )
    ;
};
