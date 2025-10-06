import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
  Label,
  SubtleMessage,
  t,
  useDotYouClient,
} from "@homebase-id/common-app";
import {
  ShardVerificationResult, verifyRemotePlayerShard,
  // ShardVerificationResult,
  // verifyRemotePlayerShard,
  VerifyRemotePlayerShardRequest,
} from "../../../provider/auth/ShamirProvider";
import {DotYouClient} from "@homebase-id/js-lib/core";
import {DealerRecoveryRiskReport} from "../../../provider/auth/SecurityHealthProvider";
import {TimeAgoUtc} from "../../../components/ui/Date/TimeAgoUtc";
import {PlayerListItem, Status} from "./PlayerListItem";
import {DealerRecoveryRiskHeadline} from "../DealerRecoveryRiskHeadline";

const toKey = (odinId: string) => odinId.toLowerCase();

/** single immediate verification (used by manual retry) */
async function verifyOnce(
  client: DotYouClient,
  req: VerifyRemotePlayerShardRequest
): Promise<"valid" | "invalid" | "error" | "serverError"> {
  try {
    const result: ShardVerificationResult | null = await verifyRemotePlayerShard(client, req);
    if (result?.remoteServerError) return "serverError";
    return result?.isValid ? "valid" : "invalid";
  } catch {
    return "error";
  }
}

export const PlayerStatusList = ({report}: { report: DealerRecoveryRiskReport }) => {
  if (!report) return null;

  const [statusByOdin, setStatusByOdin] = useState<Record<string, Status>>({});
  const {getDotYouClient} = useDotYouClient();

  // ── refs to manage lifecycle/guards ──────────────────────────────────────────
  const unmountedRef = useRef(false);
  const noRetryRef = useRef<Record<string, boolean>>({});
  const inFlightRef = useRef<Record<string, boolean>>({});

  // stabilize DotYouClient across renders (avoid effect loops due to changing fn identity)
  const clientRef = useRef<DotYouClient | null>(null);
  if (clientRef.current == null) {
    // call once; do NOT put this in an effect with getDotYouClient in deps
    clientRef.current = getDotYouClient();
  }

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  const runVerificationOnce = useCallback(async (odinId: string, shardId: string) => {
    const k = toKey(odinId);
    if (noRetryRef.current[k] || inFlightRef.current[k]) return;

    inFlightRef.current[k] = true;
    setStatusByOdin(prev => (prev[k] === "loading" ? prev : {...prev, [k]: "loading"}));

    const client = clientRef.current!;
    const result = await verifyOnce(client, {odinId, shardId});

    if (!unmountedRef.current) {
      if (result === "serverError") {
        noRetryRef.current[k] = true;
        setStatusByOdin(prev => ({...prev, [k]: "error"}));
      } else {
        setStatusByOdin(prev => ({...prev, [k]: result}));
      }
    }

    inFlightRef.current[k] = false;
  }, []);

  // Build a stable dependency “key” from players so the effect doesn’t thrash
  const playersDepKey = useMemo(() => {
    // include fields that affect whether we should verify
    return report.players
      .map(p => `${toKey(p.player.odinId)}|${p.shardId}|${p.isMissing}|${p.isValid}`)
      .sort()
      .join(",");
  }, [report.players]);

  useEffect(() => {
    if (!report.players.length) return;

    // initial pass
    for (const p of report.players) {
      const k = toKey(p.player.odinId);
      if (!p.isMissing && !p.isValid && !noRetryRef.current[k]) {
        runVerificationOnce(p.player.odinId, p.shardId);
      }
    }

    // interval retries
    const interval = setInterval(() => {
      for (const p of report.players) {
        const k = toKey(p.player.odinId);
        if (!p.isMissing && !p.isValid && !noRetryRef.current[k]) {
          runVerificationOnce(p.player.odinId, p.shardId);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
    // deps: only the stable key + the stable callback
  }, [playersDepKey, runVerificationOnce]);

  return (
    <>
      <div className="mt-3 flex w-full flex-row gap-2">
        <Label>{t("Status")}:</Label>
        <DealerRecoveryRiskHeadline report={report} hidePrompt/>
      </div>

      <div className="mt-3 flex w-full flex-row gap-2">
        <Label>{t("Last Checked")}:</Label>
        <TimeAgoUtc value={report.healthLastChecked ?? 0}/>
      </div>

      <div className="mt-3">
        <Label>{t("Trusted connections")}</Label>
        <SubtleMessage>
          {t(
            `The connections below each hold a piece of the data needed to recover your 
              account. To regain access, at least ${report.minRequired} trusted 
              connections must respond to your request.`
          )}
        </SubtleMessage>
      </div>

      <div className="flex w-full flex-col">
        {report.players.length ? (
          <div className="flex-grow overflow-auto">
            {report.players.map((p, index) => {
              const key = toKey(p.player.odinId);
              const statusOverride = statusByOdin[key];

              let status: Status;
              if (p.isMissing) status = "error";
              else if (statusOverride) status = statusOverride;
              else status = p.isValid ? "valid" : "invalid";

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
