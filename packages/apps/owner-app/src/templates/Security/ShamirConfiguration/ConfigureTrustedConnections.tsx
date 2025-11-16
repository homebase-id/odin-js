import {
    ConnectionImage,
    ConnectionName,
    SubtleMessage,
    t,
    useDotYouClientContext,
} from "@homebase-id/common-app";
import {useEffect, useState} from "react";
import {
    PlayerType,
    playerTypeText,
    ShamiraPlayer,
    verifyRemotePlayerReadiness,
    VerifyRemotePlayerReadinessRequest,
} from "../../../provider/auth/ShamirProvider";
import {ShardTrustLevel} from "../../../provider/auth/SecurityHealthProvider";
import {Status, trustEmoji, trustLabel} from "./PlayerListItem"; // ✅ import helpers

export const ConfigureTrustedConnections = ({
                                                removePlayer,
                                                updatePlayerType,
                                                trustedPlayers,
                                                showPlayerType,
                                                enableVerification = false,
                                                onVerificationComplete,
                                                forceVerify = 0
                                            }: {
    removePlayer?: (odinId: string) => void;
    updatePlayerType?: (odinId: string, mode: PlayerType) => void;
    trustedPlayers: ShamiraPlayer[];
    showPlayerType?: boolean;
    forceVerify: number;
    enableVerification?: boolean;
    onVerificationComplete?: (
        results: Record<
            string,
            { status: Status; trustLevel?: ShardTrustLevel; isValid?: boolean }
        >
    ) => void;
}) => {
    const [statuses, setStatuses] = useState<
        Record<
            string,
            { status: Status; trustLevel?: ShardTrustLevel; isValid?: boolean }
        >
    >({});

    const dotYouClient = useDotYouClientContext();

    useEffect(() => {
        if (!enableVerification || !trustedPlayers?.length) return;

        const verifyNewPlayers = async () => {
            for (const player of trustedPlayers) {
                // Skip already verified players
                if (statuses[player.odinId]) continue;

                // Mark as loading
                setStatuses((prev) => ({
                    ...prev,
                    [player.odinId]: {status: "loading"},
                }));

                try {
                    const req: VerifyRemotePlayerReadinessRequest = {odinId: player.odinId};
                    const res = await verifyRemotePlayerReadiness(dotYouClient, req);

                    setStatuses((prev) => ({
                        ...prev,
                        [player.odinId]: res
                            ? {
                                status: res.isValid ? "valid" : "invalid",
                                trustLevel: res.trustLevel,
                                isValid: res.isValid,
                            }
                            : {status: "error"},
                    }));
                } catch (e) {
                    console.error(e);
                    setStatuses((prev) => ({
                        ...prev,
                        [player.odinId]: {status: "error"},
                    }));
                }
            }

            // Report results upward
            onVerificationComplete?.(statuses);
        };

        verifyNewPlayers();
        // Only re-run when a new odinId appears or verification is toggled
    }, [enableVerification, trustedPlayers.map(p => p.odinId).join(","), forceVerify, dotYouClient]);


    return (
        <>
            {trustedPlayers?.length ? (
                <div className="flex-grow overflow-auto">
                    {trustedPlayers.map((player, index) => {
                        const info = statuses[player.odinId] || {status: "loading"};

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
                                verificationStatus={
                                    enableVerification ? info.status : "moot"
                                }
                                trustLevel={
                                    enableVerification ? info.trustLevel : undefined
                                }
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
    // ✅ Use the same color logic as PlayerListItem
    const trustColor =
        trustLevel === ShardTrustLevel.Critical && player.type === "delegate"
            ? "text-red-600"
            : trustLevel === ShardTrustLevel.Medium
                ? "text-orange-600"
                : trustLevel === ShardTrustLevel.Low
                    ? "text-yellow-600"
                    : "text-green-600";

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border p-3 mb-2">
            <div className="flex items-center gap-3">
                <ConnectionImage
                    odinId={player.odinId}
                    className="border border-neutral-200 dark:border-neutral-800"
                    size="sm"
                />
                <ConnectionName odinId={player.odinId}/>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm">

                {trustLevel && (
                    <span className={`flex items-center gap-1 ${trustColor}`}>
                        {trustEmoji(trustLevel)} {trustLabel(trustLevel, "")}
                    </span>
                )}

                {verificationStatus === "loading" ? (
                    <span className="text-slate-500">{t("Verifying...")}</span>
                ) : (
                    (verificationStatus === "invalid" ||
                        verificationStatus === "error" ||
                        !isValid) && (
                        <span className="text-xs text-red-600">
                            {t("⚠ Unavailable")}
                        </span>
                    )
                )}

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
