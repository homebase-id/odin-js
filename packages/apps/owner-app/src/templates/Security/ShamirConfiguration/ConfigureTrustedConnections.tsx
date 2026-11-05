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
import {getShardRecoveryPublicKey} from "../../../provider/auth/ZeroKnowledgeProvider";
import {Status, trustEmoji, trustLabel} from "./PlayerListItem"; // ✅ import helpers

type VerificationInfo = {
    status: Status;
    trustLevel?: ShardTrustLevel;
    isZeroKnowledge?: boolean;
};

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
        results: Record<string, VerificationInfo>
    ) => void;
}) => {
    const [statuses, setStatuses] = useState<
        Record<string, VerificationInfo>
    >({});

    const dotYouClient = useDotYouClientContext();
    const pickedKey = trustedPlayers.map((p) => p.odinId).join(",");

    // A friend removed is checked afresh when added again: after they review this connection, say
    useEffect(() => {
        const picked = new Set(trustedPlayers.map((p) => p.odinId));
        setStatuses((prev) => {
            const kept = Object.fromEntries(Object.entries(prev).filter(([odinId]) => picked.has(odinId)));
            return Object.keys(kept).length === Object.keys(prev).length ? prev : kept;
        });
    }, [pickedKey]);

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
                    // Their key says whether they have reviewed this connection, which every holder must have
                    // done; a key that can't be read leaves that to the server, which checks it again
                    const [res, callerMayWrite] = await Promise.all([
                        verifyRemotePlayerReadiness(dotYouClient, req),
                        getShardRecoveryPublicKey(dotYouClient, player.odinId)
                            .then((key) => key.callerMayWrite)
                            .catch(() => undefined),
                    ]);

                    // Only "valid" can hold a shard, which gates Next
                    const status: Status = !res ? "error"
                        : !res.isValid ? "invalid"
                        : callerMayWrite === false ? "notReviewed"
                        : "valid";
                    setStatuses((prev) => ({
                        ...prev,
                        [player.odinId]: {status, trustLevel: res?.trustLevel, isZeroKnowledge: res?.isZeroKnowledge},
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
    }, [enableVerification, pickedKey, forceVerify, dotYouClient]);


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
                                // Only a friend who must approve needs a zero-knowledge drive, and only a check
                                // that reached them can say theirs isn't; a failed check shows as unavailable
                                canApprove={
                                    !enableVerification ||
                                    player.type !== PlayerType.Delegate ||
                                    info.status !== "valid" ||
                                    info.isZeroKnowledge !== false
                                }
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
                                    canApprove = true,
                                }: {
    player: ShamiraPlayer;
    onRemove: () => void;
    onTypeChange: (mode: PlayerType) => void;
    allowUpdatePlayerType?: boolean;
    showPlayerType?: boolean;
    allowRemove?: boolean;
    verificationStatus: Status;
    trustLevel?: ShardTrustLevel;
    canApprove?: boolean;
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
                ) : verificationStatus === "notReviewed" ? (
                    <span className="text-xs text-red-600">
                        {t("{0} hasn't reviewed your connection yet, so they can't hold a shard", player.odinId)}
                    </span>
                ) : (
                    verificationStatus !== "valid" && verificationStatus !== "moot" && (
                        <span className="text-xs text-red-600">
                            {t("⚠ Unavailable")}
                        </span>
                    )
                )}

                {!canApprove && verificationStatus !== "loading" && (
                    <span className="text-xs text-orange-600">
                        {t("Can't approve until they log in to Homebase again")}
                    </span>
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
