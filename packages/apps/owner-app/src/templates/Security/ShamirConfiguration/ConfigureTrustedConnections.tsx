import {
    ConnectionImage,
    ConnectionName,
    SubtleMessage,
    t,
    useDotYouClientContext,
} from "@homebase-id/common-app";
import { useEffect, useState } from "react";
import {
    PlayerType,
    playerTypeText,
    ShamiraPlayer,
    verifyRemotePlayerReadiness,
    VerifyRemotePlayerReadinessRequest,
} from "../../../provider/auth/ShamirProvider";
import { ShardTrustLevel } from "../../../provider/auth/SecurityHealthProvider";
import { Status } from "./PlayerListItem";

export const ConfigureTrustedConnections = ({
                                                removePlayer,
                                                updatePlayerType,
                                                trustedPlayers,
                                                showPlayerType,
                                                enableVerification = false,
                                                onVerificationComplete,
                                            }: {
    removePlayer?: (odinId: string) => void;
    updatePlayerType?: (odinId: string, mode: PlayerType) => void;
    trustedPlayers: ShamiraPlayer[];
    showPlayerType?: boolean;
    enableVerification?: boolean;
    onVerificationComplete?: (results: Record<string,{ status: Status; trustLevel?: ShardTrustLevel; isValid?: boolean }>) => void;
}) => {
    const [statuses, setStatuses] = useState<
        Record<
            string,
            { status: Status; trustLevel?: ShardTrustLevel; isValid?: boolean }
        >
    >({});

    const dotYouClient = useDotYouClientContext();

    useEffect(() => {
        if (!enableVerification) return;

        if(!trustedPlayers?.length){
            const results: Record<string,{ status: Status; trustLevel?: ShardTrustLevel; isValid?: boolean }> = {};
            onVerificationComplete?.(results);
            return;
        }

        const verifyAll = async () => {
            const results: Record<string,{ status: Status; trustLevel?: ShardTrustLevel; isValid?: boolean }> = {};

            for (const player of trustedPlayers) {
                results[player.odinId] = { status: "loading" };
                setStatuses((prev) => ({
                    ...prev,
                    [player.odinId]: results[player.odinId],
                }));

                try {
                    const req: VerifyRemotePlayerReadinessRequest = {
                        odinId: player.odinId,
                    };
                    const res = await verifyRemotePlayerReadiness(dotYouClient, req);

                    if (res != null) {
                        results[player.odinId] = {
                            status: res.isValid ? "valid" : "invalid",
                            trustLevel: res.trustLevel,
                            isValid: res.isValid,
                        };
                    } else {
                        results[player.odinId] = { status: "error" };
                    }
                } catch (e) {
                    console.error(e);
                    results[player.odinId] = { status: "error" };
                }

                setStatuses((prev) => ({
                    ...prev,
                    [player.odinId]: results[player.odinId],
                }));

                // Optionally report incremental progress
                onVerificationComplete?.({
                    ...results,
                    [player.odinId]: results[player.odinId],
                });
            }

            // final result callback
            onVerificationComplete?.(results);
        };

        verifyAll();
        
    }, [enableVerification, trustedPlayers, dotYouClient]);

    return (
        <>
            {trustedPlayers?.length ? (
                <div className="flex-grow overflow-auto">
                    {trustedPlayers.map((player, index) => {
                        const info = statuses[player.odinId] || { status: "loading" };

                        return (
                            <SelectedConnectionItem
                                key={player.odinId || index}
                                player={player}
                                onRemove={() => removePlayer?.(player.odinId)}
                                onTypeChange={(type) =>
                                    updatePlayerType?.(player.odinId, type)
                                }
                                allowUpdatePlayerType={!!updatePlayerType}
                                allowRemove={!!removePlayer}
                                showPlayerType={showPlayerType}
                                verificationStatus={enableVerification ? info.status : "moot"}
                                trustLevel={enableVerification ? info.trustLevel : undefined}
                                isValid={enableVerification ? info.isValid : true}
                            />
                        );
                    })}
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
                                    showPlayerType,
                                    verificationStatus,
                                    trustLevel,
                                    isValid,
                                }: {
    player: ShamiraPlayer;
    onRemove: () => void;
    onTypeChange: (mode: PlayerType) => void;
    allowUpdatePlayerType?: boolean;
    showPlayerType?: boolean;
    allowRemove?: boolean;
    verificationStatus: Status;
    trustLevel?: ShardTrustLevel;
    isValid?: boolean;
}) => {
    const trustColor =
        trustLevel === ShardTrustLevel.Critical
            ? "text-red-600"
            : trustLevel === ShardTrustLevel.Medium
                ? "text-orange-600"
                : trustLevel === ShardTrustLevel.Low
                    ? "text-yellow-600"
                    : "text-green-600";

    const trustMsg =
        trustLevel === ShardTrustLevel.Low
            ? t("Trust level is low")
            : trustLevel === ShardTrustLevel.Medium
                ? t("Trust level is medium")
                : undefined;

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border p-3 mb-2">
            <div className="flex items-center gap-3">
                <ConnectionImage
                    odinId={player.odinId}
                    className="border border-neutral-200 dark:border-neutral-800"
                    size="sm"
                />
                <ConnectionName odinId={player.odinId} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm">

                {trustMsg && <span className={trustColor}>{trustMsg}</span>}

                {verificationStatus === "loading" ? (
                    <span className="text-slate-500">{t("Verifying...")}</span>
                ) : ((verificationStatus === "invalid" ||
                    verificationStatus === "error" || !isValid) && (
                    <span className="text-xs text-red-600">{t("⚠ Unavailable")}</span>
                ))}

                {allowUpdatePlayerType ? (
                    <select
                        value={player.type}
                        onChange={(e) => onTypeChange(e.target.value as PlayerType)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:bg-slate-800"
                    >
                        <option value={PlayerType.Automatic}>
                            {playerTypeText(PlayerType.Automatic)}
                        </option>
                        <option value={PlayerType.Delegate}>
                            {playerTypeText(PlayerType.Delegate)}
                        </option>
                    </select>
                ) : (
                    showPlayerType && (
                        <SubtleMessage>{playerTypeText(player.type)}</SubtleMessage>
                    )
                )}


                {allowRemove && (
                    <button
                        onClick={onRemove}
                        className="text-red-600 hover:text-red-800 text-sm sm:text-xs sm:bg-red-500 sm:px-2 sm:py-1 sm:rounded sm:text-white sm:hover:bg-red-600"
                    >
                        {t("Remove")}
                    </button>
                )}
            </div>
        </div>
    );
};
