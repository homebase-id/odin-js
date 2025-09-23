import {getRecoveryInfo, RecoveryInfo, ShardTrustLevel} from "../../../provider/auth/SecurityHealthProvider";
import {PlayerListItem, Status} from "./PlayerListItem";
import {ConfigureShardsRequest} from "../../../provider/auth/ShamirProvider";
import {useEffect, useState} from "react";
import {Label, t} from "@homebase-id/common-app";
import {DealerRecoveryRiskDetails} from "../DealerRecoveryRiskDetails";

export function WaitForShardConfig({ request }: { request: ConfigureShardsRequest }) {
    const [recoveryInfo, setRecoveryInfo] = useState<RecoveryInfo | null>(null);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        let isMounted = true;
        let elapsedSec = 0;

        const fetchOnce = async () => {
            const cfg = await getRecoveryInfo(true);
            if (isMounted) setRecoveryInfo(cfg);
        };

        fetchOnce();

        const POLL_INTERVAL_MS = 10_000;
        const interval = setInterval(() => {
            elapsedSec += POLL_INTERVAL_MS / 1000;
            if (isMounted) setElapsed(elapsedSec);
            fetchOnce();
        }, POLL_INTERVAL_MS);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [request]);

    const SHOW_AFTER_SEC = 60;
    const hasIssue =
        elapsed >= SHOW_AFTER_SEC && !recoveryInfo?.recoveryRisk?.isRecoverable;

    const statusById = new Map(
        recoveryInfo?.recoveryRisk?.players.map((p) => [p.player.odinId, p]) ?? []
    );

    if (hasIssue) {
        const badShards =
            recoveryInfo?.recoveryRisk?.players.filter(
                (p) =>
                    !p.isValid ||
                    p.isMissing ||
                    p.trustLevel === ShardTrustLevel.Critical
            ) ?? [];

        return (
            <div className="p-4 bg-red-100 text-red-700 rounded">
                You have an issue with one or more of your shards:
                <ul className="list-disc ml-5 mt-2">
                    {badShards.map((p) => (
                        <li key={p.player.odinId}>{p.player.odinId}</li>
                    ))}
                </ul>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex w-full flex-row gap-2">
                <Label>{t("Overview")}:</Label>
                {recoveryInfo?.recoveryRisk ? (
                    <DealerRecoveryRiskDetails report={recoveryInfo.recoveryRisk} />
                ) : (
                    <span className="text-gray-500 italic">
            {t("waiting for shard statuses…")}
          </span>
                )}
            </div>

            <div>
                <Label>{t("Players")}:</Label>
                <div className="mt-2 space-y-1">
                    {request.players.map((p) => {
                        const statusInfo = statusById.get(p.odinId);

                        let status: Status = "loading";
                        let trustLevel = undefined;
                        let isMissing = false;

                        if (statusInfo) {
                            if (statusInfo.isValid && !statusInfo.isMissing) {
                                status = "valid";
                            } else if (!statusInfo.isValid) {
                                status = "invalid";
                            } else if (statusInfo.isMissing) {
                                status = "error";
                            }
                            trustLevel = statusInfo.trustLevel;
                            isMissing = statusInfo.isMissing;
                        }

                        return (
                            <PlayerListItem
                                key={p.odinId}
                                player={p}
                                isActive={false}
                                status={status}
                                trustLevel={trustLevel}
                                isMissing={isMissing}
                                onRetry={() => {
                                    // re-trigger polling or a one-off fetch
                                    getRecoveryInfo(true).then((cfg) => setRecoveryInfo(cfg));
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
