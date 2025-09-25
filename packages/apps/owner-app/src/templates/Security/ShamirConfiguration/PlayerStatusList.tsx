import { useEffect, useRef, useState } from "react";
import {
    Label,
    SubtleMessage,
    t,
    useDotYouClient,
} from "@homebase-id/common-app";
import {
    ShardVerificationResult,
    verifyRemotePlayerShard,
    VerifyRemotePlayerShardRequest,
} from "../../../provider/auth/ShamirProvider";
import { DotYouClient } from "@homebase-id/js-lib/core";
import {
    DealerRecoveryRiskReport,
} from "../../../provider/auth/SecurityHealthProvider";
import { TimeAgoUtc } from "../../../components/ui/Date/TimeAgoUtc";
import { PlayerListItem, Status } from "./PlayerListItem";
import { DealerRecoveryRiskHeadline } from "../DealerRecoveryRiskHeadline";

const toKey = (odinId: string) => odinId.toLowerCase();

/** single immediate verification (used by manual retry) */
async function verifyOnce(
  client: DotYouClient,
  req: VerifyRemotePlayerShardRequest
): Promise<"valid" | "invalid" | "error" | "serverError"> {
    try {
        const result: ShardVerificationResult | null = await verifyRemotePlayerShard(client, req);

        if (result?.remoteServerError) {
            return "serverError"; // distinguish server errors
        }

        return result?.isValid ? "valid" : "invalid";
    } catch {
        return "error";
    }
}

export const PlayerStatusList = ({ report }: { report: DealerRecoveryRiskReport }) => {
    if (!report) {
        return null;
    }

    const [statusByOdin, setStatusByOdin] = useState<Record<string, Status>>({});
    const { getDotYouClient } = useDotYouClient();
    const unmountedRef = useRef(false);

    // tracks odinIds that should no longer be retried
    const noRetryRef = useRef<Record<string, boolean>>({});

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
            const key = toKey(p.player.odinId);
            if (!p.isMissing && !p.isValid && !noRetryRef.current[key]) {
                runVerificationOnce(p.player.odinId, p.shardId);
            }
        });

        // set up interval
        const interval = setInterval(() => {
            report.players.forEach((p) => {
                const key = toKey(p.player.odinId);

                // only retry if not missing, not valid, and not flagged no-retry
                if (!p.isMissing && !p.isValid && !noRetryRef.current[key]) {
                    runVerificationOnce(p.player.odinId, p.shardId);
                }
            });
        }, 2000);


        return () => clearInterval(interval);
    }, [report?.players, getDotYouClient, statusByOdin]);

    const runVerificationOnce = async (odinId: string, shardId: string) => {
        const k = toKey(odinId);
        setStatusByOdin((prev) => ({ ...prev, [k]: "loading" }));
        const result = await verifyOnce(getDotYouClient(), { odinId, shardId });

        if (!unmountedRef.current) {
            if (result === "serverError") {
                // mark as no-retry and map to UI "error"
                noRetryRef.current[k] = true;
                setStatusByOdin((prev) => ({ ...prev, [k]: "error" }));
            } else {
                setStatusByOdin((prev) => ({ ...prev, [k]: result }));
            }
        }
    };


    return (
      <>
          <div className="mt-3 flex w-full flex-row gap-2">
              <Label>{t("Status")}:</Label>
              <DealerRecoveryRiskHeadline report={report} hidePrompt={true} />
          </div>

          <div className="mt-3 flex w-full flex-row gap-2">
              <Label>{t("Last Checked")}:</Label>
              <TimeAgoUtc value={report.healthLastChecked ?? 0} />
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
                            status = statusOverride; // already a valid Status value
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
                            onRetry={() => runVerificationOnce(p.player.odinId, p.shardId)}
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
