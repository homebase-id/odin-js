import {ReactNode, useEffect, useRef, useState} from 'react';
import {
  ConnectionImage,
  ConnectionName,
  formatDateExludingYearIfCurrent,
  Label,
  SubtleMessage,
  t,
  useDotYouClient
} from '@homebase-id/common-app';
import {
  ShamiraPlayer,
  verifyRemotePlayerShard
} from '../../../provider/auth/ShamirProvider';
import {DotYouClient} from "@homebase-id/js-lib/core";
import {DealerRecoveryRiskReport, ShardTrustLevel} from "../../../provider/auth/SecurityHealthProvider";

export interface ShardVerificationResult {
  isValid: boolean;
}

export interface VerifyRemotePlayerShardRequest {
  odinId: string;
  shardId: string;
}

type Status = 'loading' | 'valid' | 'invalid' | 'error';

const toKey = (odinId: string) => odinId.toLowerCase();
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** initial backoff to avoid reporting red too early */
async function verifyWithRetry(
  client: DotYouClient,
  req: VerifyRemotePlayerShardRequest,
  {maxAttempts = 3, baseDelayMs = 1200, jitterMs = 200} = {},
): Promise<'valid' | 'invalid' | 'error'> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result: ShardVerificationResult | null =
        await verifyRemotePlayerShard(client, req);
      if (result?.isValid) return 'valid';
      if (attempt === maxAttempts) return 'invalid';
    } catch {
      if (attempt === maxAttempts) return 'error';
    }
    const wait = baseDelayMs * attempt + Math.floor((Math.random() - 0.5) * 2 * jitterMs);
    await delay(Math.max(300, wait));
  }
  return 'error';
}

/** single immediate verification (used by manual retry) */
async function verifyOnce(
  client: DotYouClient,
  req: VerifyRemotePlayerShardRequest,
): Promise<'valid' | 'invalid' | 'error'> {
  try {
    const result: ShardVerificationResult | null =
      await verifyRemotePlayerShard(client, req);
    return result?.isValid ? 'valid' : 'invalid';
  } catch {
    return 'error';
  }
}

export const PlayerStatusList = ({report}: { report: DealerRecoveryRiskReport }) => {
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
    report.players.forEach(p => {
      if (!p.isMissing && !p.isValid) {
        runVerificationOnce(p.player.odinId, p.shardId);
      }
    });

    // set up interval
    const interval = setInterval(() => {
      report.players.forEach(p => {
        if (!p.isMissing && !p.isValid) {
          runVerificationOnce(p.player.odinId, p.shardId);
        }
      });
    }, 2_000);

    return () => clearInterval(interval);
  }, [report.players, getDotYouClient]);
  
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
      <div>
        <Label>{t("Last Checked")}</Label>
        {report.healthLastChecked
          ? formatDateExludingYearIfCurrent(new Date(report.healthLastChecked))
          : t("Never")}
      </div>

      <br/>
      <Label>{t("Trusted connections")}</Label>
      <SubtleMessage>
        <p>
          {t(
            `The connections below each hold a piece of the data needed to recover your account. To regain access, at least ${report.minRequired} trusted connections must respond to your request.`
          )}
        </p>
      </SubtleMessage>
      <br/>

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
                onRetry={() => runVerificationOnce(p.player.odinId, p.shardId)}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-grow items-center justify-center p-5">
          <p className="text-slate-400">{t("No players selected")}</p>
        </div>
      )}
    </>
  );
};


export const PlayerListItem = ({
                                 player,
                                 status,
                                 trustLevel,
                                 isMissing,
                                 onRetry,
                                 ...props
                               }: {
  onClick?: () => void;
  player: ShamiraPlayer;
  isActive: boolean;
  status: Status;
  trustLevel: ShardTrustLevel;
  isMissing: boolean;
  onRetry: () => void;
}) => {
  return (
    <ListItemWrapper {...props}>
      <ConnectionImage
        odinId={player.odinId as string}
        className="border border-neutral-200 dark:border-neutral-800"
        size="sm"
      />

      <div className="flex w-full items-center justify-between">
        {/* Left: Player name */}
        <ConnectionName odinId={player.odinId as string}/>

        {/* Right: Verification + Trust + Retry */}
        <div className="flex flex-col md:flex-row md:items-center md:gap-6 gap-2 text-right">
          {/* Verification status */}
          <div className="flex items-center gap-2 justify-end">
            <StatusIcon status={status}/>
            <span className="text-sm text-slate-700 dark:text-slate-300">
          {status === "valid" && t("Shard verified")}
              {status === "invalid" && t("Shard invalid")}
              {status === "error" && t("Error verifying")}
              {status === "loading" && t("Verifying…")}
        </span>
          </div>

          {/* Trust / last seen */}
          <div
            className={`flex items-center gap-2 justify-end text-sm ${
              trustLevel === ShardTrustLevel.RedAlert || isMissing
                ? "text-red-600"
                : trustLevel === ShardTrustLevel.Warning
                  ? "text-orange-600"
                  : trustLevel === ShardTrustLevel.TheSideEye
                    ? "text-yellow-600"
                    : "text-green-600"
            }`}
          >
            {trustEmoji(trustLevel)} {trustLabel(trustLevel)}
            {isMissing && " (missing)"}
          </div>

          {/* Retry button */}
          {(status === "invalid" || status === "error") && (
            <div className="mt-1 md:mt-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry();
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                {t("Retry Verification")}
              </button>
            </div>
          )}
        </div>
      </div>
    </ListItemWrapper>

  );
};

const ListItemWrapper = ({
                           onClick,
                           isActive,
                           children,
                         }: {
  onClick?: () => void;
  isActive: boolean;
  children: ReactNode;
}) => (
  <div className="group px-2">
    <div
      onClick={onClick}
      className={`flex w-full cursor-pointer flex-row items-center gap-3 rounded-lg px-3 py-4 transition-colors hover:bg-primary/20 ${
        isActive ? 'bg-slate-200 dark:bg-slate-800' : 'bg-transparent'
      }`}
    >
      {children}
    </div>
  </div>
);

const StatusIcon = ({status}: { status: Status }) => {
  if (status === 'loading') {
    return (
      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-label="Verifying…">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.25"/>
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  }
  if (status === 'valid') {
    return (
      <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="none" aria-label="Valid">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <path d="M8 12l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="none" aria-label="Invalid">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
};

function trustEmoji(level: ShardTrustLevel): string {
  switch (level) {
    case ShardTrustLevel.Thumbsup:
      return "👍";
    case ShardTrustLevel.TheSideEye:
      return "👀";
    case ShardTrustLevel.Warning:
      return "⚠️";
    case ShardTrustLevel.RedAlert:
      return "🚨";
    default:
      return "";
  }
}

function trustLabel(level: ShardTrustLevel): string {
  switch (level) {
    case ShardTrustLevel.Thumbsup:
      return "Active recently";        // < 2 weeks
    case ShardTrustLevel.TheSideEye:
      return "Inactive ~2–4 weeks";    // 2–4 weeks
    case ShardTrustLevel.Warning:
      return "Inactive ~1–3 months";   // 1–3 months
    case ShardTrustLevel.RedAlert:
      return "Inactive >3 months"; // > 3 months
    default:
      return "Unknown";
  }
}

