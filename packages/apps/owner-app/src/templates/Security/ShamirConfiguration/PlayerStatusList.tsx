import { useEffect, useRef, useState} from "react";
import {
    Label,
    SubtleMessage,
    t,
    useDotYouClient,
} from "@homebase-id/common-app";
import {
    verifyRemotePlayerShard,
} from "../../../provider/auth/ShamirProvider";
import {DotYouClient} from "@homebase-id/js-lib/core";
import {
    DealerRecoveryRiskReport
} from "../../../provider/auth/SecurityHealthProvider";
import {TimeAgoUtc} from "../../../components/ui/Date/TimeAgoUtc";
import {PlayerListItem, Status} from "./PlayerListItem";
import {DealerRecoveryRiskHeadline} from "../DealerRecoveryRiskHeadline";

export interface ShardVerificationResult {
    isValid: boolean;
}

export interface VerifyRemotePlayerShardRequest {
    odinId: string;
    shardId: string;
}

const toKey = (odinId: string) => odinId.toLowerCase();

/** single immediate verification (used by manual retry) */
async function verifyOnce(
    client: DotYouClient,
    req: VerifyRemotePlayerShardRequest
): Promise<"valid" | "invalid" | "error"> {
    try {
        const result: ShardVerificationResult | null =
            await verifyRemotePlayerShard(client, req);
        return result?.isValid ? "valid" : "invalid";
    } catch {
        return "error";
    }
}

export const PlayerStatusList = ({report}: {
    report: DealerRecoveryRiskReport;
}) => {
    if (!report) {
        return null;
    }

    const [statusByOdin, setStatusByOdin] = useState<Record<string, Status>>({});
    const {getDotYouClient} = useDotYouClient();
    const unmountedRef = useRef(false);

    useEffect(() => {
        unmountedRef.current = false;
        return () => {
            unmountedRef.current = true;
        };
    }, []);

    useEffect(() => {
        if (!report.players.length) return;

        // first run immediately
        report.players.forEach((p) => {
            if (!p.isMissing && !p.isValid) {
                runVerificationOnce(p.player.odinId, p.shardId);
            }
        });

        // set up interval
        const interval = setInterval(() => {
            report.players.forEach((p) => {
                if (!p.isMissing && !p.isValid) {
                    runVerificationOnce(p.player.odinId, p.shardId);
                }
            });
        }, 2_000);

        return () => clearInterval(interval);
    }, [report?.players, getDotYouClient]);

    const runVerificationOnce = async (odinId: string, shardId: string) => {
        const k = toKey(odinId);
        setStatusByOdin((prev) => ({...prev, [k]: "loading"}));
        const status = await verifyOnce(getDotYouClient(), {odinId, shardId});
        if (!unmountedRef.current) {
            setStatusByOdin((prev) => ({...prev, [k]: status}));
        }
    };

    return (
        <>
            <div className="mt-3 flex w-full flex-row gap-2">
                <Label>{t("Status")}:</Label>
                <DealerRecoveryRiskHeadline report={report} hidePrompt={true}/>
            </div>
            
            
            <div className="mt-3 flex w-full flex-row gap-2">
                <Label>{t("Last Checked")}:</Label>
                <TimeAgoUtc value={report.healthLastChecked ?? 0}/>
            </div>

            <div className="mt-3">
                <Label>{t("Trusted connections")}</Label>
                <SubtleMessage>
                    <p>
                        {t(
                            `The connections below each hold a piece of the data needed to recover your 
                            account. To regain access, at least ${report.minRequired} trusted 
                            connections must respond to your request.`
                        )}
                    </p>
                </SubtleMessage>
            </div>

            <div className="flex w-full flex-col">
                {report.players.length ? (
                    <div className="flex-grow overflow-auto">
                        {report.players.map((p, index) => {
                            const key = toKey(p.player.odinId);
                            const statusOverride = statusByOdin[key];

                            let status: Status;
                            if (p.isMissing) {
                                status = "error";
                            } else if (statusOverride) {
                                status = statusOverride;
                            } else {
                                status = p.isValid ? "valid" : "invalid";
                            }

                            return (
                                <PlayerListItem
                                    key={p.player.odinId || index}
                                    player={p.player}
                                    isActive={false}
                                    status={status}
                                    trustLevel={p.trustLevel}
                                    isMissing={p.isMissing}
                                    onRetry={() =>
                                        runVerificationOnce(p.player.odinId, p.shardId)
                                    }
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-grow items-center justify-center p-5">
                        <p className="text-slate-400">{t("No trusted connections selected")}</p>
                    </div>
                )}
            </div>
        </>
    );

};
